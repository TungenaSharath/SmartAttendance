# ── SmartAttendance Production Dockerfile ──────────────────────────────
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for OpenCV and curl for healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1-mesa-glx \
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

EXPOSE 8000

# Container Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:8000/api/health || exit 1

# Production Command
CMD ["sh", "-c", "python -m uvicorn main:app --host ${HOST:-0.0.0.0} --port ${PORT:-8000} --workers ${WORKERS:-2}"]
