# Backend Cloud Run Deployment

This backend is ready to deploy to Google Cloud Run as a single Flask API service.

## What this setup expects

- MongoDB is reachable from the public internet, such as MongoDB Atlas.
- Firebase Admin credentials are provided through `FIREBASE_SERVICE_ACCOUNT_JSON`.
- Cloud Run runs the API with Gunicorn, not `python app.py`.

## Required Google Cloud services

- Cloud Run API
- Cloud Build API
- Artifact Registry API
- Secret Manager API

## Required secrets

Create these secrets in Secret Manager and grant your Cloud Run service account access to them:

- `SECRET_KEY`
- `MONGO_URI`
- `FIREBASE_SERVICE_ACCOUNT_JSON`

Create these too if you use the related features:

- `AZURE_SPEECH_KEY`
- `AZURE_SPEECH_REGION`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `WEARABLE_INGEST_TOKEN`

## Recommended Cloud Run settings

- CPU: `1`
- Memory: `2Gi`
- Concurrency: `5`
- Timeout: `300`
- Min instances: `0`
- Max instances: set based on budget and traffic, for example `10`

## Deploy

Run this from the `backend/` directory:

### PowerShell deploy script

This repo includes `backend/deploy-cloud-run.ps1`, which reads the real values from `backend/.env`, uploads them to Secret Manager, grants the runtime service account access, and deploys the Cloud Run service.

Example:

```powershell
powershell -ExecutionPolicy Bypass -File .\deploy-cloud-run.ps1 -ProjectId "your-gcp-project-id" -Region "us-central1" -ServiceName "cvaped-backend"
```

```bash
gcloud run deploy cvaped-backend \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --cpu 1 \
  --memory 2Gi \
  --concurrency 5 \
  --timeout 300 \
  --max-instances 10 \
  --set-env-vars "ENABLE_MDNS=false,CORS_ORIGINS=https://your-frontend.example,FRONTEND_URL=https://your-frontend.example" \
  --update-secrets "SECRET_KEY=SECRET_KEY:latest,MONGO_URI=MONGO_URI:latest,FIREBASE_SERVICE_ACCOUNT_JSON=FIREBASE_SERVICE_ACCOUNT_JSON:latest,WEARABLE_INGEST_TOKEN=WEARABLE_INGEST_TOKEN:latest"
```

If you use Azure Speech or Cloudinary, add them to the same `--update-secrets` flag:

```bash
AZURE_SPEECH_KEY=AZURE_SPEECH_KEY:latest,
AZURE_SPEECH_REGION=AZURE_SPEECH_REGION:latest,
CLOUDINARY_CLOUD_NAME=CLOUDINARY_CLOUD_NAME:latest,
CLOUDINARY_API_KEY=CLOUDINARY_API_KEY:latest,
CLOUDINARY_API_SECRET=CLOUDINARY_API_SECRET:latest
```

## Health checks

- Liveness: `/api/health`
- Readiness: `/api/health/ready`

## Wearable and mDNS

- Cloud Run cannot participate in local-network mDNS discovery. `cvacare.local` is only for local or on-prem runs.
- For production hardware, use one of these patterns:
  - Direct HTTPS: configure the ESP32 master device to `POST` to your Cloud Run URL at `/api/wearable/data` with `X-Wearable-Token: <WEARABLE_INGEST_TOKEN>`.
  - Local gateway: keep a small local bridge on the facility network that uses mDNS or ESP-NOW locally, then forwards the payload to Cloud Run over HTTPS.
- Latest wearable payloads are now stored in MongoDB in `wearable_latest`, so live polling works across multiple Cloud Run instances.
- The backend now keeps both the latest live snapshot for `GET /api/wearable/data` and the latest batched analysis payload for `POST /api/hardware/gait/analyze-latest`.
- The authenticated app can analyze the most recent stored payload through `POST /api/hardware/gait/analyze-latest`.

## Notes

- `ENABLE_MDNS` should stay `false` on Cloud Run.
- `GET /api/wearable/data` still works for live polling and now reads from MongoDB instead of instance memory.
- Rate limiting currently uses in-memory storage, so limits are per instance.
