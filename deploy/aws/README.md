# Geometry of Poker AWS Deployment

This folder contains container entrypoints for the AWS version of the visualizer.

## Images

- `api.Dockerfile` runs the Next.js app/API container. Set `GOP_ARTIFACT_BASE_URL` to the CloudFront artifact base.
- `generator.Dockerfile` runs the Node dataset generator. Override the command per street for parallel AWS Batch jobs.
- `embed.Dockerfile` runs the Python embedding pipeline. Override the command per street after the dataset exists.

## Artifact Layout

Publish this layout under the artifact bucket:

```text
releases/<release-id>/embeddings/<street>/
  viewer-manifest.json
  browser-points.bin
  browser-channels.bin
  browser-metadata.json
  retained-features.json
```

Point the app/API at:

```text
GOP_ARTIFACT_BASE_URL=https://<artifact-cloudfront-domain>/releases/<release-id>
```

The app appends `/embeddings/<street>/...` internally.

## Batch Commands

Generate one street:

```bash
pnpm generate -- --street flop --count 25000 --seed 42 --mode compact --artifacts /work/artifacts --resume
```

Embed one street:

```bash
python -m embed.run --street flop --input /work/artifacts/datasets/flop/records.parquet --output /work/artifacts/embeddings/flop --seed 42
```

After embedding, upload `artifacts/embeddings/<street>` to S3 and keep the files versioned by release id.

## Cache Policy

- Versioned artifact files: `Cache-Control: public,max-age=31536000,immutable`
- Release pointer files, if used: `Cache-Control: public,max-age=60`
- API routes: no CDN caching until projection behavior is stable.
