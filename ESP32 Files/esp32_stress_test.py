"""
WiFi Congestion Stress Test for ESP32 Gait System

Run this script on a PC connected to the SAME WiFi network as your ESP32.
It floods the backend with concurrent requests to simulate network congestion,
then monitors how well your ESP32 can still send/receive data through the noise.

Usage:
    python esp32_stress_test.py

Requirements:
    pip install requests aiohttp numpy matplotlib pandas tqdm
"""

import os
import sys
import time
import json
import random
import asyncio
import argparse
import statistics
import traceback
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Optional

try:
    import requests
    from requests.exceptions import RequestException, Timeout, ConnectionError
except ImportError:
    print("ERROR: requests library not installed. Run: pip install requests")
    sys.exit(1)

BACKEND_URL = "https://cvaped-backend-qrjmay7wva-uc.a.run.app/api/wearable/data"
WEARABLE_TOKEN = "pM4ZKYHgv7gKEEFm6HnZXZPfz5RHlmomrEFTJzeEEto"
LOCAL_TEST_URL = "http://127.0.0.1:5000/api/wearable/data"

TARGET_URL = os.environ.get("STRESS_TEST_URL", BACKEND_URL)

HEADERS = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {WEARABLE_TOKEN}",
    "User-Agent": "ESP32-StressTest/1.0",
}


class StressTestResult:
    def __init__(self):
        self.start_time = time.time()
        self.end_time: Optional[float] = None
        self.total_requests = 0
        self.successful_requests = 0
        self.failed_requests = 0
        self.timeouts = 0
        self.connection_errors = 0
        self.http_errors = 0
        self.latencies: list[float] = []
        self.error_messages: list[str] = []
        self.latency_history: list[tuple[float, float]] = []
        self.bytes_sent = 0
        self.bytes_received = 0

    def add_success(self, latency: float, resp_size: int):
        self.total_requests += 1
        self.successful_requests += 1
        self.latencies.append(latency)
        self.bytes_sent += 512
        self.bytes_received += resp_size
        self.latency_history.append((time.time() - self.start_time, latency))

    def add_timeout(self, latency: float, msg: str):
        self.total_requests += 1
        self.timeouts += 1
        self.latencies.append(latency)
        self.error_messages.append(f"TIMEOUT: {msg}")

    def add_connection_error(self, latency: float, msg: str):
        self.total_requests += 1
        self.connection_errors += 1
        self.latencies.append(latency)
        self.error_messages.append(f"CONN_ERR: {msg}")

    def add_http_error(self, latency: float, status: int, msg: str):
        self.total_requests += 1
        self.http_errors += 1
        self.latencies.append(latency)
        self.error_messages.append(f"HTTP_{status}: {msg}")

    def finish(self):
        self.end_time = time.time()

    @property
    def duration(self) -> float:
        return (self.end_time or time.time()) - self.start_time

    @property
    def success_rate(self) -> float:
        return (self.successful_requests / self.total_requests * 100) if self.total_requests > 0 else 0

    @property
    def rps(self) -> float:
        return self.total_requests / self.duration if self.duration > 0 else 0

    @property
    def p50_latency(self) -> float:
        return statistics.median(self.latencies) if self.latencies else 0

    @property
    def p95_latency(self) -> float:
        if not self.latencies:
            return 0
        sorted_lat = sorted(self.latencies)
        idx = int(len(sorted_lat) * 0.95)
        return sorted_lat[min(idx, len(sorted_lat) - 1)]

    @property
    def p99_latency(self) -> float:
        if not self.latencies:
            return 0
        sorted_lat = sorted(self.latencies)
        idx = int(len(sorted_lat) * 0.99)
        return sorted_lat[min(idx, len(sorted_lat) - 1)]

    def summary(self) -> str:
        lines = [
            "",
            "=" * 60,
            "  STRESS TEST RESULTS",
            "=" * 60,
            f"  Target URL     : {TARGET_URL}",
            f"  Duration       : {self.duration:.2f}s",
            f"  Total Requests : {self.total_requests}",
            f"  Successful     : {self.successful_requests} ({self.success_rate:.1f}%)",
            f"  Failed         : {self.failed_requests}",
            f"    - Timeouts   : {self.timeouts}",
            f"    - Conn Errs  : {self.connection_errors}",
            f"    - HTTP Errs  : {self.http_errors}",
            f"  Requests/sec   : {self.rps:.1f}",
            f"  Latency P50    : {self.p50_latency * 1000:.1f}ms",
            f"  Latency P95    : {self.p95_latency * 1000:.1f}ms",
            f"  Latency P99    : {self.p99_latency * 1000:.1f}ms",
            f"  Data TX        : {self.bytes_sent / 1024:.1f} KB",
            f"  Data RX        : {self.bytes_received / 1024:.1f} KB",
        ]
        if self.error_messages:
            lines.append(f"  Errors ({min(10, len(self.error_messages))} of {len(self.error_messages)}):")
            for err in self.error_messages[:10]:
                lines.append(f"    - {err}")
        lines.append("=" * 60)
        return "\n".join(lines)


def generate_esp32_payload(device_id: str = "stress-test-waist") -> dict:
    now = time.time()
    sample = {
        "device_id": device_id,
        "user_id": "stress-tester",
        "timestamp": now,
        "sample_count": 60,
        "left_waist": [
            {"t": now - 12 + i * 0.2, "ax": random.uniform(-1, 1), "ay": random.uniform(-1, 1), "az": random.uniform(-1, 1),
             "gx": random.uniform(-10, 10), "gy": random.uniform(-10, 10), "gz": random.uniform(-10, 10)}
            for i in range(60)
        ],
        "right_waist": [
            {"t": now - 12 + i * 0.2, "ax": random.uniform(-1, 1), "ay": random.uniform(-1, 1), "az": random.uniform(-1, 1),
             "gx": random.uniform(-10, 10), "gy": random.uniform(-10, 10), "gz": random.uniform(-10, 10)}
            for i in range(60)
        ],
        "left_knee": [
            {"t": now - 12 + i * 0.2, "ax": random.uniform(-1, 1), "ay": random.uniform(-1, 1), "az": random.uniform(-9.8, 0.2),
             "gx": random.uniform(-10, 10), "gy": random.uniform(-10, 10), "gz": random.uniform(-10, 10)}
            for i in range(60)
        ],
        "right_knee": [
            {"t": now - 12 + i * 0.2, "ax": random.uniform(-1, 1), "ay": random.uniform(-1, 1), "az": random.uniform(-9.8, 0.2),
             "gx": random.uniform(-10, 10), "gy": random.uniform(-10, 10), "gz": random.uniform(-10, 10)}
            for i in range(60)
        ],
        "left_ankle": [
            {"t": now - 12 + i * 0.2, "ax": random.uniform(-1, 1), "ay": random.uniform(-1, 1), "az": random.uniform(-9.8, 0.2),
             "gx": random.uniform(-10, 10), "gy": random.uniform(-10, 10), "gz": random.uniform(-10, 10)}
            for i in range(60)
        ],
        "right_ankle": [
            {"t": now - 12 + i * 0.2, "ax": random.uniform(-1, 1), "ay": random.uniform(-1, 1), "az": random.uniform(-9.8, 0.2),
             "gx": random.uniform(-10, 10), "gy": random.uniform(-10, 10), "gz": random.uniform(-10, 10)}
            for i in range(60)
        ],
        "left_fsr": {
            "heel": [random.uniform(0, 800) for _ in range(60)],
            "mid": [random.uniform(0, 600) for _ in range(60)],
            "toe": [random.uniform(0, 400) for _ in range(60)],
        },
        "right_fsr": {
            "heel": [random.uniform(0, 800) for _ in range(60)],
            "mid": [random.uniform(0, 600) for _ in range(60)],
            "toe": [random.uniform(0, 400) for _ in range(60)],
        },
    }
    return sample


def send_request(result: StressTestResult, url: str, timeout: float = 10.0) -> None:
    payload = generate_esp32_payload()
    start = time.time()
    try:
        resp = requests.post(
            url,
            json=payload,
            headers=HEADERS,
            timeout=timeout,
            verify=False,
        )
        latency = time.time() - start
        if resp.status_code == 200 or resp.status_code == 201:
            result.add_success(latency, len(resp.content))
        else:
            result.add_http_error(latency, resp.status_code, resp.text[:200])
    except Timeout:
        result.add_timeout(time.time() - start, f"Request timed out after {timeout}s")
    except ConnectionError as e:
        result.add_connection_error(time.time() - start, str(e)[:100])
    except Exception as e:
        result.add_http_error(time.time() - start, 0, str(e)[:100])


def print_progress_bar(iteration: int, total: int, prefix: str = "", length: int = 50):
    filled = int(length * iteration / total)
    bar = "=" * filled + "-" * (length - filled)
    elapsed = time.time()
    print(f"\r{prefix} [{bar}] {iteration}/{total}", end="", flush=True)


def run_congestion_test(
    total_requests: int = 1000,
    concurrent_workers: int = 50,
    timeout: float = 10.0,
    ramp_up_seconds: float = 5.0,
    steady_state_seconds: float = 30.0,
    ramp_down_seconds: float = 5.0,
    esp32_payload_size: bool = True,
    verbose: bool = False,
) -> StressTestResult:
    """
    Run a multi-phase congestion stress test simulating real-world WiFi congestion.

    Phases:
      1. Ramp-up   : gradually increase traffic (simulate new devices joining)
      2. Steady    : sustained high load (peak congestion)
      3. Ramp-down : gradually decrease traffic
      4. Burst     : sudden spike of requests (simulate traffic bursts)

    The ESP32's ability to maintain its connection during each phase tells you
    how resilient it is to real-world network conditions.
    """
    result = StressTestResult()
    print(f"\n[*] Target : {TARGET_URL}")
    print(f"[*] Total  : {total_requests} requests | {concurrent_workers} concurrent workers")
    print(f"[*] Timeout: {timeout}s per request")
    print(f"[*] Phases : ramp-up({ramp_up_seconds}s) + steady({steady_state_seconds}s) + ramp-down({ramp_down_seconds}s) + burst(10s)")
    print()

    if "https" in TARGET_URL:
        import urllib3
        urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

    start = time.time()
    phase_start = start
    phase = "RAMP-UP"
    prev_rps = 0

    def print_phase(phase_name: str, desc: str):
        print(f"\n[{datetime.now().strftime('%H:%M:%S')}] --- {phase_name} --- {desc}")

    print_phase(phase, f"Increasing from 0 to {concurrent_workers} concurrent workers")

    executor = ThreadPoolExecutor(max_workers=concurrent_workers)
    active_futures: set = set()
    request_count = 0

    phases = [
        ("RAMP-UP", ramp_up_seconds, 1, concurrent_workers),
        ("STEADY", steady_state_seconds, concurrent_workers, concurrent_workers),
        ("RAMP-DOWN", ramp_down_seconds, concurrent_workers, 1),
        ("BURST", 10.0, concurrent_workers * 2, concurrent_workers * 2),
    ]

    for phase_name, phase_duration, start_workers, end_workers in phases:
        print_phase(phase_name, f"duration={phase_duration}s, workers={start_workers}→{end_workers}")
        phase_start = time.time()
        phase_workers = start_workers

        if phase_name == "RAMP-DOWN":
            workers_per_sec = (start_workers - end_workers) / phase_duration
        elif phase_name == "RAMP-UP":
            workers_per_sec = (end_workers - start_workers) / phase_duration
        else:
            workers_per_sec = 0

        worker_step_interval = 1.0
        next_worker_change = phase_start + worker_step_interval

        while time.time() - phase_start < phase_duration:
            current_time = time.time()
            elapsed_in_phase = current_time - phase_start

            if phase_name in ("RAMP-UP", "RAMP-DOWN"):
                if current_time >= next_worker_change:
                    if phase_name == "RAMP-UP":
                        phase_workers = min(int(start_workers + (end_workers - start_workers) * elapsed_in_phase / phase_duration), end_workers)
                    else:
                        phase_workers = max(int(start_workers - (start_workers - end_workers) * elapsed_in_phase / phase_duration), end_workers)
                    next_worker_change = current_time + worker_step_interval
                    if phase_workers != prev_rps:
                        prev_rps = phase_workers

            if len(active_futures) < phase_workers and request_count < total_requests:
                future = executor.submit(send_request, result, TARGET_URL, timeout)
                active_futures.add(future)
                request_count += 1

            done_futures = {f for f in active_futures if f.done()}
            for f in done_futures:
                try:
                    f.result()
                except Exception:
                    pass
            active_futures -= done_futures

            elapsed_total = time.time() - start
            rps_current = result.rps
            p50 = result.p50_latency * 1000
            p95 = result.p95_latency * 1000
            print(
                f"\r  [{phase_name}] t={elapsed_total:5.1f}s | sent={result.total_requests:5d} | "
                f"ok={result.successful_requests:4d} | fail={result.failed_requests:3d} | "
                f"RPS={rps_current:5.1f} | P50={p50:6.1f}ms | P95={p95:7.1f}ms | workers={len(active_futures)}/{phase_workers}",
                end="", flush=True
            )

            time.sleep(0.05)
            if result.total_requests >= total_requests:
                break

        if result.total_requests >= total_requests:
            break

    for f in as_completed(active_futures):
        try:
            f.result()
        except Exception:
            pass

    executor.shutdown(wait=True)
    result.finish()

    print(f"\n\n{result.summary()}")

    if result.latency_history and len(result.latency_history) > 1:
        try:
            import numpy as np
            import matplotlib
            matplotlib.use('Agg')
            import matplotlib.pyplot as plt

            times = [h[0] for h in result.latency_history]
            lats = [h[1] * 1000 for h in result.latency_history]

            fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(12, 8))
            fig.suptitle(f"ESP32 WiFi Congestion Stress Test\nTarget: {TARGET_URL}", fontsize=14)

            ax1.plot(times, lats, alpha=0.4, linewidth=0.8, color='blue', label='Latency (ms)')
            window = max(1, len(times) // 50)
            smoothed = np.convolve(lats, np.ones(window) / window, mode='valid')
            smooth_times = times[window - 1:]
            ax1.plot(smooth_times, smoothed, color='red', linewidth=1.5, label=f'MA({window})')
            ax1.axhline(result.p50_latency * 1000, color='green', linestyle='--', label=f'P50={result.p50_latency*1000:.1f}ms')
            ax1.axhline(result.p95_latency * 1000, color='orange', linestyle='--', label=f'P95={result.p95_latency*1000:.1f}ms')
            ax1.set_xlabel("Time (s)")
            ax1.set_ylabel("Latency (ms)")
            ax1.legend()
            ax1.set_title("Request Latency Over Time")
            ax1.grid(True, alpha=0.3)

            rolling_p = []
            for i in range(0, len(lats), max(1, len(lats) // 100)):
                window_slice = lats[max(0, i - 20):i + 20]
                if window_slice:
                    rolling_p.append(np.percentile(window_slice, 95))
            ax2.plot(range(len(rolling_p)), rolling_p, color='purple', linewidth=1.5)
            ax2.set_xlabel("Sample")
            ax2.set_ylabel("P95 Latency (ms)")
            ax2.set_title("P95 Latency Rolling Window")
            ax2.grid(True, alpha=0.3)

            plt.tight_layout()
            save_path = os.path.join(os.path.dirname(__file__), "stress_test_results.png")
            plt.savefig(save_path, dpi=150)
            print(f"\n[+] Chart saved to: {save_path}")
        except ImportError:
            print("\n[!] matplotlib/numpy not available. Skipping chart. Install with: pip install numpy matplotlib")
        except Exception as e:
            print(f"\n[!] Could not generate chart: {e}")

    return result


def run_esp32_recovery_test(
    burst_count: int = 5,
    burst_size: int = 100,
    rest_between_bursts: float = 10.0,
) -> None:
    """
    Simulate repeated traffic bursts and measure how long the ESP32 takes to
    recover (i.e., how quickly the backend starts responding normally again
    after a congestion spike). This is critical for gait data integrity since
    missed samples = gaps in the gait cycle record.
    """
    print(f"\n{'=' * 60}")
    print("  ESP32 RECOVERY TEST (Burst Simulation)")
    print(f"{'=' * 60}")
    print(f"  Bursts      : {burst_count}")
    print(f"  Burst size  : {burst_size} requests each")
    print(f"  Rest period : {rest_between_bursts}s between bursts")
    print()

    if "https" in TARGET_URL:
        import urllib3
        urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

    for i in range(burst_count):
        print(f"\n[{datetime.now().strftime('%H:%M:%S')}] Burst {i + 1}/{burst_count} -- Sending {burst_size} requests...")
        result = StressTestResult()
        start = time.time()

        with ThreadPoolExecutor(max_workers=50) as executor:
            futures = [executor.submit(send_request, result, TARGET_URL, 10.0) for _ in range(burst_size)]
            for j, f in enumerate(as_completed(futures)):
                try:
                    f.result()
                except Exception:
                    pass
                if j % 20 == 0:
                    elapsed = time.time() - start
                    print(f"  ... {j}/{burst_size} done ({elapsed:.1f}s elapsed)")

        result.finish()
        print(f"  Burst {i + 1} done: {result.successful_requests}/{result.total_requests} ok, "
              f"P50={result.p50_latency*1000:.1f}ms, P95={result.p95_latency*1000:.1f}ms")

        if i < burst_count - 1:
            print(f"  Resting for {rest_between_bursts}s (simulating ESP32 reconnect window)...")
            time.sleep(rest_between_bursts)

    print(f"\n{'=' * 60}")
    print("  Recovery test complete.")
    print("  If ESP32 data gaps appear in your gait log after bursts,")
    print("  consider increasing BATCH_SAMPLES or HTTP_TIMEOUT_MS in WAIST_MASTER.INO")
    print(f"{'=' * 60}")


def run_sustained_load_test(
    duration_seconds: float = 60.0,
    target_rps: int = 10,
) -> StressTestResult:
    """
    Sustained load test at a target requests-per-second rate.
    Use this to find the breaking point where ESP32 data starts getting dropped.
    """
    print(f"\n{'=' * 60}")
    print("  SUSTAINED LOAD TEST")
    print(f"{'=' * 60}")
    print(f"  Duration  : {duration_seconds}s")
    print(f"  Target RPS: {target_rps}")
    print()

    if "https" in TARGET_URL:
        import urllib3
        urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

    result = StressTestResult()
    start = time.time()
    interval = 1.0 / target_rps
    next_request_time = start

    print(f"  Sending {target_rps} req/s for {duration_seconds}s...")
    while time.time() - start < duration_seconds:
        loop_start = time.time()

        send_request(result, TARGET_URL, 10.0)

        elapsed = time.time() - loop_start
        sleep_time = max(0, interval - elapsed)
        if sleep_time > 0:
            time.sleep(sleep_time)

        if result.total_requests % 50 == 0:
            elapsed_total = time.time() - start
            print(f"  t={elapsed_total:5.1f}s | sent={result.total_requests:4d} | "
                  f"ok={result.successful_requests:4d} | RPS={result.rps:4.1f} | "
                  f"P95={result.p95_latency*1000:.1f}ms")

    result.finish()
    print(result.summary())
    return result


def check_backend_connectivity(url: str) -> bool:
    print(f"\n[*] Checking backend connectivity at {url}...")
    try:
        resp = requests.get(
            TARGET_URL.replace("/wearable/data", "/health"),
            headers={"Authorization": f"Bearer {WEARABLE_TOKEN}"},
            timeout=5,
            verify=False,
        )
        print(f"    Backend responded: HTTP {resp.status_code}")
        return True
    except Exception:
        pass

    try:
        resp = requests.post(TARGET_URL, json=generate_esp32_payload(), headers=HEADERS, timeout=5, verify=False)
        print(f"    Backend POST test: HTTP {resp.status_code} (OK)")
        return True
    except Exception as e:
        print(f"    [!] Backend unreachable or error: {e}")
        print(f"    [!] The stress test will still run but may produce connection errors.")
        return False


def main():
    parser = argparse.ArgumentParser(
        description="ESP32 WiFi Congestion Stress Test",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Full congestion test (default: 1000 requests, 50 concurrent, ~50s)
  python esp32_stress_test.py

  # Heavy load test
  python esp32_stress_test.py --total 5000 --concurrent 100

  # Sustained load (60s at 20 RPS)
  python esp32_stress_test.py --mode sustained --duration 60 --rps 20

  # Recovery test (5 bursts)
  python esp32_stress_test.py --mode recovery

  # Target a local Flask backend instead of cloud
  set STRESS_TEST_URL=http://localhost:5000/api/wearable/data
  python esp32_stress_test.py

  # Target a custom URL
  python esp32_stress_test.py --url https://your-custom-backend.com/api/wearable/data
        """
    )
    parser.add_argument("--url", default=TARGET_URL, help="Target URL (default: env STRESS_TEST_URL or cloud backend)")
    parser.add_argument("--mode", default="congestion", choices=["congestion", "recovery", "sustained"],
                        help="Test mode (default: congestion)")
    parser.add_argument("--total", type=int, default=1000, help="Total requests (default: 1000)")
    parser.add_argument("--concurrent", type=int, default=50, help="Max concurrent workers (default: 50)")
    parser.add_argument("--timeout", type=float, default=10.0, help="Request timeout in seconds (default: 10)")
    parser.add_argument("--duration", type=float, default=60.0, help="Sustained test duration in seconds")
    parser.add_argument("--rps", type=int, default=10, help="Target requests per second for sustained mode")
    parser.add_argument("-v", "--verbose", action="store_true", help="Verbose output")

    args = parser.parse_args()

    target = args.url

    print(f"\n{'#' * 60}")
    print('#  ESP32 WiFi Congestion Stress Test')
    print(f"#{' ' * 58}#")
    print('#  Scenarios tested:')
    print('#    1. CONGESTION  - Multi-phase load (ramp-up → steady → ramp-down → burst)')
    print('#    2. RECOVERY    - Repeated traffic bursts to test ESP32 data recovery')
    print('#    3. SUSTAINED   - Long-running load at fixed RPS')
    print(f"{'#' * 60}")

    check_backend_connectivity(target)

    if args.mode == "congestion":
        run_congestion_test(
            total_requests=args.total,
            concurrent_workers=args.concurrent,
            timeout=args.timeout,
            ramp_up_seconds=5.0,
            steady_state_seconds=30.0,
            ramp_down_seconds=5.0,
            verbose=args.verbose,
        )
    elif args.mode == "recovery":
        run_esp32_recovery_test(burst_count=5, burst_size=args.concurrent * 2, rest_between_bursts=10.0)
    elif args.mode == "sustained":
        run_sustained_load_test(duration_seconds=args.duration, target_rps=args.rps)

    print("\n[*] Stress test complete. Use results above to tune your ESP32 config:")
    print("    - HTTP_TIMEOUT_MS  : increase if P95 latency is high")
    print("    - UPLOAD_RETRY_MS  : increase if connection errors occur")
    print("    - BATCH_SAMPLES    : increase to buffer more data during outages")
    print()


if __name__ == "__main__":
    main()
