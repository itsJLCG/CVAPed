"""
WiFi Congestion Stress Test
Floods your local WiFi network to stress-test the ESP32's WiFi resilience.
Run this on a PC connected to the SAME WiFi network as your ESP32.

Usage:
    python wifi_congestion_test.py

Requirements:
    pip install speedtest-cli psutil
"""

import os
import sys
import time
import socket
import subprocess
import threading
import argparse
import statistics
from datetime import datetime

try:
    import speedtest
except ImportError:
    print("Installing speedtest-cli...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "speedtest-cli", "-q"])
    import speedtest

WAN_HOST = "8.8.8.8"
WIFI_HOST = "192.168.0.1"
TEST_DURATION = 30
CONCURRENT_STREAMS = 10


class CongestionTest:
    def __init__(self):
        self.start_time = None
        self.end_time = None
        self.running = False
        self.ping_results: list[float] = []
        self.ping_lock = threading.Lock()
        self.latency_history: list[tuple[float, float]] = []

    def get_local_ip(self) -> str:
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect((WIFI_HOST, 80))
            ip = s.getsockname()[0]
            s.close()
            return ip
        except Exception:
            try:
                s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
                s.connect(("1.1.1.1", 80))
                ip = s.getsockname()[0]
                s.close()
                return ip
            except Exception:
                return "unknown"

    def ping_worker(self, host: str, duration: float):
        proc = subprocess.Popen(
            ["ping", "-n", "1", host],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        self.running = True
        start = time.time()
        while self.running and (time.time() - start < duration):
            try:
                result = subprocess.run(
                    ["ping", "-n", "1", "-w", "500", host],
                    capture_output=True,
                    timeout=2,
                )
                output = result.stdout.decode("utf-8", errors="ignore")
                if "time=" in output or "ms" in output:
                    for line in output.split("\n"):
                        if "time=" in line:
                            t = line.split("time=")[-1].split()[0]
                            latency = float(t)
                            with self.ping_lock:
                                self.ping_results.append(latency)
                            elapsed = time.time() - self.start_time
                            self.latency_history.append((elapsed, latency))
                            break
            except Exception:
                with self.ping_lock:
                    self.ping_results.append(9999)
            time.sleep(0.2)

    def saturate_wan_download(self, duration: float, streams: int):
        print(f"  [FLOOD] Downloading from internet ({streams} streams) for {duration}s...")
        threads = []
        for i in range(streams):
            t = threading.Thread(target=self._download_worker, args=(duration, i))
            t.start()
            threads.append(t)
        for t in threads:
            t.join()

    def _download_worker(self, duration: float, worker_id: int):
        start = time.time()
        while self.running and (time.time() - start < duration):
            try:
                proc = subprocess.Popen(
                    ["curl", "-s", "-o", os.devnull,
                     "http://speedtest.tele2.net/10MB.zip"],
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                )
                proc.wait(timeout=30)
            except Exception:
                pass

    def saturate_wan_upload(self, duration: float, streams: int):
        print(f"  [FLOOD] Uploading to internet ({streams} streams) for {duration}s...")
        threads = []
        for i in range(streams):
            t = threading.Thread(target=self._upload_worker, args=(duration, i))
            t.start()
            threads.append(t)
        for t in threads:
            t.join()

    def _upload_worker(self, duration: float, worker_id: int):
        start = time.time()
        data = os.urandom(512 * 1024)
        while self.running and (time.time() - start < duration):
            try:
                proc = subprocess.Popen(
                    ["curl", "-s", "-o", os.devnull, "-X", "POST",
                     "-d", f"@/dev/stdin", "http://httpbin.org/post"],
                    stdin=subprocess.PIPE,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                )
                proc.communicate(input=data, timeout=15)
            except Exception:
                pass

    def saturate_local_tcp(self, host: str, port: int, duration: float, streams: int):
        print(f"  [FLOOD] TCP flooding to {host}:{port} ({streams} streams) for {duration}s...")
        threads = []
        for i in range(streams):
            t = threading.Thread(target=self._tcp_flood_worker, args=(host, port, duration, i))
            t.start()
            threads.append(t)
        for t in threads:
            t.join()

    def _tcp_flood_worker(self, host: str, port: int, duration: float, worker_id: int):
        start = time.time()
        while self.running and (time.time() - start < duration):
            try:
                s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                s.settimeout(2)
                s.connect((host, port))
                data = os.urandom(8192)
                for _ in range(10):
                    if not self.running:
                        break
                    try:
                        s.sendall(data)
                    except Exception:
                        break
                s.close()
            except Exception:
                pass

    def run(
        self,
        mode: str = "download",
        duration: float = 30,
        streams: int = 10,
        target: str = "wan",
        host: str = "192.168.0.1",
        port: int = 80,
        ping_host: str = "8.8.8.8",
        baseline_duration: float = 5,
    ):
        local_ip = self.get_local_ip()
        print(f"\n{'#' * 60}")
        print(f"#  WiFi Congestion Stress Test")
        print(f"#  Local IP   : {local_ip}")
        print(f"#  WiFi SSID  : hey (ESP32's network)")
        print(f"#  Mode       : {mode.upper()}")
        print(f"#  Duration   : {duration}s (+ {baseline_duration}s baseline)")
        print(f"#  Streams    : {streams}")
        print(f"#  Target     : {target.upper()} ({host})")
        print(f"#  Ping host  : {ping_host}")
        print(f"{'#' * 60}\n")

        print(f"[1/3] Baseline ping to {ping_host} for {baseline_duration}s...")
        self.start_time = time.time()
        self.ping_results = []
        self.latency_history = []
        self.running = True
        ping_thread = threading.Thread(target=self.ping_worker, args=(ping_host, baseline_duration))
        ping_thread.start()
        ping_thread.join()
        baseline = self._get_stats()
        print(f"  Baseline: P50={baseline['p50']:.1f}ms, P95={baseline['p95']:.1f}ms, Loss={baseline['loss']:.1f}%\n")

        print(f"[2/3] FLOOD phase -- running for {duration}s...")
        print(f"  >> START FLOODING NOW. Watch ESP32 serial monitor for failures.\n")
        self.start_time = time.time()
        self.ping_results = []
        self.latency_history = []
        self.running = True

        ping_thread = threading.Thread(target=self.ping_worker, args=(ping_host, duration))
        ping_thread.start()

        time.sleep(1)

        if target == "wan":
            if mode == "download":
                self.saturate_wan_download(duration, streams)
            elif mode == "upload":
                self.saturate_wan_upload(duration, streams)
            elif mode == "mixed":
                threads = [
                    threading.Thread(target=self.saturate_wan_download, args=(duration, streams // 2)),
                    threading.Thread(target=self.saturate_wan_upload, args=(duration, streams // 2)),
                ]
                for t in threads:
                    t.start()
                for t in threads:
                    t.join()
            elif mode == "tcp_flood":
                self.saturate_tcp_flood(duration, streams)
        elif target == "local":
            self.saturate_local_tcp(host, port, duration, streams)

        self.running = False
        ping_thread.join()
        flood_stats = self._get_stats()

        print(f"\n[3/3] Results\n")
        print(f"{'=' * 60}")
        print(f"  BASELINE (no congestion)")
        print(f"    P50 latency : {baseline['p50']:.1f}ms")
        print(f"    P95 latency : {baseline['p95']:.1f}ms")
        print(f"    Packet loss : {baseline['loss']:.1f}%")
        print(f"  FLOOD (congestion active)")
        print(f"    P50 latency : {flood_stats['p50']:.1f}ms  ({self._delta(baseline['p50'], flood_stats['p50']):+.0f}%)")
        print(f"    P95 latency : {flood_stats['p95']:.1f}ms  ({self._delta(baseline['p95'], flood_stats['p95']):+.0f}%)")
        print(f"    Packet loss : {flood_stats['loss']:.1f}%  ({self._delta(baseline['loss'], flood_stats['loss']):+.0f}pp)")
        print(f"{'=' * 60}\n")

        if flood_stats["loss"] > 10:
            print("  [!] HIGH packet loss detected. ESP32 will likely experience:")
            print("      - Failed HTTP uploads (check ESP32 retry logic)")
            print("      - Increased HTTP_TIMEOUT_MS usage")
            print("      - Potential gait data gaps in batch uploads")
        elif flood_stats["p95"] > 500:
            print("  [!] HIGH latency detected. ESP32 will likely experience:")
            print("      - Slow uploads, filling BATCH_SAMPLES buffer faster")
            print("      - Stale foot data warnings from ESP-NOW")
        else:
            print("  [+] Network handled the load. ESP32 should be resilient.")

        print(f"\n  ESP32 config recommendations:")
        print(f"    - HTTP_TIMEOUT_MS   : currently 15000ms (likely fine if P95 < 2000ms)")
        print(f"    - UPLOAD_RETRY_MS   : currently 5000ms (consider reducing to 3000ms)")
        print(f"    - BATCH_SAMPLES     : currently 60 (consider increasing to 120)")

        if self.latency_history and len(self.latency_history) > 1:
            try:
                self._save_chart()
            except Exception as e:
                print(f"\n  [!] Could not save chart: {e}")

    def saturate_tcp_flood(self, duration: float, streams: int):
        wan_hosts = [
            ("8.8.8.8", 53),
            ("1.1.1.1", 53),
            ("208.67.222.222", 443),
        ]
        threads = []
        per_target = max(1, streams // len(wan_hosts))
        for h, p in wan_hosts:
            t = threading.Thread(target=self.saturate_local_tcp, args=(h, p, duration, per_target))
            t.start()
            threads.append(t)
        for t in threads:
            t.join()

    def _get_stats(self):
        with self.ping_lock:
            latencies = [x for x in self.ping_results if x < 9999]
            timeouts = sum(1 for x in self.ping_results if x >= 9999)
        total = len(self.ping_results)
        loss = (timeouts / total * 100) if total > 0 else 0
        p50 = statistics.median(latencies) if latencies else 0
        lat_sorted = sorted(latencies) if latencies else [0]
        p95 = lat_sorted[int(len(lat_sorted) * 0.95)] if lat_sorted else 0
        return {"p50": p50, "p95": p95, "loss": loss}

    def _delta(self, before: float, after: float) -> float:
        if before == 0:
            return 0
        return ((after - before) / before) * 100

    def _save_chart(self):
        import numpy as np
        import matplotlib
        matplotlib.use('Agg')
        import matplotlib.pyplot as plt

        times = [h[0] for h in self.latency_history]
        lats = [h[1] if h[1] < 9999 else 2000 for h in self.latency_history]

        fig, ax = plt.subplots(figsize=(12, 5))
        ax.plot(times, lats, alpha=0.4, linewidth=0.8, color='blue', label='Ping latency (ms)')
        window = max(1, len(times) // 30)
        smoothed = np.convolve(lats, np.ones(window) / window, mode='valid')
        ax.plot(times[window - 1:], smoothed, color='red', linewidth=1.5, label=f'MA({window})')
        ax.set_xlabel("Time (s)")
        ax.set_ylabel("Latency (ms)")
        ax.set_title("WiFi Congestion Stress Test - Latency Over Time")
        ax.legend()
        ax.grid(True, alpha=0.3)
        ax.set_ylim(0, max(500, max(lats) * 1.1))

        save_path = os.path.join(os.path.dirname(__file__), "wifi_congestion_results.png")
        plt.savefig(save_path, dpi=150)
        print(f"\n  [+] Chart saved: {save_path}")


def main():
    parser = argparse.ArgumentParser(description="WiFi Congestion Stress Test for ESP32")
    parser.add_argument("--mode", default="download",
                        choices=["download", "upload", "mixed", "tcp_flood"],
                        help="Flood type (default: download)")
    parser.add_argument("--duration", type=float, default=30,
                        help="Flood duration in seconds (default: 30)")
    parser.add_argument("--streams", type=int, default=10,
                        help="Concurrent streams (default: 10)")
    parser.add_argument("--target", default="wan",
                        choices=["wan", "local"],
                        help="Target: wan (internet) or local (router)")
    parser.add_argument("--host", default="192.168.0.1",
                        help="Local target host (default: 192.168.0.1)")
    parser.add_argument("--ping", default="8.8.8.8",
                        help="Ping host (default: 8.8.8.8)")
    parser.add_argument("--baseline", type=float, default=5,
                        help="Baseline ping duration (default: 5)")

    args = parser.parse_args()
    test = CongestionTest()
    test.run(
        mode=args.mode,
        duration=args.duration,
        streams=args.streams,
        target=args.target,
        host=args.host,
        ping_host=args.ping,
        baseline_duration=args.baseline,
    )


if __name__ == "__main__":
    main()
