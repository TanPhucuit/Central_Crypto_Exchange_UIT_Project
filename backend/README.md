# Crypto Exchange Backend API

Backend API cho hệ thống giao dịch Crypto Exchange sử dụng Slim Framework và TiDB.

## Cài đặt

```bash
# Cài đặt dependencies
composer install

# Copy file môi trường
cp .env.example .env

# Chỉnh sửa .env với thông tin TiDB của bạn
```

## Chạy ứng dụng

```bash
# Development server
composer start

# Hoặc
php -S localhost:8000 -t public
```

## API Endpoints

### Health Check
- `GET /api/health` - Kiểm tra trạng thái API
- `GET /api/health/database` - Kiểm tra kết nối database

### Authentication
- `POST /api/auth/register` - Đăng ký tài khoản
- `POST /api/auth/login` - Đăng nhập
- `GET /api/auth/me` - Lấy thông tin user (yêu cầu token)

### Wallet
- `GET /api/wallet` - Lấy danh sách ví (yêu cầu token)
- `GET /api/wallet/{currency}` - Lấy số dư theo currency (yêu cầu token)
- `POST /api/wallet` - Tạo ví mới (yêu cầu token)

## Cấu trúc thư mục

```
backend/
├── public/              # Entry point
│   └── index.php
├── src/
│   ├── Controllers/     # Controllers xử lý logic
│   ├── Models/          # Models tương tác database
│   ├── Middleware/      # Middleware (Auth, CORS)
│   ├── Routes/          # Định nghĩa routes
│   └── Helpers/         # Helper functions
├── config/              # Configuration files
├── composer.json
└── .env
```

## Deploy lên Vercel

Tạo file `vercel.json`:

```json
{
  "functions": {
    "api/*.php": {
      "runtime": "vercel-php@0.6.0"
    }
  },
  "routes": [
    { "src": "/(.*)", "dest": "/api/index.php" }
  ]
}
```

## License

MIT
