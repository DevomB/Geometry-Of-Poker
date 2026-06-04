FROM public.ecr.aws/docker/library/node:20-bookworm

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV PYTHONPATH="/work/pipeline"
ENV PYTHONUNBUFFERED="1"
ENV PIP_NO_CACHE_DIR="1"
ENV GOP_LOG_NATIVE_CHECK="1"

RUN corepack enable \
  && apt-get update \
  && apt-get install -y --no-install-recommends \
    awscli \
    build-essential \
    ca-certificates \
    cmake \
    python3 \
    python3-pip \
    python3-venv \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /work

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY packages/shared/package.json packages/shared/package.json
COPY packages/feature-engine/package.json packages/feature-engine/package.json
COPY packages/dataset-generator/package.json packages/dataset-generator/package.json
COPY apps/web/package.json apps/web/package.json
COPY vendor/poker-calculations /tmp/poker-calculations

RUN pnpm install --frozen-lockfile

RUN cd /tmp/poker-calculations \
  && npm ci \
  && npm run build:native \
  && node scripts/stage-prebuild.js linux-x64 \
  && cp prebuilds/linux-x64/node.napi.node /work/node_modules/poker-calculations/prebuilds/linux-x64/node.napi.node \
  && node -e "const pc = require('/work/node_modules/poker-calculations'); console.log('poker-calculations native ok', pc.evaluateHandStrengthFast(['As','Kd'], ['2c','7d','9h','Ts','Jc']));"

COPY packages packages
COPY apps/web apps/web
COPY pipeline pipeline
COPY scripts scripts
COPY deploy/aws/run-release-worker.sh /usr/local/bin/gop-release-worker

RUN python3 -m pip install --break-system-packages -r pipeline/requirements.txt \
  && pnpm --filter @geometry-of-poker/shared build \
  && pnpm --filter @geometry-of-poker/feature-engine build \
  && pnpm --filter @geometry-of-poker/dataset-generator build \
  && chmod +x /usr/local/bin/gop-release-worker

ENV GOP_ARTIFACTS_ROOT="/work/artifacts"

CMD ["gop-release-worker"]
