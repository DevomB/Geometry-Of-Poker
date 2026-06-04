FROM public.ecr.aws/docker/library/python:3.12-bookworm

RUN apt-get update \
  && apt-get install -y --no-install-recommends build-essential \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /work

COPY pipeline/requirements.txt pipeline/requirements.txt
RUN pip install --no-cache-dir -r pipeline/requirements.txt

COPY pipeline pipeline

ENV PYTHONPATH=/work/pipeline

CMD ["python", "-m", "embed.run", "--all", "--seed", "42"]
