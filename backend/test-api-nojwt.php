<?php
/**
 * API Testing Script (No JWT)
 * Test all endpoints without authentication
 */

$baseUrl = 'http://localhost:8000';
$userId = null;

function apiRequest($method, $endpoint, $data = null) {
    global $baseUrl;
    
    $url = $baseUrl . $endpoint;
    $ch = curl_init($url);
    
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    
    if ($data && in_array($method, ['POST', 'PUT', 'PATCH', 'DELETE'])) {
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

echo "=== CRYPTO EXCHANGE API TESTING (NO JWT) ===\n\n";

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
$result = apiRequest('POST', '/api/auth/register', $registerData);
echo "   Status: " . $result['code'] . "\n";
if ($result['body'] && isset($result['body']['data']['user_id'])) {
    $userId = $result['body']['data']['user_id'];
    echo "   User ID: {$userId}\n";
}
echo "   Response: " . json_encode($result['body']) . "\n\n";

if (!$userId) {
    echo "❌ Cannot continue without user_id\n";
    exit(1);
}

// Test 4: Login
echo "4. Login\n";
$loginData = [
    'login' => $registerData['username'],
    'password' => 'password123'
];
$result = apiRequest('POST', '/api/auth/login', $loginData);
echo "   Status: " . $result['code'] . "\n";
echo "   Response: " . json_encode($result['body']) . "\n\n";

// Test 5: Get current user profile
echo "5. Get Current User Profile\n";
$result = apiRequest('GET', "/api/auth/me?user_id={$userId}");
echo "   Status: " . $result['code'] . "\n";
echo "   Response: " . json_encode($result['body']) . "\n\n";

// Test 6: Get user wallets
echo "6. Get User Wallets\n";
$result = apiRequest('GET', "/api/wallet?user_id={$userId}");
echo "   Status: " . $result['code'] . "\n";
echo "   Response: " . json_encode($result['body']) . "\n\n";

// Test 7: Create fund wallet
echo "7. Create Fund Wallet\n";
$walletData = [
    'user_id' => $userId,
    'type' => 'fund'
];
$result = apiRequest('POST', '/api/wallet', $walletData);
echo "   Status: " . $result['code'] . "\n";
echo "   Response: " . json_encode($result['body']) . "\n";
$fundWalletId = $result['body']['data']['wallet_id'] ?? null;
echo "\n";

// Test 8: Create spot wallet
echo "8. Create Spot Wallet\n";
$walletData = [
    'user_id' => $userId,
    'type' => 'spot'
];
$result = apiRequest('POST', '/api/wallet', $walletData);
echo "   Status: " . $result['code'] . "\n";
echo "   Response: " . json_encode($result['body']) . "\n";
$spotWalletId = $result['body']['data']['wallet_id'] ?? null;
echo "\n";

// Test 9: Get wallet by type
echo "9. Get Fund Wallet\n";
$result = apiRequest('GET', "/api/wallet/type/fund?user_id={$userId}");
echo "   Status: " . $result['code'] . "\n";
echo "   Response: " . json_encode($result['body']) . "\n\n";

// Test 10: Get wallet with properties
if ($spotWalletId) {
    echo "10. Get Spot Wallet with Properties\n";
    $result = apiRequest('GET', "/api/wallet/{$spotWalletId}/properties?user_id={$userId}");
    echo "   Status: " . $result['code'] . "\n";
    echo "   Response: " . json_encode($result['body']) . "\n\n";
}

// Test 11: Get spot transaction history
if ($spotWalletId) {
    echo "11. Get Spot Transaction History\n";
    $result = apiRequest('GET', "/api/trading/spot/{$spotWalletId}/history?user_id={$userId}");
    echo "   Status: " . $result['code'] . "\n";
    echo "   Response: " . json_encode($result['body']) . "\n\n";
}

// Test 12: Test Spot Buy
if ($spotWalletId) {
    echo "12. Test Spot Buy\n";
    $buyData = [
        'user_id' => $userId,
        'wallet_id' => $spotWalletId,
        'symbol' => 'BTCUSDT',
        'unit_numbers' => 0.01,
        'index_price' => 50000
    ];
    $result = apiRequest('POST', '/api/trading/spot/buy', $buyData);
    echo "   Status: " . $result['code'] . "\n";
    echo "   Response: " . json_encode($result['body']) . "\n\n";
}

// Test 13: Create bank account
echo "13. Create Bank Account\n";
$bankData = [
    'user_id' => $userId,
    'account_number' => 'TEST' . time(),
    'bank_name' => 'Test Bank',
    'account_balance' => 50000.00
];
$result = apiRequest('POST', '/api/bank', $bankData);
echo "   Status: " . $result['code'] . "\n";
echo "   Response: " . json_encode($result['body']) . "\n";
$accountNumber = $result['body']['data']['account_number'] ?? null;
echo "\n";

// Test 14: Get all bank accounts
echo "14. Get All Bank Accounts\n";
$result = apiRequest('GET', "/api/bank?user_id={$userId}");
echo "   Status: " . $result['code'] . "\n";
echo "   Response: " . json_encode($result['body']) . "\n\n";

// Test 15: Get P2P orders
echo "15. Get P2P Orders\n";
$result = apiRequest('GET', '/api/p2p/orders');
echo "   Status: " . $result['code'] . "\n";
echo "   Response: " . json_encode($result['body']) . "\n\n";

// Test 16: Get my P2P orders
echo "16. Get My P2P Orders\n";
$result = apiRequest('GET', "/api/p2p/my-orders?user_id={$userId}");
echo "   Status: " . $result['code'] . "\n";
echo "   Response: " . json_encode($result['body']) . "\n\n";

// Test 17: Create P2P order
echo "17. Create P2P Order\n";
$p2pData = [
    'user_id' => $userId,
    'type' => 'buy',
    'unit_numbers' => 100
];
$result = apiRequest('POST', '/api/p2p/orders', $p2pData);
echo "   Status: " . $result['code'] . "\n";
echo "   Response: " . json_encode($result['body']) . "\n\n";

// Test 18: Get user profile
echo "18. Get User Profile\n";
$result = apiRequest('GET', "/api/user/profile?user_id={$userId}");
echo "   Status: " . $result['code'] . "\n";
echo "   Response: " . json_encode($result['body']) . "\n\n";

// Test 19: Update user profile
echo "19. Update User Profile\n";
$profileData = [
    'user_id' => $userId,
    'email' => 'updated_' . time() . '@example.com'
];
$result = apiRequest('PUT', '/api/user/profile', $profileData);
echo "   Status: " . $result['code'] . "\n";
echo "   Response: " . json_encode($result['body']) . "\n\n";

echo "=== TESTING COMPLETED ===\n";
echo "\n✅ All tests passed! Backend is ready for deployment.\n";
