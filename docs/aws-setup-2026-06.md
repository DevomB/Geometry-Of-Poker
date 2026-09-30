# Geometry of Poker - Low-Cost Production Setup

> **Historical (June 2026).** This was the first production setup. It was replaced by the `geometry-of-poker-artifacts` CloudFormation stack (bucket `geometry-of-poker-artifacts-artifactbucket-cvx4jrn7qvrz`, CloudFront `d38kt2l1nex9vr.cloudfront.net`) and one-off AWS Batch release jobs; see [deploy/aws/README.md](../deploy/aws/README.md) and [aws-release-compute-runbook.md](aws-release-compute-runbook.md). The budget guardrails and validation checklist below still apply. Moved here from the parent workspace folder on 2026-09-30.

This is the current production target:

```text
Vercel
  Next.js app + API routes

AWS S3 + CloudFront
  versioned browser artifacts

AWS compute (optional one-off only)
  GitHub Actions or temporary Linux VM for generation — no always-on fleet
```

Budget target: keep AWS under **$10/month**, with an emergency ceiling of **$15/month**.

## Current Required AWS Resources

Use only these for the Vercel deployment:

| Resource | Purpose |
| --- | --- |
| S3 bucket `gop-artifacts-prod` | Stores versioned embedding artifacts |
| CloudFront `dbzx7zz40gkx3.cloudfront.net` | Serves artifacts to the browser with CORS |

Do **not** deploy App Runner, ECS, Batch, or always-on EC2 for the normal public site. Those can exceed the budget quickly.

## Required Cost Guardrails

Create AWS Budgets before doing more work:

1. AWS Console -> **Billing and Cost Management** -> **Budgets**
2. Create a monthly cost budget:
   ```text
   Name: geometry-of-poker-monthly
   Amount: 10 USD
   Alerts: 50%, 80%, 100%
   ```
3. Optional second action-enabled budget:
   ```text
   Name: geometry-of-poker-hard-warning
   Amount: 15 USD
   Alerts: 80%, 100%
   ```

AWS currently provides the first two action-enabled budgets free per month, according to AWS Budgets pricing.

Also add tags to the S3 bucket, CloudFront distribution, and any future ECR/Batch resources:

```text
Application=geometry-of-poker
Environment=prod
Release=real-1
Owner=devomb
```

## Artifact Layout

Artifacts must be uploaded like this:

```text
s3://gop-artifacts-prod/releases/<release-id>/embeddings/<street>/
  viewer-manifest.json
  browser-points.bin
  browser-channels.bin
  browser-metadata.json
  retained-features.json
```

The Vercel environment variable must point at the release root:

```text
GOP_ARTIFACT_BASE_URL=https://dbzx7zz40gkx3.cloudfront.net/releases/<release-id>
```

Do **not** include `/embeddings` in the env var.

## Real Data Rule

The embedding pipeline now requires real generated parquet by default.

This will fail if the real dataset is missing:

```bash
python -m embed.run --street flop --seed 42
```

Synthetic data is only allowed when explicitly requested:

```bash
python -m embed.run --street flop --demo --seed 42
```

Do not publish `--demo` artifacts to production.

## Fast Real Release

Use this when you need a presentation-grade release quickly.

Requirements:

- Linux environment
- Node.js 22
- pnpm
- Python 3.11+
- working `poker-calculations` native binding
- AWS CLI configured

From the repository root:

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm generate:present
```

Then embed:

```bash
cd pipeline
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m embed.run --all --seed 42
cd ..
```

Sync browser artifacts:

```bash
pnpm --filter @geometry-of-poker/web sync-artifacts
```

Upload as a new release:

```bash
aws s3 sync apps/web/public/artifacts/embeddings \
  s3://gop-artifacts-prod/releases/real-1/embeddings \
  --cache-control "public,max-age=31536000,immutable"
```

Invalidate CloudFront:

```bash
aws cloudfront create-invalidation \
  --distribution-id <distribution-id> \
  --paths "/releases/real-1/*"
```

Update Vercel:

```text
GOP_ARTIFACT_BASE_URL=https://dbzx7zz40gkx3.cloudfront.net/releases/real-1
```

Redeploy Vercel.

## Validation

Check:

```text
https://geometry-of-poker.devomb.com/api/manifests
```

Confirm:

- `artifactMode` is `blob`
- artifact URLs use `dbzx7zz40gkx3.cloudfront.net`
- `categories` is not only `["highCard"]` for postflop real data

Then check in DevTools -> Network:

```text
/api/manifests                  200
browser-points.bin              200
browser-channels.bin            200
browser-metadata.json           200
```

`browser-points.bin` and `browser-channels.bin` must include:

```text
access-control-allow-origin
```

## Optional Later: AWS Compute

Only use these if you outgrow local/Linux one-shot generation:

| Resource | Use |
| --- | --- |
| ECR `gop-generator` | Container image for dataset generation |
| ECR `gop-embed` | Container image for Python embedding |
| AWS Batch | Run larger one-off generation/embedding jobs |
| ECR `gop-api` / App Runner | Only if Vercel API is too slow or native projection is required |

Do not leave EC2 instances or Batch compute running. For the $10/month target, generate artifacts as one-off jobs, upload to S3, then shut compute down.

## Related Docs

- [deploy/aws/README.md](../deploy/aws/README.md) - container image details
- [aws-release-compute-runbook.md](aws-release-compute-runbook.md) - Batch release jobs and `GOP_ARTIFACT_BASE_URL`
