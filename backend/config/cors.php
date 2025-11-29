<?php

$defaultOrigins = implode(',', [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5173',
    'http://localhost:*',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:*',
    'http://192.168.*',
    'http://10.*',
    'http://172.16.*',
]);

$configuredOrigins = $_ENV['CORS_ORIGIN'] ?? $defaultOrigins;
$allowedOrigins = array_values(array_filter(array_map('trim', explode(',', $configuredOrigins))));

return [
    'allowed_origins' => $allowedOrigins,
    'allowed_methods' => ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    'allowed_headers' => ['Content-Type', 'Authorization', 'X-Requested-With'],
    'max_age' => 3600,
];
