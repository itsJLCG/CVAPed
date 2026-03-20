# ESP32 Hardware Setup for Cloud Run

This setup keeps the existing 3-device hardware topology:

- `LEFT_FOOT_SLAVE.INO` -> ESP-NOW sender
- `RIGHT_FOOT_SLAVE.INO` -> ESP-NOW sender
- `WAIST_MASTER.INO` -> ESP-NOW receiver + WiFi uploader

The waist master now batches gait samples and uploads them to the backend in the schema expected by the Cloud Run backend.

## What changed

- The foot ESP32 devices now send data every `200ms` instead of every `1000ms`.
- The waist ESP32 now does two uploads to the same backend endpoint:
  - a live snapshot upload every `1s` for the monitoring and recording pages
  - a batched upload every `60` synchronized samples for analysis
- Each batched upload contains about `12s` of gait data.
- The waist ESP32 sends both live and batched payloads to `/api/wearable/data`.
- The backend can analyze the stored batch through `/api/hardware/gait/analyze-latest`.

## 1. Set backend secrets first

In the backend environment or Cloud Run secrets, make sure these exist:

- `WEARABLE_INGEST_TOKEN`
- `SECRET_KEY`
- `MONGO_URI`
- `FIREBASE_SERVICE_ACCOUNT_JSON`

The waist master must use the same `WEARABLE_INGEST_TOKEN` value.

## 2. Edit the waist master firmware

Open `ESP32 Files/WAIST_MASTER.INO` and set these values:

- `ssid`
- `password`
- `serverUrl`
- `wearableToken`
- `patientUserId` (optional)

### Local test mode

Use your backend machine LAN IP before Cloud Run deploy:

```cpp
const char* serverUrl = "http://192.168.1.50:5000/api/wearable/data";
```

### Cloud Run mode

Use your service URL or custom domain:

```cpp
const char* serverUrl = "https://your-service-url.run.app/api/wearable/data";
```

### Token

Paste the same value used in backend `WEARABLE_INGEST_TOKEN`:

```cpp
const char* wearableToken = "your-shared-token";
```

### Optional patient mapping

If you already know the MongoDB `_id` of the patient account, set it here:

```cpp
const char* patientUserId = "66b8...";
```

If left empty, you can still analyze by device ID later.

## 3. Keep the SSID aligned on all devices

The foot slaves scan for the hotspot SSID to discover the ESP-NOW channel.

Make sure these match:

- `ESP32 Files/WAIST_MASTER.INO` -> `ssid`
- `ESP32 Files/LEFT_FOOT_SLAVE.INO` -> `TARGET_SSID`
- `ESP32 Files/RIGHT_FOOT_SLAVE.INO` -> `TARGET_SSID`

## 4. Flash order

1. Flash `WAIST_MASTER.INO`
2. Open the Serial Monitor for the waist board
3. Copy the printed waist MAC address
4. Paste that MAC into:
   - `ESP32 Files/LEFT_FOOT_SLAVE.INO`
   - `ESP32 Files/RIGHT_FOOT_SLAVE.INO`
5. Flash `LEFT_FOOT_SLAVE.INO`
6. Flash `RIGHT_FOOT_SLAVE.INO`

## 5. Local backend test before Cloud Run

Before deploying, test the end-to-end hardware locally.

### Backend

Run the backend locally with the updated `.env`.

### Waist firmware

Set:

```cpp
const char* serverUrl = "http://<your-lan-ip>:5000/api/wearable/data";
```

### What to watch in Serial Monitor

#### Waist master

You should see:

- WiFi connected
- ESP-NOW ready
- `LEFT foot data stream detected`
- `RIGHT foot data stream detected`
- `Live snapshot uploaded ...`
- `Captured 60 synchronized samples...`
- `Uploaded gait batch ... successfully`

#### Foot slaves

You should see periodic health logs like:

- `LEFT stream OK ...`
- `RIGHT stream OK ...`

## 6. Confirm the payload reached the backend

Use:

```bash
curl "http://localhost:5000/api/wearable/data?include_meta=true"
```

Or, after deploy:

```bash
curl "https://your-service-url.run.app/api/wearable/data?include_meta=true"
```

You should see `device_id`, timestamps, and sample summary.

The default `GET /api/wearable/data` response should still look like the live snapshot format expected by the monitoring UI, with keys like:

- `LEFT_WAIST`
- `RIGHT_WAIST`
- `LEFT_KNEE`
- `RIGHT_KNEE`
- `LEFT_ANKLE`
- `RIGHT_ANKLE`
- `LEFT_FOOT_FSR`
- `RIGHT_FOOT_FSR`

## 7. Run gait analysis

The hardware upload stores the batched payload. Analysis is triggered separately.

### Option A: analyze from the app

Have the authenticated app call:

```bash
POST /api/hardware/gait/analyze-latest
```

Body example:

```json
{
  "device_id": "WAIST_MASTER"
}
```

### Option B: test with a bearer token manually

```bash
curl -X POST "https://your-service-url.run.app/api/hardware/gait/analyze-latest" \
  -H "Authorization: Bearer <user-jwt-token>" \
  -H "Content-Type: application/json" \
  -d "{\"device_id\":\"WAIST_MASTER\"}"
```

If `patientUserId` is set in the firmware, the current patient flow is cleaner because the backend can associate the upload with that user.

## 8. Deploy to Cloud Run

Once local hardware upload works:

1. Change `serverUrl` in `WAIST_MASTER.INO` to the Cloud Run HTTPS URL
2. Keep the same `wearableToken`
3. Reflash only the waist master
4. Deploy the backend with the secrets configured

## 9. Recommended production notes

- Use a custom domain instead of the raw `run.app` URL if possible
- Keep `allowInsecureTls = true` only as the quick-start option on ESP32
- If you need stricter TLS later, replace it with certificate validation
- Do not set `ENABLE_MDNS=true` on Cloud Run
- The local ESP-NOW network remains unchanged; only the waist-to-backend hop changes
