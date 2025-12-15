# Sửa lỗi Future Orders - Lệnh không hiển thị

## Vấn đề
Mặc dù mở lệnh future thành công (đã trừ tiền), nhưng ở tab "Lệnh đang mở" lại không hiển thị lệnh nào.

## Nguyên nhân
1. **Schema không khớp**: Bảng `future_orders` trong database thiếu các cột quan trọng như `margin`, `position_size`, `profit`, `open_ts`, `close_ts`, `exit_price`
2. **Enum sai**: Cột `side` đang là `enum('buy','sell')` thay vì `enum('long','short')`
3. **Logic sai**: Code đang cố tạo property record trước khi tạo future order, gây lỗi và rollback transaction
4. **Công thức PnL sai**: Công thức tính lợi nhuận không khớp giữa backend và frontend

## Giải pháp đã thực hiện

### 1. Cập nhật Database Schema
**File**: `backend/database/schema.sql`
- Thêm các cột: `margin`, `position_size`, `profit`, `exit_price`, `open_ts`, `close_ts`
- Sửa `side` từ `enum('buy','sell')` thành `enum('long','short')`
- Thêm indexes cho performance: `idx_wallet_id`, `idx_symbol`, `idx_close_ts`

**Migration**: `backend/database/migrations/0005_fix_future_orders_schema.sql`
```sql
CREATE TABLE `future_orders` (
  `future_order_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `wallet_id` bigint(20) unsigned NOT NULL,
  `symbol` varchar(20) NOT NULL,
  `side` enum('long','short') NOT NULL DEFAULT 'long',
  `entry_price` decimal(28,8) NOT NULL DEFAULT 0,
  `exit_price` decimal(28,8) DEFAULT NULL,
  `position_size` decimal(28,8) NOT NULL DEFAULT 0,
  `margin` decimal(28,8) NOT NULL DEFAULT 0,
  `leverage` int(11) NOT NULL DEFAULT 1,
  `profit` decimal(28,8) DEFAULT NULL,
  `open_ts` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `close_ts` timestamp(6) NULL DEFAULT NULL,
  PRIMARY KEY (`future_order_id`),
  KEY `idx_wallet_id` (`wallet_id`),
  KEY `idx_symbol` (`symbol`),
  KEY `idx_close_ts` (`close_ts`),
  CONSTRAINT `fk_future_wallet` FOREIGN KEY (`wallet_id`) REFERENCES `wallets` (`wallet_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 2. Sửa Backend Logic
**File**: `backend/src/Controllers/TradingController.php`

#### Thay đổi trong `openFuture()`:
- ✅ **Loại bỏ** logic tạo property record (không cần thiết cho futures)
- ✅ **Thêm logging** để debug dễ dàng hơn
- ✅ **Đơn giản hóa** transaction: chỉ trừ tiền và tạo order

#### Thay đổi trong `closeFuture()`:
- ✅ **Sửa công thức PnL** để khớp với frontend:
  - **Long**: `profit = ((exitPrice - entryPrice) / entryPrice) * positionSize`
  - **Short**: `profit = ((entryPrice - exitPrice) / entryPrice) * positionSize`

### 3. Model đã đúng
**File**: `backend/src/Models/FutureOrder.php`
- ✅ `getOpenOrders()`: Query `WHERE close_ts IS NULL` - đúng
- ✅ `create()`: Dynamic insert dựa trên schema - đúng
- ✅ `close()`: Update `exit_price`, `profit`, `close_ts` - đúng

## Cách test

### 1. Chạy migration (ĐÃ HOÀN THÀNH)
```bash
C:\xampp\php\php.exe run_future_migration.php
```
✅ Migration đã chạy thành công

### 2. Kiểm tra schema
```bash
C:\xampp\php\php.exe debug_future_orders.php
```

### 3. Test mở lệnh mới
1. Mở frontend: http://localhost:3000
2. Đăng nhập
3. Vào trang Futures Trading
4. Chọn symbol (VD: BTC/USDT)
5. Nhập margin (VD: 100 USDT)
6. Chọn leverage (VD: 2x)
7. Chọn Long hoặc Short
8. Click "Mở vị thế"

### 4. Kiểm tra lệnh đang mở
1. Click tab "Lệnh đang mở"
2. Lệnh vừa mở phải hiển thị với đầy đủ thông tin:
   - Symbol
   - Side (Long/Short)
   - Entry Price
   - Mark Price (real-time)
   - Leverage
   - Margin
   - Position Size
   - PnL (real-time)
   - Nút "Đóng vị thế"

### 5. Test đóng lệnh
1. Ở tab "Lệnh đang mở", click "Đóng vị thế"
2. Kiểm tra:
   - Lệnh biến mất khỏi "Lệnh đang mở"
   - Số dư wallet được cập nhật (margin + profit)
   - Lệnh xuất hiện trong tab "Lịch sử" với exit_price và profit

## Công thức quan trọng

### Position Size
```
position_size = margin × leverage
```

### PnL (Profit/Loss)
**Long position:**
```
profit = ((current_price - entry_price) / entry_price) × position_size
```

**Short position:**
```
profit = ((entry_price - current_price) / entry_price) × position_size
```

### Wallet Balance khi đóng lệnh
```
new_balance = old_balance + margin + profit
```

## Files đã thay đổi
1. ✅ `backend/database/schema.sql` - Cập nhật schema future_orders
2. ✅ `backend/database/migrations/0005_fix_future_orders_schema.sql` - Migration mới
3. ✅ `backend/src/Controllers/TradingController.php` - Sửa logic openFuture và closeFuture
4. ✅ `backend/run_future_migration.php` - Script chạy migration
5. ✅ `backend/debug_future_orders.php` - Script debug

## Lưu ý
- ✅ Future orders **KHÔNG CẦN** foreign key tới bảng `properties`
- ✅ Symbol trong future_orders là symbol người dùng chọn (VD: BTC, ETH)
- ✅ `exit_price` để NULL khi lệnh đang mở, chỉ cập nhật khi đóng lệnh
- ✅ `close_ts` để NULL khi lệnh đang mở, query `WHERE close_ts IS NULL` để lấy lệnh đang mở
- ✅ `position_size = margin × leverage` (được tính và lưu khi mở lệnh)

## Kết quả mong đợi
✅ Sau khi mở lệnh future, lệnh sẽ hiển thị ngay lập tức trong tab "Lệnh đang mở"
✅ PnL được tính real-time dựa trên giá WebSocket
✅ Khi đóng lệnh, số dư được cập nhật chính xác
✅ Lệnh đã đóng xuất hiện trong "Lịch sử" với đầy đủ thông tin
