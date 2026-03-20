# Backend CI/CD with GitHub Actions

This repo now includes automatic backend deployment to Google Cloud Run through GitHub Actions.

For this repo and project, the Google Cloud side has already been provisioned for:

- project: `project-897ce48e-6275-4757-ab9`
- region: `us-central1`
- Cloud Run service: `cvaped-backend`
- Artifact Registry repo: `cvaped-backend`
- deploy service account: `github-actions-cloud-run@project-897ce48e-6275-4757-ab9.iam.gserviceaccount.com`
- Workload Identity Provider: `projects/592360297121/locations/global/workloadIdentityPools/github-actions/providers/github-provider`

Workflow file:

- `.github/workflows/backend-cloud-run.yml`

## What it does

- Triggers on pushes to `main` and `gwyn` when `backend/**` changes
- Supports manual runs through `workflow_dispatch`
- Validates backend Python files
- Builds the backend Docker image from `backend/Dockerfile`
- Pushes the image to Artifact Registry
- Deploys the new image to the existing Cloud Run service

## Authentication

The workflow uses Workload Identity Federation instead of a long-lived JSON key.

## One-time Google Cloud setup

The commands below document what has already been set up for this project. You should not need to run them again unless you want to recreate the CI/CD infrastructure from scratch.

### 1. Create an Artifact Registry Docker repository

```bash
gcloud artifacts repositories create cvaped-backend \
  --project "project-897ce48e-6275-4757-ab9" \
  --location "us-central1" \
  --repository-format docker \
  --description "CVAPed backend images"
```

### 2. Create a dedicated deploy service account

```bash
gcloud iam service-accounts create github-actions-cloud-run \
  --project "project-897ce48e-6275-4757-ab9" \
  --display-name "GitHub Actions Cloud Run Deployer"
```

The service account email will be:

```text
github-actions-cloud-run@project-897ce48e-6275-4757-ab9.iam.gserviceaccount.com
```

### 3. Grant the deploy roles

```bash
gcloud projects add-iam-policy-binding "project-897ce48e-6275-4757-ab9" \
  --member "serviceAccount:github-actions-cloud-run@project-897ce48e-6275-4757-ab9.iam.gserviceaccount.com" \
  --role "roles/run.admin"

gcloud projects add-iam-policy-binding "project-897ce48e-6275-4757-ab9" \
  --member "serviceAccount:github-actions-cloud-run@project-897ce48e-6275-4757-ab9.iam.gserviceaccount.com" \
  --role "roles/artifactregistry.writer"

gcloud iam service-accounts add-iam-policy-binding "592360297121-compute@developer.gserviceaccount.com" \
  --project "project-897ce48e-6275-4757-ab9" \
  --member "serviceAccount:github-actions-cloud-run@project-897ce48e-6275-4757-ab9.iam.gserviceaccount.com" \
  --role "roles/iam.serviceAccountUser"
```

If you later switch Cloud Run to a custom runtime service account, grant `roles/iam.serviceAccountUser` on that account instead.

### 4. Create a Workload Identity Pool and Provider

```bash
gcloud iam workload-identity-pools create github-actions \
  --project "project-897ce48e-6275-4757-ab9" \
  --location "global" \
  --display-name "GitHub Actions"

gcloud iam workload-identity-pools providers create-oidc github-provider \
  --project "project-897ce48e-6275-4757-ab9" \
  --location "global" \
  --workload-identity-pool "github-actions" \
  --display-name "GitHub Provider" \
  --issuer-uri "https://token.actions.githubusercontent.com" \
  --attribute-mapping "google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository,attribute.ref=assertion.ref" \
  --attribute-condition "assertion.repository=='itsJLCG/CVAPed'"
```

### 5. Allow GitHub Actions to impersonate the deploy service account

```bash
gcloud iam service-accounts add-iam-policy-binding \
  "github-actions-cloud-run@project-897ce48e-6275-4757-ab9.iam.gserviceaccount.com" \
  --project "project-897ce48e-6275-4757-ab9" \
  --role "roles/iam.workloadIdentityUser" \
  --member "principalSet://iam.googleapis.com/projects/592360297121/locations/global/workloadIdentityPools/github-actions/attribute.repository/itsJLCG/CVAPed"
```

## GitHub repository setup

No GitHub Actions variables or Google Cloud JSON secrets are required for this workflow.

The workflow file contains the non-secret project settings directly, and Google authentication happens through Workload Identity Federation.

## How deployments work

- Push backend changes to `main` or `gwyn`
- GitHub Actions builds and deploys automatically
- Existing Cloud Run runtime env vars and Secret Manager bindings remain on the service

## Manual deployment from GitHub UI

- Open `Actions`
- Select `Deploy Backend to Cloud Run`
- Click `Run workflow`

## Notes

- This workflow assumes the Cloud Run service already exists once from your initial manual deploy.
- The workflow deploys a new container image; it does not rotate or rewrite your runtime secrets.
- If you want staging and production later, duplicate this workflow with separate services and GitHub environments.
- The only remaining step for activation is to commit and push `.github/workflows/backend-cloud-run.yml` to GitHub.
