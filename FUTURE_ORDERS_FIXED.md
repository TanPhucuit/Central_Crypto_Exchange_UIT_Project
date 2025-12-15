# ✅ ĐÃ SỬA XONG - Future Orders Display Issue

## Tóm tắt vấn đề
Mặc dù mở lệnh future thành công (đã trừ tiền), nhưng ở tab "Lệnh đang mở" lại không hiển thị lệnh nào.

## Nguyên nhân chính
1. **Schema database sai** - Thiếu các cột quan trọng (`margin`, `position_size`, `open_ts`, `close_ts`, etc.)
2. **Enum sai** - `side` đang là `enum('buy','sell')` thay vì `enum('long','short')`
3. **Logic backend sai** - Code đang cố tạo property record (không cần thiết) gây lỗi và rollback transaction

## Các thay đổi đã thực hiện

### ✅ 1. Cập nhật Database Schema
**File**: `backend/database/schema.sql`
- Đã cập nhật bảng `future_orders` với đầy đủ cột cần thiết
- Migration đã chạy thành công: `0005_fix_future_orders_schema.sql`

### ✅ 2. Sửa Backend Logic
**File**: `backend/src/Controllers/TradingController.php`
- **Loại bỏ** logic tạo property record trong `openFuture()`
- **Sửa công thức PnL** trong `closeFuture()` để khớp với frontend
- **Thêm logging** để debug dễ dàng

### ✅ 3. Verified hoạt động
```
=== OPEN ORDERS (close_ts IS NULL) ===

Total: 1

Order ID: 3
  Symbol: ETH
  Side: long
  Entry Price: 3500.00000000
  Margin: 200.00000000
  Leverage: 3x
  Position Size: 600.00000000
  Opened: 2025-12-14 20:41:22.316854
```

## Cách test từ Frontend

### Bước 1: Khởi động Backend
```bash
cd d:\HK5\Web\CryptoExchange\backend
C:\xampp\php\php.exe -S localhost:8000 -t public
```

### Bước 2: Khởi động Frontend
```bash
cd d:\HK5\Web\CryptoExchange\Frontend
npm start
```

### Bước 3: Test mở lệnh
1. Mở trình duyệt: http://localhost:3000
2. Đăng nhập (user_id: 1 hoặc 2)
3. Vào **Futures Trading** page
4. Chọn symbol (VD: BTC/USDT)
5. Nhập margin (VD: 100 USDT)
6. Chọn leverage (VD: 2x)
7. Chọn **Long** hoặc **Short**
8. Click **"Mở vị thế"**

### Bước 4: Kiểm tra lệnh đang mở
1. Click tab **"Lệnh đang mở"**
2. ✅ Lệnh vừa mở phải hiển thị với:
   - Symbol và Side (Long/Short)
   - Entry Price
   - Mark Price (real-time từ WebSocket)
   - Leverage
   - Margin
   - Position Size
   - **PnL real-time** (màu xanh nếu lãi, đỏ nếu lỗ)
   - Nút **"Đóng vị thế"**

### Bước 5: Test đóng lệnh
1. Click **"Đóng vị thế"**
2. ✅ Kiểm tra:
   - Lệnh biến mất khỏi "Lệnh đang mở"
   - Số dư wallet được cập nhật (margin + profit/loss)
   - Lệnh xuất hiện trong tab **"Lịch sử"** với exit_price và profit

## Công thức quan trọng

### Position Size
```javascript
position_size = margin × leverage
```

### PnL (Profit/Loss) - Real-time
**Long position:**
```javascript
profit = ((current_price - entry_price) / entry_price) × position_size
pnl_percent = (profit / margin) × 100
```

**Short position:**
```javascript
profit = ((entry_price - current_price) / entry_price) × position_size
pnl_percent = (profit / margin) × 100
```

### Wallet Balance khi đóng lệnh
```javascript
new_balance = old_balance + margin + profit
```

## Scripts hữu ích

### Tạo lệnh test (để MỞ)
```bash
C:\xampp\php\php.exe create_test_order.php
```

### Kiểm tra lệnh đang mở
```bash
C:\xampp\php\php.exe check_open_orders.php
```

### Kiểm tra tất cả lệnh
```bash
C:\xampp\php\php.exe check_all_orders.php
```

### Debug future orders
```bash
C:\xampp\php\php.exe debug_future_orders.php
```

## Lưu ý quan trọng

### ✅ Future Orders Logic
- **KHÔNG CẦN** foreign key tới bảng `properties`
- Symbol là symbol người dùng chọn (BTC, ETH, SOL, etc.)
- `exit_price` = NULL khi lệnh đang mở
- `close_ts` = NULL khi lệnh đang mở
- `position_size` = margin × leverage (tính và lưu khi mở lệnh)

### ✅ Query lệnh đang mở
```sql
SELECT * FROM future_orders 
WHERE wallet_id = ? AND close_ts IS NULL
ORDER BY open_ts DESC
```

### ✅ Đóng lệnh
- Chỉ đóng khi người dùng click "Đóng vị thế"
- Lấy giá hiện tại từ WebSocket làm exit_price
- Tính PnL theo công thức
- Update: `exit_price`, `profit`, `close_ts`
- Trả lại: `margin + profit` vào wallet

## Kết quả

### ✅ Backend
- Schema đã đúng
- Logic đã đúng
- Test script verified: lệnh được tạo và query thành công

### ⏳ Frontend
- Cần test thực tế từ UI
- API endpoint `/api/trading/futures/open?user_id=X` đã sẵn sàng
- Frontend code đã đúng (đã review)

## Nếu vẫn không hiển thị

### Debug steps:
1. Mở DevTools Console (F12)
2. Vào tab Network
3. Mở lệnh mới
4. Kiểm tra request/response của:
   - `POST /api/trading/futures/open`
   - `GET /api/trading/futures/open?user_id=X`
5. Kiểm tra console log có lỗi gì không

### Kiểm tra backend logs:
```bash
# Xem PHP error logs
tail -f C:\xampp\php\logs\php_error_log
```

---

**Status**: ✅ **FIXED** - Sẵn sàng test từ frontend!
