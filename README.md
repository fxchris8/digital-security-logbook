# Digital Security Logbook

Digital Security Logbook adalah aplikasi pencatatan tamu berbasis web untuk security desk. Aplikasi ini menyediakan form registrasi tamu, upload foto identitas/selfie, pencatatan waktu masuk, QR checkout untuk mencatat waktu keluar, dan dashboard admin untuk melihat serta mengelola data logbook.

## Fitur Utama

- Registrasi tamu melalui halaman guest.
- Upload foto tanda pengenal/selfie ke storage backend.
- Generate QR checkout per kunjungan.
- Checkout tamu melalui scan QR.
- Dashboard logbook dengan pencarian dan pagination.
- Edit dan hapus data logbook.
- Penyimpanan data ke MySQL.

## Tech Stack

- Backend: Go 1.24, Gin, GORM, MySQL driver
- Frontend: Next.js, React, TypeScript, Tailwind CSS
- Database: MySQL/MariaDB
- Deployment: Docker, Docker Compose, Traefik

## Struktur Project

```text
digital-security-logbook/
├── backend/
│   ├── cmd/
│   │   ├── api/          # HTTP API server
│   │   ├── migrate/      # Migration binary
│   │   ├── seed-csv/     # Seeder CSV
│   │   ├── seed-cfit/    # Seeder tambahan
│   │   └── clear-data/   # Utility hapus data
│   ├── internal/
│   │   ├── config/       # Config, DB, Gin, bootstrap
│   │   ├── controllers/  # HTTP handlers
│   │   ├── models/       # Domain dan request/response models
│   │   ├── repositories/ # Query database
│   │   ├── routers/      # Route registration
│   │   └── services/     # Business logic
│   ├── storage/          # Upload storage lokal
│   ├── Dockerfile
│   └── go.mod
├── frontend/
│   ├── src/app/
│   │   ├── dashboard/    # Dashboard admin logbook
│   │   └── guest/        # Form registrasi tamu
│   ├── public/
│   ├── Dockerfile
│   ├── Dockerfile.prod
│   └── package.json
├── docker-compose.yml
├── docker-compose.prod.yml
└── README.md
```

## Prasyarat

Untuk development lokal:

- Go 1.24 atau lebih baru
- Node.js 20 atau lebih baru
- MySQL/MariaDB
- npm

Untuk deployment Docker:

- Docker
- Docker Compose
- Network Traefik eksternal bernama `traefik-net` jika memakai `docker-compose.prod.yml`

## Setup Lokal

### 1. Clone Repository

```bash
git clone <repository-url>
cd digital-security-logbook
```

### 2. Setup Database

Buat database MySQL:

```sql
CREATE DATABASE digital_logbook;
```

Pastikan user database memiliki akses ke database tersebut.

### 3. Setup Backend

```bash
cd backend
cp .env.example .env
```

Contoh konfigurasi `backend/.env`:

```env
ENV=development
WEB_PORT=8080
GIN_MODE=debug

DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=spil
DB_PASS=spil
DB_NAME=digital_logbook

JWT_SECRET_KEY=change-this-secret
BACKEND_PUBLIC_URL=http://localhost:8080
FRONTEND_URL=http://localhost:3000
APP_TIMEZONE=Asia/Jakarta

UPLOAD_DIR=storage/uploads
MAX_UPLOAD_SIZE=5242880
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

Install dependencies dan jalankan backend:

```bash
go mod download
go run cmd/api/main.go
```

Backend berjalan di:

```text
http://localhost:8080
```

Catatan: saat API start, aplikasi menjalankan bootstrap schema logbook melalui GORM. Jika memakai migration binary secara manual:

```bash
go run cmd/migrate/main.go
```

### 4. Setup Frontend

```bash
cd frontend
cp .env.example .env
npm install
```

Contoh konfigurasi `frontend/.env`:

```env
JWT_SECRET=change-this-secret
NEXT_PUBLIC_API_ENDPOINT=http://localhost:8080
NEXT_PUBLIC_BASE_PATH=
```

Jalankan frontend:

```bash
npm run dev
```

Frontend berjalan di:

```text
http://localhost:3000
```

## Endpoint Utama

Backend menyediakan endpoint berikut:

| Method | Endpoint | Keterangan |
| --- | --- | --- |
| GET | `/health` | Health check backend |
| GET | `/api/logbooks` | List logbook dengan pagination |
| POST | `/api/logbooks/upload-photo` | Upload foto tanda pengenal/selfie |
| POST | `/api/logbooks/generate-qr` | Buat data logbook dan QR checkout |
| GET | `/api/logbooks/checkout?token=...` | Checkout tamu dari QR |
| GET | `/api/logbooks/:id/qr` | Ambil ulang QR checkout |
| PUT | `/api/logbooks/:id` | Update data logbook |
| DELETE | `/api/logbooks/:id` | Hapus data logbook |

Contoh request list logbook:

```bash
curl "http://localhost:8080/api/logbooks?anchor_id=0&page=next&page_size=10"
```

## Field Database Logbook

Tabel utama aplikasi adalah `data_logbook`. Field yang dipakai dashboard/API antara lain:

- `tanggal`
- `waktu_masuk`
- `waktu_keluar`
- `nama`
- `alamat`
- `nomor_polisi_kendaraan`
- `foto_tanda_pengenal`
- `perusahaan`
- `janji_bertemu_dengan`
- `keperluan`

Jika database lama belum punya kolom nomor polisi kendaraan, tambahkan:

```sql
ALTER TABLE data_logbook
ADD COLUMN nomor_polisi_kendaraan LONGTEXT
AFTER alamat;
```

## Docker Development

File `docker-compose.yml` menyediakan MySQL, backend, dan frontend untuk development berbasis container. Jalankan dari root project:

```bash
docker compose up -d --build
```

Default service development:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8080`
- MySQL: `localhost:3306`
- Database default compose: `tds`
- User default compose: `tds_user`

Lihat logs:

```bash
docker compose logs -f
```

Stop service:

```bash
docker compose down
```

Hapus volume database development:

```bash
docker compose down -v
```

## Production Deployment

Production compose menggunakan `docker-compose.prod.yml` dengan container:

- `dsl_backend_prod`
- `dsl_frontend_prod`
- external network `traefik-net`
- Traefik route `/dsl-api` untuk backend
- Traefik route `/dsl` untuk frontend

Backend route `/dsl-api` memakai strip prefix agar Gin tetap menerima path `/api/...` dan `/uploads/...`. Frontend route `/dsl` tidak memakai strip prefix karena Next.js dibuild dengan `NEXT_PUBLIC_BASE_PATH=/dsl`.

### 1. Siapkan Network Traefik

Jika belum ada:

```bash
docker network create traefik-net
```

### 2. Siapkan File `.env` di Root Project

`docker-compose.prod.yml` membaca `.env` dari root project.

Contoh:

```env
DB_HOST=10.128.0.13
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your-db-password
DB_NAME=digital_logbook

JWT_SECRET=change-this-production-secret

BACKEND_PUBLIC_URL=https://px.spil.co.id/dsl-api
NEXT_PUBLIC_API_ENDPOINT=https://px.spil.co.id/dsl-api
NEXT_PUBLIC_BASE_PATH=/dsl
```

Penting:

- Untuk production compose, gunakan `DB_PASSWORD`, karena compose akan memetakannya ke `DB_PASS` di container backend.
- `JWT_SECRET` dipakai frontend dan dipetakan ke `JWT_SECRET_KEY` untuk backend.
- `NEXT_PUBLIC_API_ENDPOINT` harus menunjuk ke public API backend.
- `NEXT_PUBLIC_BASE_PATH=/dsl` jika frontend disajikan melalui path `/dsl`.

### 3. Build dan Jalankan

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### 4. Cek Status dan Logs

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f
```

### 5. Akses Production

Sesuai label Traefik bawaan:

- Frontend: `https://px.spil.co.id/dsl`
- Backend API: `https://px.spil.co.id/dsl-api`
- Health check: `https://px.spil.co.id/dsl-api/health`

### 6. Stop Production Service

```bash
docker compose -f docker-compose.prod.yml down
```

Catatan: backend container menunggu koneksi database lalu menjalankan API. Schema logbook dibootstrap oleh API saat startup.

## Perintah Development

Backend:

```bash
cd backend
go run cmd/api/main.go
go run cmd/migrate/main.go
go test ./...
go build -o api ./cmd/api
```

Frontend:

```bash
cd frontend
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck
npm run format
```

## Troubleshooting

### Dashboard menampilkan `-` untuk kolom baru

Pastikan:

- Kolom database sudah ada di database yang sama dengan `DB_HOST`, `DB_PORT`, dan `DB_NAME` backend.
- Backend sudah direstart setelah perubahan model/query.
- Respons API `/api/logbooks` sudah mengirim field JSON yang benar.
- Tidak ada transaksi MySQL lama yang belum `COMMIT`/`ROLLBACK`.

Contoh cek data:

```sql
SELECT id, nama, nomor_polisi_kendaraan
FROM data_logbook
WHERE id = 1;
```

### Backend tidak bisa connect database

Pastikan:

- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, dan `DB_NAME` benar.
- Database bisa diakses dari host/container backend.
- Firewall/security group mengizinkan koneksi ke MySQL.

### Foto upload tidak muncul

Pastikan:

- `UPLOAD_DIR` backend benar.
- Volume `/app/storage` terpasang di Docker production.
- `BACKEND_PUBLIC_URL` mengarah ke URL backend publik.
- Route `/uploads/...` dapat diakses dari browser.

### Frontend tidak bisa fetch API

Pastikan:

- `NEXT_PUBLIC_API_ENDPOINT` benar saat build frontend.
- Backend health check OK.
- Jika deploy di subpath, `NEXT_PUBLIC_BASE_PATH` sudah sesuai.
- CORS backend mengizinkan origin frontend.

### Production build gagal

Cek logs:

```bash
docker compose -f docker-compose.prod.yml logs dsl_backend
docker compose -f docker-compose.prod.yml logs dsl_frontend
```

Build ulang tanpa cache:

```bash
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d
```

## Catatan Keamanan

- Jangan commit file `.env` yang berisi secret.
- Gunakan `JWT_SECRET`/`JWT_SECRET_KEY` yang kuat di production.
- Batasi akses MySQL hanya dari host/container yang diperlukan.
- Backup database dan volume upload secara berkala.

## License

Internal project.
