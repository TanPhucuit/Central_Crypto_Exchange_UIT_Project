<?php
$baseUrl = 'http://localhost:8000';

function post($endpoint, $data) {
    global $baseUrl;
    $url = $baseUrl . $endpoint;
    echo "POST $url\n";
    echo "Data: " . json_encode($data) . "\n";
    
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    
    $response = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    echo "Status: $code\n";
    echo "Response: $response\n\n";
    return json_decode($response, true);
}

// Test 1: Password too short (4 chars) - Should fail
post('/api/auth/register', [
    'username' => 'short_' . time(),
    'email' => 'short_' . time() . '@test.com',
    'password' => '1234'
]);

// Test 2: Password OK (5 chars) - Should succeed
$res = post('/api/auth/register', [
    'username' => 'user_' . time(),
    'email' => 'user_' . time() . '@test.com',
    'password' => '12345'
]);

if (isset($res['data']['user_id'])) {
    // Login with this user
    post('/api/auth/login', [
        'login' => 'user_' . time(), // Note: time matches above only if within same second. Better to capture username.
        // Actually, let's just use the known username
        'login' => $res['data']['user']['username'], 
        'password' => '12345'
    ]);
}
