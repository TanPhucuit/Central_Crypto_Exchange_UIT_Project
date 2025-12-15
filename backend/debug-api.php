<?php
$baseUrl = 'http://localhost:8000';

function check($url) {
    echo "--- Testing: $url ---\n";
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HEADER, false);
    
    $response = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    
    if ($response === false) {
        echo "Curl error: " . curl_error($ch) . "\n";
    } else {
        echo "Status: $code\n";
        echo "Response: " . substr($response, 0, 500) . "\n"; // Limit output
    }
    curl_close($ch);
    echo "\n";
}

check($baseUrl . '/api/health');
check($baseUrl . '/api/health/database');
