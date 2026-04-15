[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$ProjectId,

    [string]$Region = "us-central1",
    [string]$ServiceName = "cvaped-backend",
    [string]$RuntimeServiceAccount,
    [int]$Cpu = 1,
    [string]$Memory = "2Gi",
    [int]$Concurrency = 5,
    [int]$TimeoutSeconds = 300,
    [int]$MaxInstances = 10,
    [int]$MinInstances = 1,
    [switch]$NoAllowUnauthenticated
)

$ErrorActionPreference = "Stop"

function Require-Command {
    param([string]$Name)

    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Required command not found: $Name"
    }
}

function Load-DotEnv {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        throw ".env file not found at $Path"
    }

    $values = [ordered]@{}
    foreach ($line in Get-Content -LiteralPath $Path) {
        $trimmed = $line.Trim()
        if (-not $trimmed -or $trimmed.StartsWith("#")) {
            continue
        }

        $separatorIndex = $trimmed.IndexOf("=")
        if ($separatorIndex -lt 1) {
            continue
        }

        $key = $trimmed.Substring(0, $separatorIndex).Trim()
        $value = $trimmed.Substring($separatorIndex + 1)
        $values[$key] = $value
    }

    return $values
}

function Get-RequiredValue {
    param(
        [System.Collections.IDictionary]$Map,
        [string]$Key
    )

    if (-not $Map.Contains($Key) -or [string]::IsNullOrWhiteSpace([string]$Map[$Key])) {
        throw "Missing required value in .env: $Key"
    }

    return $Map[$Key]
}

function Get-OptionalValue {
    param(
        [System.Collections.IDictionary]$Map,
        [string]$Key
    )

    if ($Map.Contains($Key) -and -not [string]::IsNullOrWhiteSpace([string]$Map[$Key])) {
        return $Map[$Key]
    }

    return $null
}

function Invoke-GCloud {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Arguments,
        [switch]$CaptureOutput,
        [switch]$IgnoreExitCode
    )

    if ($CaptureOutput) {
        $output = & gcloud @Arguments 2>&1
        $exitCode = $LASTEXITCODE
        if (-not $IgnoreExitCode -and $exitCode -ne 0) {
            throw "gcloud command failed: gcloud $($Arguments -join ' ')`n$output"
        }
        return ($output | Out-String).Trim()
    }

    & gcloud @Arguments
    $exitCode = $LASTEXITCODE
    if (-not $IgnoreExitCode -and $exitCode -ne 0) {
        throw "gcloud command failed: gcloud $($Arguments -join ' ')"
    }
}

function Set-SecretValue {
    param(
        [string]$ProjectId,
        [string]$SecretName,
        [string]$SecretValue,
        [string]$RuntimeServiceAccount
    )

    $describeArgs = @("secrets", "describe", $SecretName, "--project", $ProjectId)
    Invoke-GCloud -Arguments $describeArgs -IgnoreExitCode | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Creating secret $SecretName"
        Invoke-GCloud -Arguments @("secrets", "create", $SecretName, "--replication-policy", "automatic", "--project", $ProjectId, "--quiet")
    }
    else {
        Write-Host "Updating secret $SecretName"
    }

    $tempFile = [System.IO.Path]::GetTempFileName()
    try {
        $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
        [System.IO.File]::WriteAllText($tempFile, $SecretValue, $utf8NoBom)
        Invoke-GCloud -Arguments @("secrets", "versions", "add", $SecretName, "--data-file=$tempFile", "--project", $ProjectId, "--quiet")

        if ($RuntimeServiceAccount) {
            Invoke-GCloud -Arguments @(
                "secrets", "add-iam-policy-binding", $SecretName,
                "--member=serviceAccount:$RuntimeServiceAccount",
                "--role=roles/secretmanager.secretAccessor",
                "--project", $ProjectId,
                "--quiet"
            )
        }
    }
    finally {
        Remove-Item -LiteralPath $tempFile -ErrorAction SilentlyContinue
    }
}

Require-Command -Name "gcloud"

$backendDir = $PSScriptRoot
$envPath = Join-Path $backendDir ".env"
$envValues = Load-DotEnv -Path $envPath

$firebaseJson = Get-OptionalValue -Map $envValues -Key "FIREBASE_SERVICE_ACCOUNT_JSON"
if (-not $firebaseJson) {
    $firebaseCandidates = @()

    $configuredFirebasePath = Get-OptionalValue -Map $envValues -Key "FIREBASE_SERVICE_ACCOUNT_PATH"
    if ($configuredFirebasePath) {
        if ([System.IO.Path]::IsPathRooted($configuredFirebasePath)) {
            $firebaseCandidates += $configuredFirebasePath
        }
        else {
            $firebaseCandidates += (Join-Path $backendDir $configuredFirebasePath)
        }
    }

    $firebaseCandidates += (Join-Path $backendDir "cvaped-fa8b2-firebase-adminsdk-fbsvc-92b2666b41.json")
    $firebasePath = $firebaseCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1

    if (-not $firebasePath) {
        throw "Firebase service account JSON file was not found. Set FIREBASE_SERVICE_ACCOUNT_JSON or provide the JSON file in backend/."
    }

    $firebaseJson = Get-Content -LiteralPath $firebasePath -Raw
}

if (-not $RuntimeServiceAccount) {
    $projectNumber = Invoke-GCloud -Arguments @("projects", "describe", $ProjectId, "--format=value(projectNumber)") -CaptureOutput
    if (-not $projectNumber) {
        throw "Unable to resolve project number for $ProjectId"
    }
    $RuntimeServiceAccount = "$projectNumber-compute@developer.gserviceaccount.com"
}

$secretValues = [ordered]@{
    "SECRET_KEY" = Get-RequiredValue -Map $envValues -Key "SECRET_KEY"
    "MONGO_URI" = Get-RequiredValue -Map $envValues -Key "MONGO_URI"
    "FIREBASE_SERVICE_ACCOUNT_JSON" = $firebaseJson
    "WEARABLE_INGEST_TOKEN" = Get-RequiredValue -Map $envValues -Key "WEARABLE_INGEST_TOKEN"
}

foreach ($optionalSecret in @(
    "AZURE_SPEECH_KEY",
    "AZURE_SPEECH_REGION",
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET"
)) {
    $value = Get-OptionalValue -Map $envValues -Key $optionalSecret
    if ($value) {
        $secretValues[$optionalSecret] = $value
    }
}

$plainEnvValues = [ordered]@{
    "FLASK_DEBUG" = "False"
    "ENABLE_MDNS" = "False"
    "FRONTEND_URL" = Get-RequiredValue -Map $envValues -Key "FRONTEND_URL"
    "CORS_ORIGINS" = Get-RequiredValue -Map $envValues -Key "CORS_ORIGINS"
    "WEARABLE_LATEST_MAX_AGE_SECONDS" = "300"
}

$enableMdnsValue = Get-OptionalValue -Map $envValues -Key "ENABLE_MDNS"
if ($enableMdnsValue) {
    $plainEnvValues["ENABLE_MDNS"] = $enableMdnsValue
}

$wearableMaxAgeValue = Get-OptionalValue -Map $envValues -Key "WEARABLE_LATEST_MAX_AGE_SECONDS"
if ($wearableMaxAgeValue) {
    $plainEnvValues["WEARABLE_LATEST_MAX_AGE_SECONDS"] = $wearableMaxAgeValue
}

foreach ($optionalPlain in @(
    "GUNICORN_WORKERS",
    "GUNICORN_THREADS",
    "GUNICORN_TIMEOUT",
    "GUNICORN_GRACEFUL_TIMEOUT",
    "GUNICORN_KEEPALIVE",
    "THERAPY_SERVICE_URL"
)) {
    $value = Get-OptionalValue -Map $envValues -Key $optionalPlain
    if ($value) {
        $plainEnvValues[$optionalPlain] = $value
    }
}

Write-Host "Enabling required Google Cloud APIs..."
Invoke-GCloud -Arguments @(
    "services", "enable",
    "run.googleapis.com",
    "cloudbuild.googleapis.com",
    "artifactregistry.googleapis.com",
    "secretmanager.googleapis.com",
    "--project", $ProjectId,
    "--quiet"
)

Write-Host "Using runtime service account: $RuntimeServiceAccount"

foreach ($entry in $secretValues.GetEnumerator()) {
    Set-SecretValue -ProjectId $ProjectId -SecretName $entry.Key -SecretValue $entry.Value -RuntimeServiceAccount $RuntimeServiceAccount
}

$setEnvPairs = @()
foreach ($entry in $plainEnvValues.GetEnumerator()) {
    if (-not [string]::IsNullOrWhiteSpace($entry.Value)) {
        $setEnvPairs += "$($entry.Key)=$($entry.Value)"
    }
}
$setEnvArg = "^#^" + ($setEnvPairs -join "#")

$secretMappings = @()
foreach ($secretName in $secretValues.Keys) {
    $secretMappings += "$secretName=${secretName}:latest"
}
$updateSecretsArg = "^#^" + ($secretMappings -join "#")

$deployArgs = @(
    "run", "deploy", $ServiceName,
    "--source", $backendDir,
    "--project", $ProjectId,
    "--region", $Region,
    "--platform", "managed",
    "--port", "8080",
    "--cpu", $Cpu.ToString(),
    "--memory", $Memory,
    "--concurrency", $Concurrency.ToString(),
    "--timeout", $TimeoutSeconds.ToString(),
    "--max-instances", $MaxInstances.ToString(),
    "--min-instances", $MinInstances.ToString(),
    "--service-account", $RuntimeServiceAccount,
    "--set-env-vars", $setEnvArg,
    "--update-secrets", $updateSecretsArg,
    "--quiet"
)

if ($NoAllowUnauthenticated) {
    $deployArgs += "--no-allow-unauthenticated"
}
else {
    $deployArgs += "--allow-unauthenticated"
}

Write-Host "Deploying $ServiceName to Cloud Run..."
Invoke-GCloud -Arguments $deployArgs

$serviceUrl = Invoke-GCloud -Arguments @(
    "run", "services", "describe", $ServiceName,
    "--project", $ProjectId,
    "--region", $Region,
    "--format=value(status.url)"
) -CaptureOutput

Write-Host ""
Write-Host "Deployment complete."
Write-Host "Service URL: $serviceUrl"
Write-Host ""
Write-Host "Next steps:"
Write-Host "1. Update ESP32 Files/WAIST_MASTER.INO serverUrl to $serviceUrl/api/wearable/data"
Write-Host "2. Keep wearableToken aligned with Secret Manager secret WEARABLE_INGEST_TOKEN"
Write-Host "3. Reflash the waist master and run a hardware smoke test"
