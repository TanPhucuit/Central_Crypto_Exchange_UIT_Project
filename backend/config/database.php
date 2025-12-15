<?php

return [
    'host' => '127.0.0.1',
    'port' => '3306',
    'database' => 'crypto_exchange_2',
    'username' => 'root',
    'password' => '123456',
    'charset' => 'utf8mb4',
    'collation' => 'utf8mb4_unicode_ci',
    'options' => [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ],
    'ssl' => [
        'ca' => null
    ]
];
