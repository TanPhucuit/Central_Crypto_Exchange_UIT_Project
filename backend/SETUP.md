# Hướng dẫn Cài đặt và Chạy Backend

## 1. Cài đặt PHP (nếu chưa có)

### Windows:
1. Download PHP từ: https://windows.php.net/download/
2. Giải nén vào `C:\php`
3. Thêm `C:\php` vào PATH
4. Copy `php.ini-development` thành `php.ini`
5. Bật các extension cần thiết trong `php.ini`:
   ```ini
   extension=pdo_mysql
   extension=openssl
   extension=mbstring
   extension=curl
   ```

### Hoặc dùng XAMPP/Laragon:
- Download XAMPP: https://www.apachefriends.org/
- Hoặc Laragon: https://laragon.org/

## 2. Cài đặt Composer

Download từ: https://getcomposer.org/download/

## 3. Cài đặt Dependencies

```bash
cd d:\HK5\Web\CryptoExchange\backend
composer install
```

## 4. Test Kết nối Database

```bash
php test-connection.php
```

Nếu kết nối thành công, bạn sẽ thấy:
```
✓ Connection successful!
✓ Query successful!
Database Info:
- Version: 8.0.x-TiDB-v...
- Database: crypto_exchange
```

## 5. Import Database Schema

```bash
# Kết nối vào TiDB và chạy file schema.sql
mysql -h gateway01.ap-southeast-1.prod.aws.tidbcloud.com \
      -P 4000 \
      -u 4GXQNpQMpv6LcyF.root \
      -p \
      crypto_exchange < database/schema.sql
```

Hoặc dùng MySQL Workbench/DBeaver để import file `database/schema.sql`

## 6. Chạy Server

```bash
# Development server
composer start

# Hoặc
php -S localhost:8000 -t public
```

## 7. Test API

### Health Check
```bash
curl http://localhost:8000/api/health
```

### Database Check
```bash
curl http://localhost:8000/api/health/database
```

### Register User
```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "full_name": "Test User"
  }'
```

### Login
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

## 8. Cấu trúc Project

```
backend/
├── public/
│   └── index.php          # Entry point
├── src/
│   ├── Controllers/       # API Controllers
│   ├── Models/           # Database Models
│   ├── Middleware/       # Middleware (Auth, CORS)
│   ├── Routes/           # Route definitions
│   └── Helpers/          # Helper classes
├── config/               # Configuration files
├── database/
│   └── schema.sql        # Database schema
├── composer.json
├── .env                  # Environment variables
└── test-connection.php   # Database test script
```

## 9. API Endpoints

### Public Endpoints
- `POST /api/auth/register` - Đăng ký
- `POST /api/auth/login` - Đăng nhập
- `GET /api/health` - Health check
- `GET /api/health/database` - Database check

### Protected Endpoints (cần JWT token)
- `GET /api/auth/me` - Thông tin user
- `GET /api/wallet` - Danh sách ví
- `GET /api/wallet/{currency}` - Số dư theo currency
- `POST /api/wallet` - Tạo ví mới

## 10. Deploy lên Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd d:\HK5\Web\CryptoExchange\backend
vercel
```

## Lưu ý

- File `.env` chứa thông tin nhạy cảm, không commit lên git
- Đổi `JWT_SECRET` trong `.env` trước khi deploy production
- TiDB yêu cầu SSL, đã cấu hình sẵn trong code
