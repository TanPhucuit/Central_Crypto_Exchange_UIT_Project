<?php
$baseUrl = 'http://localhost:8000';

function check($url, $method = 'GET', $data = []) {
    echo "--- Testing: $url [$method] ---\n";
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    
    if ($method === 'POST') {
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    }
    
    $response = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    
    if ($response === false) {
        echo "Curl error: " . curl_error($ch) . "\n";
    } else {
        echo "Status: $code\n";
        echo "Response: " . substr($response, 0, 500) . "...\n";
    }
    curl_close($ch);
    echo "\n";
}

// 1. Check Health
check($baseUrl . '/api/health');

// 2. Check Wallet (User 11)
check($baseUrl . '/api/wallet?user_id=11');

// 3. Check Dashboard Summary (User 11)
check($baseUrl . '/api/dashboard/summary?user_id=11');

// 4. Check P2P My Orders (User 11)
check($baseUrl . '/api/p2p/my-orders?user_id=11');


// 5. Check P2P Merchants
check($baseUrl . '/api/p2p/merchants');

// 6. Check Bank Accounts (User 11)
check($baseUrl . '/api/bank?user_id=11');

// 7. Check Open Futures (User 11)
check($baseUrl . '/api/trading/futures/open?user_id=11');

