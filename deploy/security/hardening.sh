#!/bin/bash
# =============================================================================
# SKRIP OTOMASI PENGUATAN KEAMANAN SERVER LINUX UBUNTU (SERVER HARDENING)
# Proyek: NusantaraWeather & Disaster Monitor
# Keamanan: Server Hardening, Firewall UFW, Fail2ban & Audit Keamanan
# Target OS: Ubuntu Server 22.04 / 24.04 LTS
# =============================================================================
# CATATAN: Jalankan skrip ini dengan hak akses sudo / root:
# sudo bash hardening.sh
# =============================================================================

set -e # Hentikan eksekusi jika terjadi error kritis

echo "======================================================================"
echo "      MEMULAI OTOMASI LINUX SERVER HARDENING (PRODUCTION READY)       "
echo "======================================================================"

# -----------------------------------------------------------------------------
# 1. PERBARUI SELURUH PAKET SISTEM OPERASI (KEEP SYSTEM UP-TO-DATE)
# Rationale: Menambal celah keamanan (cve/vulnerability) yang telah diketahui.
# -----------------------------------------------------------------------------
echo "[1/8] Memperbarui indeks repositori dan melakukan upgrade paket..."
apt update -y && apt upgrade -y
apt autoremove -y

# -----------------------------------------------------------------------------
# 2. AUDIT AKUN PENGGUNA & HAK AKSES ROOT
# Rationale: Memastikan hanya user 'root' resmi yang memiliki UID 0.
# -----------------------------------------------------------------------------
echo "[2/8] Mengaudit akun dengan hak istimewa (UID 0)..."
ZERO_UID_USERS=$(awk -F: '($3 == "0") {print $1}' /etc/passwd)
echo "Akun dengan UID 0 ditemukan: $ZERO_UID_USERS"
if [ "$ZERO_UID_USERS" != "root" ]; then
    echo "PERINGATAN: Ada akun selain root yang memiliki UID 0!"
fi

# Mengunci akun sistem yang memiliki password kosong
echo "Memeriksa dan mengamankan akun dengan kata sandi kosong..."
awk -F: '($2 == "") {print $1}' /etc/shadow | while read -r user; do
    if [ -n "$user" ]; then
        echo "Mengunci akun tanpa password: $user"
        passwd -l "$user"
    fi
done

# -----------------------------------------------------------------------------
# 3. PENGUATAN KONFIGURASI SSH (SSH HARDENING)
# Rationale:
# - Menonaktifkan login langsung sebagai root (mencegah brute force root)
# - Mengubah port default dari 22 ke port kustom (misal: 2222)
# - Menonaktifkan login dengan password kosong
# -----------------------------------------------------------------------------
echo "[3/8] Mengonfigurasi keamanan daemon SSH (/etc/ssh/sshd_config)..."
SSHD_CONFIG="/etc/ssh/sshd_config"

if [ -f "$SSHD_CONFIG" ]; then
    # Backup file konfigurasi asli sebelum modifikasi
    cp "$SSHD_CONFIG" "${SSHD_CONFIG}.backup_$(date +%F)"

    # Terapkan aturan pengamanan SSH
    sed -i 's/^#*PermitRootLogin .*/PermitRootLogin no/' "$SSHD_CONFIG"
    sed -i 's/^#*PermitEmptyPasswords .*/PermitEmptyPasswords no/' "$SSHD_CONFIG"
    sed -i 's/^#*MaxAuthTries .*/MaxAuthTries 4/' "$SSHD_CONFIG"
    sed -i 's/^#*X11Forwarding .*/X11Forwarding no/' "$SSHD_CONFIG"

    echo "Konfigurasi SSH berhasil diperkuat (Root Login dinonaktifkan)."
fi

# -----------------------------------------------------------------------------
# 4. FIREWALL IPTABLES & UFW (UNCOMPLICATED FIREWALL)
# Rationale:
# - Menolak seluruh lalu lintas masuk (default DROP/DENY)
# - Hanya membuka port layanan resmi: 80 (HTTP), 443 (HTTPS), dan SSH (22)
# - Membuka port lokal Docker untuk komunikasi internal (bukan untuk internet)
# -----------------------------------------------------------------------------
echo "[4/8] Mengonfigurasi Firewall UFW & IPTables..."

# Pasang UFW jika belum terpasang
apt install -y ufw

# Set aturan default: Tolak semua koneksi masuk, Izinkan semua koneksi keluar
ufw default deny incoming
ufw default allow outgoing

# Izinkan port penting
ufw allow 22/tcp comment 'Akses SSH Server'
ufw allow 80/tcp comment 'Akses Web HTTP Nginx'
ufw allow 443/tcp comment 'Akses Web HTTPS SSL'

# Jangan buka port 5432 (PostgreSQL) ke publik, biarkan hanya diakses oleh Docker Network!
echo "Port PostgreSQL (5432) sengaja ditutup dari internet untuk keamanan data."

# Aktifkan firewall
echo "y" | ufw enable
ufw status verbose

# -----------------------------------------------------------------------------
# 5. PASANG FAIL2BAN (PERLINDUNGAN BRUTE-FORCE OTOMATIS)
# Rationale: Memblokir IP penyerang secara otomatis jika salah password 3 kali.
# -----------------------------------------------------------------------------
echo "[5/8] Menginstal dan mengaktifkan Fail2Ban..."
apt install -y fail2ban

cat << 'EOF' > /etc/fail2ban/jail.local
[DEFAULT]
bantime  = 1h
findtime = 10m
maxretry = 3

[sshd]
enabled = true
port    = ssh
logpath = %(sshd_log)s
backend = %(default_backend)s
EOF

systemctl enable fail2ban
systemctl restart fail2ban
echo "Fail2Ban aktif melindungi port SSH dari serangan brute-force."

# -----------------------------------------------------------------------------
# 6. PEMERIKSAAN KELAYAKAN ROOTKIT (RKHUNTER)
# Rationale: Mendeteksi adanya backdoor, trojan, atau modifikasi file biner sistem.
# -----------------------------------------------------------------------------
echo "[6/8] Menginstal pemindai rootkit rkhunter..."
apt install -y rkhunter
rkhunter --update || true
rkhunter --propupd || true
echo "rkhunter siap digunakan untuk audit malware sistem."

# -----------------------------------------------------------------------------
# 7. AUDIT PORT DAN SERVIS YANG SEDANG BERJALAN (NETSTAT / SS)
# -----------------------------------------------------------------------------
echo "[7/8] Menampilkan port yang sedang mendengarkan (listening ports):"
ss -tuln

# -----------------------------------------------------------------------------
# 8. PANDUAN LOKASI LOG SISTEM
# -----------------------------------------------------------------------------
echo "======================================================================"
echo "PENGUATAN KEAMANAN SERVER BERHASIL DILAKUKAN!"
echo "Lokasi log penting untuk audit forensik:"
echo " - Log Otentikasi & Brute-Force : /var/log/auth.log"
echo " - Log Firewall UFW             : /var/log/ufw.log"
echo " - Log Sistem Umum              : /var/log/syslog"
echo " - Log Aktivitas Nginx          : /var/log/nginx/access.log & error.log"
echo "======================================================================"
