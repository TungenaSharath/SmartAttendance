# ── SmartAttendance Ultra-Low Memory Production Dockerfile ──────────────
FROM python:3.11-slim

WORKDIR /app

# Strict single-thread environment variables to prevent OpenMP memory spikes on 512MB RAM ceiling
ENV OMP_NUM_THREADS=1
ENV OPENBLAS_NUM_THREADS=1
ENV MKL_NUM_THREADS=1
ENV PYTHONUNBUFFERED=1

# Install build tools (g++, gcc) and runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    g++ \
    gcc \
    libgl1 \
    libglib2.0-0 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -U pip setuptools wheel
RUN pip install --no-cache-dir -r requirements.txt

# Remove heavy build tools after compilation to keep runtime RAM and disk lightweight
RUN apt-get purge -y --auto-remove build-essential g++ gcc && rm -rf /var/lib/apt/lists/*

# Copy application files
COPY *.py ./

# Create data & storage directories
RUN mkdir -p data uploads reports static templates

EXPOSE 8000 10000

# Production Command
CMD ["sh", "-c", "python -m uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1"]
