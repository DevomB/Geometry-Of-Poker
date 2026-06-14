# AWS Release Compute Runbook

This note records what happened during the first 50k release attempt and the safer process for future artifact compute.

## What Went Wrong

The release `2026-06-balanced-50k-1` failed in AWS Batch with exit code `139`.

That code means the container process segfaulted. The CloudWatch logs showed:

- preflop generation completed
- preflop embedding completed
- flop generation completed all `50,000` rows
- flop dataset validation passed
- the crash happened during `embed flop`
- the failing phase was `StandardScaler -> PCA -> UMAP -> HDBSCAN`

The important detail is that dataset generation was not the failing part. The Python native stack used by UMAP/HDBSCAN crashed while fitting the 50k flop embedding.

Because the release worker uses Fargate ephemeral storage and uploads only after the full release validates, completed intermediate files from the failed attempt were lost when the container exited.

## Immediate Fix

The submit helper now supports per-job Batch resource overrides:

```powershell
pnpm aws:submit-release -- `
  --region us-east-1 `
  --release-id 2026-06-balanced-50k-2 `
  --bucket geometry-of-poker-artifacts-artifactbucket-cvx4jrn7qvrz `
  --flop-count 50000 `
  --turn-count 50000 `
  --river-count 50000 `
  --vcpus 4 `
  --memory-mb 30720
```

For the current 4-vCPU Fargate job shape, `30720` MiB is the practical max memory setting. Use this for 50k postflop runs unless the stack is redeployed with a larger job shape.

## Monitoring A Run

Get the current job state:

```powershell
aws batch describe-jobs --region us-east-1 --jobs <job-id> --query "jobs[0].{status:status,statusReason:statusReason,startedAt:startedAt,stoppedAt:stoppedAt,exitCode:container.exitCode,reason:container.reason,logStreamName:container.logStreamName}"
```

Follow worker logs:

```powershell
aws logs tail /aws/batch/geometry-of-poker/release-worker --region us-east-1 --follow
```

Expected milestones:

```text
[release-worker] generate preflop
[release-worker] embed preflop
[release-worker] generate flop count=50000
[release-worker] embed flop
[release-worker] generate turn count=50000
[release-worker] embed turn
[release-worker] generate river count=50000
[release-worker] embed river
[release-worker] build release artifacts <release-id>
[release-worker] upload release artifacts to s3://...
```

Do not update Vercel during generation. Only switch `GOP_ARTIFACT_BASE_URL` after the new release validates and CloudFront returns the expected manifests.

## Validate The Uploaded Release

After upload, check the manifests through CloudFront:

```powershell
$base = "https://d38kt2l1nex9vr.cloudfront.net/releases/<release-id>/embeddings"
foreach ($street in "preflop","flop","turn","river") {
  $m = Invoke-RestMethod -Uri "$base/$street/viewer-manifest.json"
  "$street pointCount=$($m.pointCount) projection=$([bool]$m.artifacts.projectionIndexBin)"
}
```

Expected for a 50k postflop release:

```text
preflop pointCount=1326 projection=True
flop pointCount=50000 projection=True
turn pointCount=50000 projection=True
river pointCount=50000 projection=True
```

Then set Vercel:

```text
GOP_ARTIFACT_BASE_URL=https://d38kt2l1nex9vr.cloudfront.net/releases/<release-id>
```

The app appends `/embeddings/<street>/...` internally. Do not hardcode release ids inside application code.

## Rules For More Compute Later

Use AWS Batch for balanced or larger release artifacts. Keep laptop work limited to development, tests, builds, tiny smoke datasets, and CloudFront validation.

Create a new immutable release id for every production artifact run. Do not overwrite an existing release prefix unless the old prefix is known bad and not referenced by Vercel.

Always pass counts explicitly for larger releases:

```powershell
pnpm aws:submit-release -- `
  --region us-east-1 `
  --release-id <release-id> `
  --bucket geometry-of-poker-artifacts-artifactbucket-cvx4jrn7qvrz `
  --flop-count <count> `
  --turn-count <count> `
  --river-count <count> `
  --vcpus 4 `
  --memory-mb 30720
```

Keep `GOP_EXACT_FEATURE_BUDGET=production` for balanced or larger runs. The `full` budget is for small research jobs only.

If another run segfaults during UMAP/HDBSCAN even with max memory, stop rerunning the same job. The next engineering fix should be one of:

- split the release worker into per-street jobs so one failed embedding does not discard other completed streets
- upload generated datasets as private intermediate checkpoints before embedding
- make the embedding stage less memory-sensitive, for example by using a subsample fit plus full transform where the research claim remains defensible
- move beyond the current 4-vCPU Fargate shape by redeploying the stack with a larger supported compute target

## Do Not Hardcode Release Stages

The correct runtime contract is:

- AWS Batch creates immutable release artifacts
- S3 stores them under `releases/<release-id>/embeddings/<street>/`
- CloudFront serves those files
- Vercel receives only `GOP_ARTIFACT_BASE_URL`
- the app reads `viewer-manifest.json` and artifact URLs from that base

Presentation pages and dashboards should read manifest counts instead of embedding release sizes in source code.
