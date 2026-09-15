# =============================================================================
# DOCKERFILE: INGESTION SERVICE (PYTHON)
# Image ringan berbasis Python 3.12 Alpine/Slim untuk efisiensi memori di VPS
# =============================================================================
FROM python:3.12-slim

# Menyetel direktori kerja di dalam container
WORKDIR /app

# Mencegah Python menulis file .pyc dan memastikan output log langsung tampil di konsol (unbuffered)
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

# Copy file daftar dependensi
COPY requirements.txt .

# Install dependensi tanpa cache agar ukuran image sekecil mungkin
RUN pip install --no-cache-dir -r requirements.txt

# Copy seluruh source code service ke dalam container
COPY . .

# Perintah menjalankan worker
CMD ["python", "-u", "src/main.py"]
