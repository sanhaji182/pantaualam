# =============================================================================
# DOCKERFILE: CORE API GATEWAY (GOLANG)
# Teknik Multi-Stage Build: Menghasilkan binary sangat kecil (< 25 MB)
# =============================================================================

# --- TAHAP 1: BUILD STAGE (Kompilasi Binary) ---
FROM golang:1.22-alpine AS builder

WORKDIR /app

# Install git dan ca-certificates jika diperlukan dependensi luar
RUN apk add --no-cache git ca-certificates

# Copy file definisi modul Go
COPY go.mod go.sum* ./
RUN go mod download

# Copy seluruh source code Go
COPY . .

# Kompilasi binary statis (CGO_ENABLED=0 agar portabel di distro Linux mana pun)
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /gateway cmd/main.go

# --- TAHAP 2: PRODUCTION STAGE (Image Akhir Sangat Ringan) ---
FROM alpine:3.19

WORKDIR /root/

# Install sertifikat SSL agar bisa berkomunikasi via HTTPS ke luar
RUN apk --no-cache add ca-certificates tzdata

# Set zona waktu default ke WIB (Asia/Jakarta)
ENV TZ=Asia/Jakarta

# Copy binary yang sudah dikompilasi dari tahap builder
COPY --from=builder /gateway .

# Ekspos port 8080
EXPOSE 8080

# Menjalankan binary server
CMD ["./gateway"]
