FROM python:3.10-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PORT=8080

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    ffmpeg \
    libgomp1 \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./

RUN python -m pip install --upgrade pip \
    && pip install -r requirements.txt

COPY . .

RUN chmod +x /app/startup.sh /app/startup.py

EXPOSE 8080

CMD ["python", "/app/startup.py", "gunicorn", "--config", "gunicorn.conf.py", "app:app"]
