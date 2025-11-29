<?php
/**
 * API Testing Script
 * Test all endpoints systematically
 */

$baseUrl = 'http://localhost:8000';
$token = null;

function apiRequest($method, $endpoint, $data = null, $token = null) {
    global $baseUrl;
    
    $url = $baseUrl . $endpoint;
    $ch = curl_init($url);
    
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    
    $headers = ['Content-Type: application/json'];
    if ($token) {
        $headers[] = 'Authorization: Bearer ' . $token;
    }
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    
    if ($data && in_array($method, ['POST', 'PUT', 'PATCH'])) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    }
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    return [
        'code' => $httpCode,
        'body' => json_decode($response, true)
    ];
}

echo "=== CRYPTO EXCHANGE API TESTING ===\n\n";

// Test 1: Health Check
echo "1. Health Check\n";
$result = apiRequest('GET', '/api/health');
echo "   Status: " . $result['code'] . "\n";
echo "   Response: " . json_encode($result['body']) . "\n\n";

// Test 2: Database Health
echo "2. Database Health Check\n";
$result = apiRequest('GET', '/api/health/database');
echo "   Status: " . $result['code'] . "\n";
echo "   Response: " . json_encode($result['body']) . "\n\n";

// Test 3: Register new user
echo "3. Register New User\n";
$registerData = [
    'username' => 'testuser_' . time(),
    'email' => 'test_' . time() . '@example.com',
    'password' => 'password123',
    'role' => 'normal'
];
echo "   Sending data: " . json_encode($registerData) . "\n";
$result = apiRequest('POST', '/api/auth/register', $registerData);
echo "   Status: " . $result['code'] . "\n";
echo "   Response: " . json_encode($result['body']) . "\n\n";

// Test 4: Login
echo "4. Login\n";
$loginData = [
    'login' => $registerData['username'],
    'password' => 'password123'
];
$result = apiRequest('POST', '/api/auth/login', $loginData);
echo "   Status: " . $result['code'] . "\n";
if ($result['body'] && isset($result['body']['data']['token'])) {
    $token = $result['body']['data']['token'];
    echo "   Token received: " . substr($token, 0, 20) . "...\n";
} else {
    echo "   Response: " . json_encode($result['body']) . "\n";
}
echo "\n";

if (!$token) {
    echo "❌ Cannot continue without token\n";
    exit(1);
}

// Test 5: Get current user profile
echo "5. Get Current User Profile\n";
$result = apiRequest('GET', '/api/auth/me', null, $token);
echo "   Status: " . $result['code'] . "\n";
echo "   Response: " . json_encode($result['body']) . "\n\n";

// Test 6: Get user wallets
echo "6. Get User Wallets\n";
$result = apiRequest('GET', '/api/wallet', null, $token);
echo "   Status: " . $result['code'] . "\n";
echo "   Response: " . json_encode($result['body']) . "\n\n";

// Test 7: Create fund wallet
echo "7. Create Fund Wallet\n";
$walletData = [
    'type' => 'fund',
    'balance' => 10000.00
];
$result = apiRequest('POST', '/api/wallet', $walletData, $token);
echo "   Status: " . $result['code'] . "\n";
echo "   Response: " . json_encode($result['body']) . "\n";
$fundWalletId = $result['body']['data']['wallet_id'] ?? null;
echo "\n";

// Test 8: Create spot wallet
echo "8. Create Spot Wallet\n";
$walletData = [
    'type' => 'spot',
    'balance' => 5000.00
];
$result = apiRequest('POST', '/api/wallet', $walletData, $token);
echo "   Status: " . $result['code'] . "\n";
echo "   Response: " . json_encode($result['body']) . "\n";
$spotWalletId = $result['body']['data']['wallet_id'] ?? null;
echo "\n";

// Test 9: Get wallet by type
echo "9. Get Fund Wallet\n";
$result = apiRequest('GET', '/api/wallet/type/fund', null, $token);
echo "   Status: " . $result['code'] . "\n";
echo "   Response: " . json_encode($result['body']) . "\n\n";

// Test 10: Get wallet with properties
if ($spotWalletId) {
    echo "10. Get Spot Wallet with Properties\n";
    $result = apiRequest('GET', "/api/wallet/{$spotWalletId}/properties", null, $token);
    echo "   Status: " . $result['code'] . "\n";
    echo "   Response: " . json_encode($result['body']) . "\n\n";
}

// Test 11: Get spot transaction history
if ($spotWalletId) {
    echo "11. Get Spot Transaction History\n";
    echo "   Using token: " . substr($token, 0, 30) . "...\n";
    $result = apiRequest('GET', "/api/trading/spot/{$spotWalletId}/history", null, $token);
    echo "   Status: " . $result['code'] . "\n";
    echo "   Response: " . json_encode($result['body']) . "\n\n";
}

// Test 12: Create bank account
echo "12. Create Bank Account\n";
$bankData = [
    'account_number' => 'TEST' . time(),
    'bank_name' => 'Test Bank',
    'account_balance' => 50000.00
];
$result = apiRequest('POST', '/api/bank', $bankData, $token);
echo "   Status: " . $result['code'] . "\n";
echo "   Response: " . json_encode($result['body']) . "\n";
$accountNumber = $result['body']['data']['account_number'] ?? null;
echo "\n";

// Test 13: Get all bank accounts
echo "13. Get All Bank Accounts\n";
$result = apiRequest('GET', '/api/bank', null, $token);
echo "   Status: " . $result['code'] . "\n";
echo "   Response: " . json_encode($result['body']) . "\n\n";

// Test 14: Get P2P orders
echo "14. Get P2P Orders\n";
echo "   Using token: " . substr($token, 0, 30) . "...\n";
$result = apiRequest('GET', '/api/p2p/orders', null, $token);
echo "   Status: " . $result['code'] . "\n";
echo "   Response: " . json_encode($result['body']) . "\n\n";

// Test 15: Get user profile
echo "15. Get User Profile\n";
$result = apiRequest('GET', '/api/user/profile', null, $token);
echo "   Status: " . $result['code'] . "\n";
echo "   Response: " . json_encode($result['body']) . "\n\n";

// Test 16: Update user profile
echo "16. Update User Profile\n";
$profileData = [
    'email' => 'updated_' . time() . '@example.com'
];
$result = apiRequest('PUT', '/api/user/profile', $profileData, $token);
echo "   Status: " . $result['code'] . "\n";
echo "   Response: " . json_encode($result['body']) . "\n\n";

// Test 17: Test unauthorized access
echo "17. Test Unauthorized Access (no token)\n";
$result = apiRequest('GET', '/api/wallet', null, null);
echo "   Status: " . $result['code'] . "\n";
echo "   Response: " . json_encode($result['body']) . "\n\n";

echo "=== TESTING COMPLETED ===\n";
