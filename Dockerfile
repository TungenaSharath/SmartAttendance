# ── SmartAttendance Ultra-Low Memory Production Dockerfile ──────────────
FROM python:3.11-slim

WORKDIR /app

# Strict single-thread environment variables to prevent OpenMP memory spikes on 512MB RAM ceiling
ENV OMP_NUM_THREADS=1
ENV OPENBLAS_NUM_THREADS=1
ENV MKL_NUM_THREADS=1
ENV PYTHONUNBUFFERED=1

# Install minimal runtime dependencies & curl
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY *.py ./

# Create data & storage directories
RUN mkdir -p data uploads reports static templates

EXPOSE 10000 8000

# Container Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:${PORT:-10000}/api/health || exit 1

# Production Command
CMD ["sh", "-c", "python -m uvicorn main:app --host 0.0.0.0 --port ${PORT:-10000} --workers 1"]
