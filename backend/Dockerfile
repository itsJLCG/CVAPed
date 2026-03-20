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

RUN python -c "import frozendict, os; path = os.path.join(os.path.dirname(frozendict.__file__), '__init__.py'); \
    content = open(path).read(); \
    if 'collections.Mapping' in content: \
        content = content.replace('import collections\n', 'import collections\nimport collections.abc\n').replace('collections.Mapping', 'collections.abc.Mapping'); \
        open(path, 'w').write(content); \
        print('frozendict patched for Python 3.10')"

COPY . .

EXPOSE 8080

CMD ["gunicorn", "--config", "gunicorn.conf.py", "app:app"]
