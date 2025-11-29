# Crypto Exchange Backend - Vercel Deployment Guide

## 📋 Yêu cầu trước khi deploy

1. Tài khoản Vercel (https://vercel.com)
2. TiDB Cloud database đang hoạt động
3. Git repository (GitHub, GitLab, hoặc Bitbucket)

## 🚀 Các bước deploy lên Vercel

### Bước 1: Chuẩn bị môi trường variables

Tạo environment variables sau trong Vercel Dashboard:

```
DB_HOST=gateway01.ap-southeast-1.prod.aws.tidbcloud.com
DB_PORT=4000
DB_NAME=crypto_exchange_2
DB_USERNAME=4GXQNpQMpv6LcyF.root
DB_PASSWORD=12345678
DB_SSL_CA=isrgrootx1.pem

CORS_ORIGIN=https://your-frontend-domain.vercel.app

APP_ENV=production
APP_DEBUG=false
```

### Bước 2: Deploy Backend

#### Option 1: Deploy qua Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
cd backend
vercel
```

#### Option 2: Deploy qua Vercel Dashboard

1. Đăng nhập vào https://vercel.com
2. Click "Add New Project"
3. Import repository của bạn
4. Chọn thư mục `backend` làm Root Directory
5. Thêm Environment Variables như trên
6. Click "Deploy"

### Bước 3: Cấu hình CORS

Sau khi deploy backend, copy URL của backend API (ví dụ: `https://crypto-backend.vercel.app`)

Cập nhật `CORS_ORIGIN` trong Environment Variables:
```
CORS_ORIGIN=https://your-frontend-domain.vercel.app
```

### Bước 4: Deploy Frontend

1. Cập nhật API endpoint trong Frontend:
   ```javascript
   const API_URL = 'https://crypto-backend.vercel.app/api';
   ```

2. Deploy Frontend lên Vercel:
   ```bash
   cd frontend
   vercel
   ```

3. Sau khi có URL frontend, quay lại cập nhật `CORS_ORIGIN` của backend

## 📝 API Endpoints

Tất cả endpoints đều bắt đầu với `/api`:

### Authentication
- `POST /api/auth/register` - Đăng ký user mới
- `POST /api/auth/login` - Đăng nhập
- `GET /api/auth/me?user_id={id}` - Lấy thông tin user

### User Profile
- `GET /api/user/profile?user_id={id}` - Lấy profile
- `PUT /api/user/profile` - Cập nhật profile (body: {user_id, ...})
- `POST /api/user/change-password` - Đổi mật khẩu (body: {user_id, old_password, new_password})

### Wallets
- `GET /api/wallet?user_id={id}` - Lấy danh sách ví
- `POST /api/wallet` - Tạo ví mới (body: {user_id, type})
- `GET /api/wallet/type/{type}?user_id={id}` - Lấy ví theo loại
- `GET /api/wallet/{id}/properties?user_id={id}` - Lấy ví với properties

### Trading
- `GET /api/trading/spot/{walletId}/history?user_id={id}` - Lịch sử giao dịch spot
- `POST /api/trading/spot/buy` - Mua spot (body: {user_id, wallet_id, symbol, unit_numbers, index_price})
- `POST /api/trading/spot/sell` - Bán spot (body: {user_id, wallet_id, symbol, unit_numbers, index_price})

### P2P Orders
- `GET /api/p2p/orders` - Danh sách orders công khai
- `GET /api/p2p/my-orders?user_id={id}` - Orders của user
- `POST /api/p2p/orders` - Tạo order mới (body: {user_id, type, unit_numbers, ...})
- `PUT /api/p2p/orders/{id}` - Cập nhật order

### Bank Accounts
- `GET /api/bank?user_id={id}` - Danh sách tài khoản ngân hàng
- `POST /api/bank` - Tạo tài khoản mới (body: {user_id, account_number, bank_name, ...})
- `DELETE /api/bank/{accountNumber}?user_id={id}` - Xóa tài khoản

### Health Check
- `GET /api/health` - Kiểm tra API status
- `GET /api/health/database` - Kiểm tra database connection

## 🔧 Troubleshooting

### Lỗi SSL Certificate
Đảm bảo file `isrgrootx1.pem` có trong thư mục backend khi deploy.

### Lỗi CORS
Kiểm tra `CORS_ORIGIN` trong Environment Variables phải khớp với domain frontend.

### Lỗi Database Connection
Verify TiDB credentials và SSL configuration trong Environment Variables.

## 📦 Dependencies

PHP packages được quản lý bởi Composer:
- slim/slim ^4.12
- slim/psr7 ^1.6
- vlucas/phpdotenv ^5.6
- php-di/php-di ^7.0

## 🔒 Bảo mật

⚠️ **LƯU Ý**: Project này KHÔNG sử dụng JWT authentication để đơn giản hóa. 
Trong production thực tế, bạn nên:
- Thêm authentication middleware
- Implement rate limiting
- Validate và sanitize inputs
- Sử dụng HTTPS cho tất cả requests

## 📞 Support

Nếu gặp vấn đề khi deploy, check:
1. Vercel deployment logs
2. TiDB connection status
3. Environment variables configuration
