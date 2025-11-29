<?php
/**
 * Test Login API directly
 */

$apiUrl = 'http://localhost:8000/api/auth/login';

echo "=== TEST 1: Login với thông tin SAI ===\n";
$wrongData = json_encode([
    'login' => 'wronguser',
    'password' => 'wrongpass'
]);

$ch = curl_init($apiUrl);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $wrongData);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTP Code: $httpCode\n";
echo "Response: $response\n\n";

$result = json_decode($response, true);
if ($result['success'] === false) {
    echo "✓ PASS: Backend trả về lỗi đúng\n\n";
} else {
    echo "✗ FAIL: Backend không trả về lỗi!\n\n";
}

echo "=== TEST 2: Kiểm tra có user nào trong database không ===\n";
require_once __DIR__ . '/vendor/autoload.php';
use App\Helpers\Database;

$db = Database::getConnection();
$stmt = $db->query("SELECT user_id, username, email, role FROM users LIMIT 5");
$users = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "Số lượng users: " . count($users) . "\n";
foreach ($users as $user) {
    echo "- ID: {$user['user_id']}, Username: {$user['username']}, Email: {$user['email']}, Role: {$user['role']}\n";
}

if (count($users) > 0) {
    echo "\n=== TEST 3: Login với user thật ===\n";
    $realUser = $users[0];
    echo "Thử đăng nhập với username: {$realUser['username']}\n";
    echo "NOTE: Nếu bạn không nhớ password, cần tạo user mới hoặc reset password\n";
    
    // Test với password thường dùng
    $testPasswords = ['admin123', 'password', '123456', 'admin', $realUser['username']];
    
    foreach ($testPasswords as $testPass) {
        $testData = json_encode([
            'login' => $realUser['username'],
            'password' => $testPass
        ]);
        
        $ch = curl_init($apiUrl);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $testData);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        $result = json_decode($response, true);
        
        if ($result['success'] === true) {
            echo "✓ Password '$testPass' ĐÚNG! Login thành công\n";
            echo "Response: $response\n";
            break;
        } else {
            echo "✗ Password '$testPass' sai\n";
        }
    }
}

echo "\n=== TEST 4: Tạo user test mới ===\n";
$testUsername = 'testuser_' . time();
$testPassword = 'test123456';
$testEmail = $testUsername . '@test.com';

$registerData = json_encode([
    'username' => $testUsername,
    'email' => $testEmail,
    'password' => $testPassword
]);

$ch = curl_init('http://localhost:8000/api/auth/register');
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $registerData);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTP Code: $httpCode\n";
echo "Response: $response\n";

$result = json_decode($response, true);
if ($result['success'] === true) {
    echo "\n✓ Đã tạo user test thành công!\n";
    echo "Username: $testUsername\n";
    echo "Password: $testPassword\n";
    echo "Email: $testEmail\n";
    
    echo "\n=== TEST 5: Login với user test vừa tạo ===\n";
    $loginData = json_encode([
        'login' => $testUsername,
        'password' => $testPassword
    ]);
    
    $ch = curl_init($apiUrl);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $loginData);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    echo "HTTP Code: $httpCode\n";
    echo "Response: $response\n";
    
    $result = json_decode($response, true);
    if ($result['success'] === true) {
        echo "✓ PASS: Login thành công với user test!\n";
    } else {
        echo "✗ FAIL: Không thể login với user test!\n";
    }
}
