# 🔧 Schema Restoration - Tài liệu hoàn thành

## ✅ Những gì đã được khôi phục

Đã khôi phục về **schema cũ (ổn định)** và cập nhật code tương ứng. Chỉ bỏ cột `note` để tránh lỗi.

### 1. Schema Database (schema.sql)
✅ **Khôi phục về cấu trúc cũ:**
- Bảng `users`: dùng `id` (thay vì `user_id`)
- Bảng `wallets`: dùng `id` và `currency` (thay vì `wallet_id` và `type`)  
- Bảng `transactions`: **BỎ cột `note`** để tránh lỗi
- Loại bỏ bảng `properties` (không cần thiết trong schema cũ)
- Giữ nguyên các bảng khác: `bank_accounts`, `trading_orders`, `p2p_orders`, `merchant_profiles`

### 2. Backend Models

#### ✅ **Wallet.php** - Cập nhật hoàn toàn
- Dùng `id` thay vì `wallet_id`
- Dùng `currency` thay vì `type`
- Methods mới:
  - `getByUserIdAndCurrency()` - thay cho `getByUserIdAndType()`
  - `create($userId, $currency, $balance)` - tham số đơn giản hơn
  - `lockBalance()`, `unlockBalance()` - quản lý locked_balance
  - `deductLockedBalance()` - trừ locked balance khi order hoàn thành

#### ✅ **WalletController.php** - Cập nhật API endpoints
- `GET /api/wallet` - lấy tất cả ví
- `GET /api/wallet/currency/{currency}` - lấy ví theo currency (thay vì type)
- `POST /api/wallet` - tạo ví mới (nhận `currency` thay vì `type`)
- `POST /api/wallet/transfer` - chuyển giữa các currency (thay vì internal-transfer)

#### ✅ **wallet.php** (Routes) - Cập nhật routes
- Route `/wallet/currency/{currency}` thay cho `/wallet/type/{type}`
- Route `/wallet/transfer` thay cho `/wallet/internal-transfer`
- Bỏ routes liên quan đến `properties`

### 3. Frontend API Service

#### ✅ **api.js** - Hoàn toàn được viết lại
- `walletAPI.getWalletByCurrency(userId, currency)` - thay cho `getWalletByType()`
- `walletAPI.createWallet(userId, currency)` - tham số `currency` thay vì `type`
- `walletAPI.internalTransfer(userId, {fromCurrency, toCurrency, amount})` - dùng currency
- **Bỏ field `note`** khỏi tất cả API calls (bankAPI.transferFunds, etc.)

---

## 📝 So sánh Schema Cũ vs Mới

| Thuộc tính | Schema Cũ (Đã khôi phục) | Schema Mới (Bỏ) |
|------------|--------------------------|-----------------|
| **Users PK** | `id` | `user_id` |
| **Wallets PK** | `id` | `wallet_id` |
| **Wallets Type** | `currency` (VARCHAR) | `type` (ENUM) |
| **Wallet Balance** | `balance` + `locked_balance` | Chỉ `balance` |
| **Properties Table** | ❌ Không có | ✅ Có (phức tạp) |
| **Transactions** | `transactions` (KHÔNG có `note`) | `spot_transactions`, `future_orders` |

---

## 🚀 Cách sử dụng Schema mới

### Backend API Example:
```php
// Create USDT wallet
POST /api/wallet
{
  "user_id": 1,
  "currency": "USDT"
}

// Transfer from USDT to BTC wallet  
POST /api/wallet/transfer
{
  "user_id": 1,
  "from_currency": "USDT",
  "to_currency": "BTC",
  "amount": 100.50
}
```

### Frontend Example:
```javascript
// Get all wallets
const wallets = await walletAPI.getWallets(userId);

// Get specific currency wallet
const usdtWallet = await walletAPI.getWalletByCurrency(userId, 'USDT');

// Transfer between wallets
await walletAPI.internalTransfer(userId, {
  fromCurrency: 'USDT',
  toCurrency: 'BTC',
  amount: 100
});
```

---

## ⚠️ Breaking Changes

### Frontend cần cập nhật:

1. **WalletPage.js** - Cần sửa để dùng `currency` thay vì `type`
2. **Spot Trading** - Có thể cần điều chỉnh nếu đang dùng `properties`
3. **Futures Trading** - Kiểm tra xem có dùng `type` field không

### Các file cần kiểm tra:
- [ ] `Frontend/src/pages/Wallet/WalletPage.js`
- [ ] `Frontend/src/pages/SpotTrading/SpotTradingPage.js`
- [ ] `Frontend/src/pages/FuturesTrading/FuturesTradingPage.js`

---

## 🔍 Kiểm tra Database

Chạy các queries sau để kiểm tra database hiện tại:

```sql
-- Kiểm tra cấu trúc Users
DESCRIBE users;

-- Kiểm tra cấu trúc Wallets  
DESCRIBE wallets;

-- Kiểm tra Transactions có cột note không
DESCRIBE transactions;

-- Xem danh sách wallets
SELECT * FROM wallets LIMIT 10;
```

---

## ✅ Checklist hoàn thành

- [x] Cập nhật `schema.sql` về version cũ (bỏ cột note)
- [x] Cập nhật `Wallet.php` model
- [x] Cập nhật `WalletController.php`
- [x] Cập nhật `wallet.php` routes
- [x] Cập nhật `api.js` frontend service
- [ ] **TODO: Cập nhật WalletPage.js** (cần user làm tiếp)
- [ ] **TODO: Test lại toàn bộ flow** (wallet load, transfer, trading)

---

## 🎯 Bước tiếp theo

1. **Restart Backend**:
   ```bash
   cd d:\HK5\Web\CryptoExchange\backend
   # Ctrl+C để dừng server hiện tại
   php -S localhost:8000 -t public
   ```

2. **Kiểm tra database** có đúng schema cũ chưa (users.id, wallets.id, wallets.currency)
   - Nếu chưa: Cần drop và reimport `schema.sql`
   
3. **Reload Frontend** (F5)

4. **Test API**:
   - Mở browser console
   - Vào trang Wallet
   - Kiểm tra network requests
   - Xem có lỗi gì không

---

## 📞 Hỗ trợ

Nếu gặp lỗi:
1. Kiểm tra backend logs
2. Kiểm tra browser console  
3. Xem network tab trong DevTools
4. Đảm bảo database đã được update đúng schema

**Lưu ý quan trọng:** Code hiện tại chỉ hoạt động với **schema cũ**. Nếu database đang dùng schema mới, cần drop và reimport `schema.sql`.
