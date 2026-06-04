FROM public.ecr.aws/docker/library/node:22-bookworm-slim

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /work

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY packages/shared/package.json packages/shared/package.json
COPY packages/feature-engine/package.json packages/feature-engine/package.json
COPY packages/dataset-generator/package.json packages/dataset-generator/package.json
COPY apps/web/package.json apps/web/package.json

RUN pnpm install --frozen-lockfile

COPY packages packages

RUN pnpm --filter @geometry-of-poker/shared build \
  && pnpm --filter @geometry-of-poker/feature-engine build \
  && pnpm --filter @geometry-of-poker/dataset-generator build

ENV GOP_ARTIFACTS_ROOT=/work/artifacts

CMD ["pnpm", "generate", "--", "--all", "--seed", "42", "--mode", "compact", "--artifacts", "/work/artifacts", "--resume"]
