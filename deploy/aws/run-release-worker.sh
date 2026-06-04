#!/usr/bin/env bash
set -euo pipefail

ARTIFACTS_ROOT="${GOP_ARTIFACTS_ROOT:-/work/artifacts}"
RELEASE_ID="${GOP_RELEASE_ID:-}"
SEED="${GOP_SEED:-42}"
MODE="${GOP_FEATURE_MODE:-compact}"
BATCH_SIZE="${GOP_BATCH_SIZE:-1000}"
PREFLOP_COUNT="${GOP_PREFLOP_COUNT:-1326}"
FLOP_COUNT="${GOP_FLOP_COUNT:-25000}"
TURN_COUNT="${GOP_TURN_COUNT:-25000}"
RIVER_COUNT="${GOP_RIVER_COUNT:-25000}"
SKIP_UPLOAD="${GOP_SKIP_UPLOAD:-0}"
S3_BUCKET="${GOP_ARTIFACT_BUCKET:-}"
S3_PREFIX="${GOP_S3_PREFIX:-}"

if [[ -z "$RELEASE_ID" ]]; then
  echo "GOP_RELEASE_ID is required, for example 2026-06-balanced-small-1." >&2
  exit 2
fi

if [[ "$SKIP_UPLOAD" != "1" && -z "$S3_BUCKET" ]]; then
  echo "GOP_ARTIFACT_BUCKET is required unless GOP_SKIP_UPLOAD=1." >&2
  exit 2
fi

street_count() {
  case "$1" in
    preflop) echo "$PREFLOP_COUNT" ;;
    flop) echo "$FLOP_COUNT" ;;
    turn) echo "$TURN_COUNT" ;;
    river) echo "$RIVER_COUNT" ;;
    *) echo "Unknown street: $1" >&2; exit 2 ;;
  esac
}

generate_street() {
  local street="$1"
  local count
  count="$(street_count "$street")"
  echo "[release-worker] generate $street count=$count seed=$SEED mode=$MODE"
  pnpm generate -- \
    --street "$street" \
    --count "$count" \
    --seed "$SEED" \
    --mode "$MODE" \
    --batch-size "$BATCH_SIZE" \
    --artifacts "$ARTIFACTS_ROOT" \
    --resume
}

embed_street() {
  local street="$1"
  echo "[release-worker] embed $street"
  python3 -m embed.run \
    --street "$street" \
    --input "$ARTIFACTS_ROOT/datasets/$street/records.parquet" \
    --output "$ARTIFACTS_ROOT/embeddings/$street" \
    --seed "$SEED"
}

for street in preflop flop turn river; do
  generate_street "$street"
  embed_street "$street"
done

echo "[release-worker] build release artifacts $RELEASE_ID"
pnpm --filter @geometry-of-poker/web sync-artifacts -- --release-id "$RELEASE_ID"
node scripts/validate-release-artifacts.mjs --release-id "$RELEASE_ID"

if [[ "$SKIP_UPLOAD" == "1" ]]; then
  echo "[release-worker] GOP_SKIP_UPLOAD=1; artifacts remain at artifacts/releases/$RELEASE_ID"
  exit 0
fi

DEST_PREFIX="${S3_PREFIX%/}"
if [[ -n "$DEST_PREFIX" ]]; then
  DEST="s3://$S3_BUCKET/$DEST_PREFIX/releases/$RELEASE_ID/embeddings/"
else
  DEST="s3://$S3_BUCKET/releases/$RELEASE_ID/embeddings/"
fi

echo "[release-worker] upload release artifacts to $DEST"
aws s3 cp "artifacts/releases/$RELEASE_ID/embeddings/" "$DEST" \
  --recursive \
  --only-show-errors \
  --cache-control "public,max-age=31536000,immutable"

echo "[release-worker] complete: $RELEASE_ID"
