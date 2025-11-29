<?php

return [
    'host' => $_ENV['DB_HOST'] ?? 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com',
    'port' => $_ENV['DB_PORT'] ?? '4000',
    'database' => $_ENV['DB_DATABASE'] ?? 'crypto_exchange_2',
    'username' => $_ENV['DB_USERNAME'] ?? '4GXQNpQMpv6LcyF.root',
    'password' => $_ENV['DB_PASSWORD'] ?? '12345678',
    'charset' => 'utf8mb4',
    'collation' => 'utf8mb4_unicode_ci',
    'options' => [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ],
    'ssl' => [
        'ca' => $_ENV['DB_SSL_CA'] ?? 'isrgrootx1.pem'
    ]
];
