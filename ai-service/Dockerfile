FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    MODEL_DIR=/app/models \
    DATA_DIR=/app/data \
    REPORTS_DIR=/app/reports

# libgomp1 is required by PyTorch on slim images.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libgomp1 curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# CPU-only torch wheels keep the image small (~1 GB instead of ~7 GB).
COPY requirements.txt .
RUN pip install --upgrade pip \
    && pip install torch==2.15.0 torchvision==0.29.2 --index-url https://download.pytorch.org/whl/cpu \
    && pip install -r requirements.txt

COPY app ./app
COPY train.py evaluate.py ./
COPY scripts ./scripts

# Bake the pretrained backbone into the image so cold starts need no network.
RUN python scripts/prefetch_weights.py --backbone efficientnet_b0

RUN useradd --create-home --uid 10001 rentsaathi \
    && mkdir -p /app/models /app/data /app/reports \
    && chown -R rentsaathi:rentsaathi /app
USER rentsaathi

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD curl -fsS http://localhost:${PORT:-8000}/health || exit 1

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
