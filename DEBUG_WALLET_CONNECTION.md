# Hướng dẫn Debug Lỗi Wallet Connection

## Vấn đề
Không thể load wallet, lỗi "Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng"

## Các bước kiểm tra

### 1. Kiểm tra Backend đang chạy
```powershell
# Kiểm tra process PHP đang chạy
Get-Process php -ErrorAction SilentlyContinue

# Hoặc kiểm tra port 8000
Test-NetConnection -ComputerName localhost -Port 8000
```

### 2. Kiểm tra Backend API trực tiếp
Mở trình duyệt hoặc dùng curl:
```
http://localhost:8000/api/health
```

Hoặc dùng PowerShell:
```powershell
Invoke-WebRequest -Uri "http://localhost:8000/api/health" -Method GET
```

### 3. Kiểm tra Frontend đang chạy trên port nào
Kiểm tra URL trong trình duyệt. Nếu là `localhost:3001` thay vì `localhost:3000`, CORS có thể chặn.

### 4. Kiểm tra Console trong Browser
1. Mở Developer Tools (F12)
2. Vào tab **Console**
3. Xem lỗi chi tiết
4. Vào tab **Network**
5. Reload trang và xem request đến `/api/wallet`
6. Kiểm tra:
   - Request URL có đúng không?
   - Status code là gì? (404, 500, CORS error?)
   - Response headers có `Access-Control-Allow-Origin` không?

### 5. Test API endpoint trực tiếp
Trong Browser Console, chạy:
```javascript
fetch('http://localhost:8000/api/health')
  .then(res => res.json())
  .then(data => console.log('✅ Health:', data))
  .catch(err => console.error('❌ Error:', err));

fetch('http://localhost:8000/api/wallet?user_id=1')
  .then(res => res.json())
  .then(data => console.log('✅ Wallet:', data))
  .catch(err => console.error('❌ Error:', err));
```

## Giải pháp đã thực hiện

### ✅ Đã cập nhật CORS configuration
File: `backend/config/cors.php`
- Thêm wildcard cho localhost: `http://localhost:*`
- Thêm wildcard cho 127.0.0.1: `http://127.0.0.1:*`
- Cho phép tất cả ports của localhost

### ✅ Đã tạo API Debug Utility
File: `Frontend/src/utils/apiDebug.js`

Để sử dụng, trong Browser Console:
```javascript
import testAPIConnection from './utils/apiDebug';
testAPIConnection();
```

## Các lỗi thường gặp

### Lỗi 1: CORS Error
**Triệu chứng:** Console hiển thị lỗi CORS
**Giải pháp:** 
- Đảm bảo backend đang chạy
- Restart backend sau khi thay đổi CORS config
- Kiểm tra origin trong request header

### Lỗi 2: Network Error / ERR_CONNECTION_REFUSED
**Triệu chứng:** Không kết nối được đến server
**Giải pháp:**
- Kiểm tra backend có đang chạy không
- Kiểm tra port 8000 có bị chiếm bởi process khác không
- Restart backend

### Lỗi 3: 404 Not Found
**Triệu chứng:** API endpoint không tìm thấy
**Giải pháp:**
- Kiểm tra URL có đúng không (có `/api` prefix)
- Kiểm tra routes đã được register chưa

### Lỗi 4: 500 Internal Server Error
**Triệu chứng:** Server error
**Giải pháp:**
- Kiểm tra backend logs
- Kiểm tra database connection
- Kiểm tra PHP error logs

## Cách khởi động lại Backend

```powershell
cd d:\HK5\Web\CryptoExchange\backend

# Stop backend nếu đang chạy (Ctrl+C trong terminal đang chạy)

# Start lại backend
php -S localhost:8000 -t public
```

## Cách khởi động lại Frontend

```powershell
cd d:\HK5\Web\CryptoExchange\Frontend

# Stop frontend nếu đang chạy (Ctrl+C)

# Start lại
npm start
```

## Kiểm tra nhanh

Chạy lệnh này để test tất cả:
```powershell
# Test backend health
curl http://localhost:8000/api/health

# Test wallet endpoint (sẽ trả về lỗi thiếu user_id nhưng chứng tỏ endpoint hoạt động)
curl http://localhost:8000/api/wallet
```

Nếu cả 2 lệnh đều trả về JSON response (không phải connection error), backend đang hoạt động tốt.
