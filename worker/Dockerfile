# Build context must be the repo root (see docker-compose.yml: worker's
# `context: .`), not worker/ itself - this needs to reach the sibling
# backend/app directory.
FROM python:3.12-slim

WORKDIR /worker

COPY worker/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Reuses the backend's app package (models, schemas, services, config, db
# session) directly rather than duplicating it - see worker/README.md.
COPY backend/app ./app
COPY worker/main.py .

CMD ["python", "main.py"]
