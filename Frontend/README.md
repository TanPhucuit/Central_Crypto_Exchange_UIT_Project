# Sàn Giao Dịch Crypto - Cryptocurrency Exchange Platform

## Mô tả dự án
Nền tảng sàn giao dịch tiền điện tử với đầy đủ các tính năng:
- Giao dịch P2P
- Giao dịch Spot
- Giao dịch Futures
- Quản lý ví và tài khoản
- Theo dõi thị trường

## Cấu trúc dự án

```
src/
├── components/          # Các component UI tái sử dụng
├── pages/              # Các trang chính
├── features/           # Redux slices
├── services/           # API services
├── hooks/              # Custom hooks
├── utils/              # Utilities
├── assets/             # Images, fonts, etc.
└── styles/             # Global styles
```

## Cài đặt

```bash
npm install
npm start
```

## Các tính năng chính

### Cho User:
- Đăng nhập/Đăng ký
- Quản lý tài khoản và ví
- Giao dịch P2P với Merchant
- Giao dịch Spot
- Giao dịch Futures
- Quản lý tài khoản ngân hàng
- Chuyển tiền nội bộ/crypto
- Xem biểu đồ và giá

### Cho Merchant:
- Đăng nhập
- Quản lý giao dịch P2P
- Quản lý nguồn vốn

## Tech Stack
- React 18
- React Router v6
- Redux Toolkit
- Styled Components
- Recharts (Biểu đồ)
- Socket.io (Real-time)
- Axios (API calls)
