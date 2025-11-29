# CEXORA - Crypto Exchange Frontend

Frontend cho nền tảng giao dịch crypto được xây dựng với React.js, Redux Toolkit, và kết nối với backend PHP.

## 🚀 Cài đặt và chạy

### 1. Cài đặt dependencies

```bash
npm install
```

### 2. Cấu hình môi trường

Copy file `.env.example` thành `.env` và cập nhật các giá trị:

```bash
cp .env.example .env
```

Trong file `.env`:
```env
REACT_APP_API_URL=http://localhost:8000/api
REACT_APP_WS_URL=ws://localhost:8000
```

### 3. Chạy development server

```bash
npm start
```

Ứng dụng sẽ chạy tại: http://localhost:3000

### 4. Build cho production

```bash
npm run build
```

## 📁 Cấu trúc thư mục

```
src/
├── components/        # Các components tái sử dụng
│   ├── Header/
│   ├── Sidebar/
│   ├── Layout/
│   └── LivePriceChart/
├── features/         # Redux slices
│   ├── auth/        # Authentication state
│   ├── wallet/      # Wallet state
│   ├── market/      # Market data state
│   └── trading/     # Trading state
├── pages/           # Page components
│   ├── Auth/       # Login, Register
│   ├── Dashboard/  # Dashboard
│   ├── Wallet/     # Wallet management
│   ├── Trading/    # Spot, Futures, P2P
│   ├── Profile/    # User profile
│   └── BankAccount/# Bank accounts
├── services/       # API services
│   ├── api.js      # Backend API client
│   ├── binanceAPI.js
│   └── cryptoWebSocket.js
├── hooks/          # Custom hooks
│   └── useAuth.js  # Authentication hook
├── store/          # Redux store
└── App.js          # Main app component
```

## 🔌 API Integration

Frontend kết nối với backend PHP qua REST API. Các endpoints chính:

### Authentication
- POST `/api/auth/register` - Đăng ký
- POST `/api/auth/login` - Đăng nhập
- GET `/api/auth/me?user_id={id}` - Lấy thông tin user

### Wallet
- GET `/api/wallet?user_id={id}` - Danh sách ví
- POST `/api/wallet` - Tạo ví mới
- GET `/api/wallet/{id}/properties?user_id={id}` - Chi tiết ví với holdings

### Trading
- GET `/api/trading/spot/{walletId}/history?user_id={id}` - Lịch sử giao dịch
- POST `/api/trading/spot/buy` - Mua spot
- POST `/api/trading/spot/sell` - Bán spot

### P2P
- GET `/api/p2p/orders` - Danh sách orders
- POST `/api/p2p/orders` - Tạo order mới

### Bank Account
- GET `/api/bank?user_id={id}` - Danh sách tài khoản ngân hàng
- POST `/api/bank` - Tạo tài khoản mới

## 🔐 Authentication Flow

1. User đăng nhập qua `/login`
2. Backend trả về `user_id` và thông tin user
3. Frontend lưu `user_id` vào localStorage và Redux
4. Mọi API calls đều gửi kèm `user_id` (không dùng JWT)
5. Khi logout, xóa user data từ localStorage

### Sử dụng useAuth hook

```javascript
import useAuth from '../hooks/useAuth';

const MyComponent = () => {
  const { user, userId, isAuthenticated, isMerchant } = useAuth();
  
  // userId sẵn sàng để gọi API
  const loadData = async () => {
    const response = await walletAPI.getWallets(userId);
  };
};
```

## 🎨 Styling

- CSS Modules cho từng component
- Responsive design
- Binance-inspired UI
- Dark theme

## 📦 Dependencies chính

- **react** ^18.2.0
- **react-redux** ^9.0.4
- **@reduxjs/toolkit** ^2.0.1
- **react-router-dom** ^6.20.0
- **axios** ^1.6.2
- **recharts** ^2.10.3 - Charts
- **formik** ^2.4.5 - Forms
- **yup** ^1.3.3 - Validation
- **react-icons** ^5.0.0 - Icons
- **socket.io-client** ^4.6.0 - WebSocket

## 🚀 Deployment lên Vercel

### 1. Chuẩn bị

Đảm bảo file `.env.production` có URL backend production:

```env
REACT_APP_API_URL=https://your-backend.vercel.app/api
```

### 2. Deploy

```bash
# Cài Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel
```

### 3. Cấu hình Environment Variables trên Vercel

Trong Vercel Dashboard:
1. Settings → Environment Variables
2. Thêm `REACT_APP_API_URL` = URL backend của bạn
3. Redeploy

## 🔧 Development Tips

### Hot Reload
Frontend tự động reload khi code thay đổi

### API Debugging
Mở Chrome DevTools → Network tab để xem API calls

### Redux DevTools
Cài extension Redux DevTools để debug state

## 📝 Tính năng

✅ Đăng nhập / Đăng ký (kết nối backend)  
✅ Dashboard với tổng quan tài khoản  
✅ Load wallet data từ backend  
✅ Live price chart từ Binance API  
✅ Spot trading (UI)  
✅ Futures trading (UI)  
✅ P2P trading (UI)  
✅ Profile management  
✅ Bank account management  
✅ Transaction history  

## ⚠️ Lưu ý

- Backend phải chạy trước khi start frontend
- Không sử dụng JWT authentication (simplified cho development)
- WebSocket cho real-time updates (coming soon)

## 🐛 Troubleshooting

### CORS Error
Đảm bảo backend có CORS middleware được cấu hình đúng với origin của frontend.

### API Connection Failed
- Kiểm tra backend đang chạy: http://localhost:8000/api/health
- Verify REACT_APP_API_URL trong `.env`

### Build Error
```bash
# Clear cache và rebuild
rm -rf node_modules package-lock.json
npm install
npm start
```

## 📞 Support

Nếu gặp vấn đề, check:
1. Console logs trong browser
2. Network tab cho API errors
3. Backend logs
