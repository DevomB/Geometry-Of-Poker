# Geometry of Poker AWS Deployment

This folder contains optional container entrypoints for artifact generation. Vercel remains the non-negotiable app host; AWS should be limited to S3/CloudFront storage and occasional batch compute.

## Budget Posture

- Target: stay under roughly $15/month.
- Default: generate production artifacts on short-lived AWS Batch, upload versioned artifacts to S3, serve through CloudFront.
- Avoid always-on compute, databases, NAT gateways, or long-lived ECS services.
- Laptop compute is limited to development, tests, builds, and tiny smoke runs. Do not run balanced-small or larger poker generation/embedding on the laptop unless explicitly approved.
- Use AWS Batch for balanced-small release generation and embedding.

## Images

- `api.Dockerfile` runs the Next.js app/API container. Set `GOP_ARTIFACT_BASE_URL` to the CloudFront artifact base.
- `generator.Dockerfile` runs the Node dataset generator. Override the command per street for parallel AWS Batch jobs.
- `embed.Dockerfile` runs the Python embedding pipeline. Override the command per street after the dataset exists.
- `release-worker.Dockerfile` is the preferred one-off AWS Batch image for balanced-small releases. It generates datasets, embeds all streets, validates release artifacts, and uploads immutable files to S3 in one job, avoiding EFS or intermediate S3 handoff.

## Artifact Layout

Publish this layout under the artifact bucket:

```text
releases/<release-id>/embeddings/<street>/
  viewer-manifest.json
  browser-points.bin
  browser-channels.bin
  browser-metadata.json
  retained-features.json
  projection-index.bin
```

Point the app/API at:

```text
GOP_ARTIFACT_BASE_URL=https://<artifact-cloudfront-domain>/releases/<release-id>
```

The app appends `/embeddings/<street>/...` internally.

## Recommended Batch Job

The repeatable path is `production-artifacts.yaml`. It creates:

- One private S3 bucket with public access blocked.
- One CloudFront distribution with Origin Access Control.
- One ECR repository for the release worker image.
- One private S3 build-source bucket and CodeBuild project for building the Docker image in AWS.
- One AWS Batch Fargate compute environment, queue, job definition, log group, and least-privilege job role.

Deploy the stack once:

```bash
pnpm aws:deploy-artifacts -- \
  --region us-east-1 \
  --account-id <account-id>
```

This validates the CloudFormation template before deployment and prints stack outputs. If `--vpc-id` and `--subnet-ids` are omitted, the script uses the account's default VPC and public default subnets. That is the recommended low-budget path because the Batch job receives a public IP and does not require a NAT gateway.

If the account has no default VPC, pass an existing VPC and at least two public subnet IDs:

```bash
pnpm aws:deploy-artifacts -- \
  --region us-east-1 \
  --account-id <account-id> \
  --vpc-id <vpc-id> \
  --subnet-ids <subnet-a>,<subnet-b>
```

Build and push `release-worker.Dockerfile` inside AWS CodeBuild. This is the preferred path when Docker is unavailable on the laptop:

```bash
pnpm aws:build-worker -- \
  --region us-east-1 \
  --account-id <account-id>
```

This packages the repo source, uploads it to the private build-source bucket, starts CodeBuild, and pushes the image to ECR. The laptop does not build poker artifacts and does not run Docker.

If Docker is available on another machine, the local Docker fallback is:

```bash
pnpm aws:push-worker -- \
  --region us-east-1 \
  --account-id <account-id>
```

Then run one AWS Batch job with:

```text
GOP_RELEASE_ID=<release-id>
GOP_ARTIFACT_BUCKET=<private-artifact-bucket>
GOP_S3_PREFIX=
GOP_SEED=42
GOP_FEATURE_MODE=compact
GOP_EXACT_FEATURE_BUDGET=production
GOP_PREFLOP_COUNT=1326
GOP_FLOP_COUNT=50000
GOP_TURN_COUNT=50000
GOP_RIVER_COUNT=50000
```

The job writes:

```text
s3://<bucket>/releases/<release-id>/embeddings/<street>/
```

IAM permissions for the Batch job role should be limited to `s3:PutObject`, `s3:AbortMultipartUpload`, and `s3:ListBucket` for that release prefix. Use CloudFront Origin Access Control for public reads; do not make the bucket public.

Submit the release job:

```bash
pnpm aws:submit-release -- \
  --region us-east-1 \
  --release-id <release-id> \
  --bucket <private-artifact-bucket> \
  --flop-count 50000 \
  --turn-count 50000 \
  --river-count 50000 \
  --vcpus 4 \
  --memory-mb 30720
```

Before running balanced-small, run a tiny no-upload canary and inspect logs:

```bash
pnpm aws:submit-release -- \
  --region us-east-1 \
  --release-id canary-$(date +%Y%m%d-%H%M%S) \
  --skip-upload \
  --preflop-count 10 \
  --flop-count 20 \
  --turn-count 20 \
  --river-count 20 \
  --exact-feature-budget production
```

Do not submit a balanced-small job with `GOP_EXACT_FEATURE_BUDGET=full` without an explicit cost/runtime review. Full exact equity, runout, card-removal, and transition features are intended for small research runs; production balanced-small uses bounded compact features. The release worker also passes `--skip-analysis` so production jobs do not rerun research-only UMAP feature-group and seed-stability experiments.

Read the CloudFormation outputs for:

- `ArtifactBucketName` -> `GOP_ARTIFACT_BUCKET`
- `CloudFrontDomainName` -> Vercel `GOP_ARTIFACT_BASE_URL=https://<domain>/releases/<release-id>`
- `EcrRepositoryUri` -> image build/push target
- `CodeBuildSourceBucketName` and `CodeBuildProjectName` -> remote image build target

## Manual Batch Commands

Generate one street:

```bash
pnpm generate -- --street flop --count 50000 --seed 42 --mode compact --artifacts /work/artifacts --resume
```

Embed one street:

```bash
python3 -m embed.run --street flop --input /work/artifacts/datasets/flop/records.parquet --output /work/artifacts/embeddings/flop --seed 42
```

After embedding all four streets, run:

```bash
pnpm release:artifacts -- --release-id <release-id>
pnpm validate:artifacts -- --release-id <release-id>
```

Upload `artifacts/releases/<release-id>/embeddings/<street>` to S3 and keep the files versioned by release id.

## Cache Policy

- Versioned artifact files: `Cache-Control: public,max-age=31536000,immutable`
- Release pointer files, if used: `Cache-Control: public,max-age=60`
- API routes: no CDN caching until projection behavior is stable.
