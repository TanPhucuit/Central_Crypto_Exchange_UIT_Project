<?php

return [
    'jwt_secret' => $_ENV['JWT_SECRET'] ?? 'change-this-secret-key',
    'jwt_algorithm' => 'HS256',
    'jwt_expiration' => 3600 * 24 * 7, // 7 days
];
