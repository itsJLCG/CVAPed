import os


def get_int_env(name, default):
    value = os.getenv(name)
    if value is None:
        return default
    try:
        return int(value)
    except ValueError:
        return default


bind = f"0.0.0.0:{os.getenv('PORT', '8080')}"
workers = max(1, get_int_env('GUNICORN_WORKERS', 2))
threads = max(1, get_int_env('GUNICORN_THREADS', 2))
timeout = get_int_env('GUNICORN_TIMEOUT', 0)
graceful_timeout = get_int_env('GUNICORN_GRACEFUL_TIMEOUT', 30)
keepalive = get_int_env('GUNICORN_KEEPALIVE', 65)
accesslog = '-'
errorlog = '-'
capture_output = True
preload_app = False
worker_tmp_dir = '/dev/shm' if os.path.exists('/dev/shm') else None
