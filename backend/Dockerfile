FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# postgresql-client provides pg_dump for the nightly backup task.
RUN apt-get update \
    && apt-get install -y --no-install-recommends postgresql-client libpq5 curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN useradd --create-home clerkos \
    && mkdir -p /data/documents /backups /app/staticfiles \
    && chown -R clerkos:clerkos /app /data /backups
USER clerkos

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --retries=5 \
  CMD curl -fs http://localhost:8000/api/v1/system/health/ || exit 1

CMD ["gunicorn", "clerkos.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "4"]
