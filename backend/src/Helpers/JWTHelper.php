<?php

namespace App\Helpers;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class JWTHelper
{
    private static function getConfig(): array
    {
        return require __DIR__ . '/../../config/auth.php';
    }

    public static function encode(array $payload): string
    {
        $config = self::getConfig();
        $now = time();

        $payload['iat'] = $now;
        $payload['exp'] = $now + $config['jwt_expiration'];

        return JWT::encode($payload, $config['jwt_secret'], $config['jwt_algorithm']);
    }

    public static function decode(string $token): object
    {
        $config = self::getConfig();
        return JWT::decode($token, new Key($config['jwt_secret'], $config['jwt_algorithm']));
    }

    public static function verify(string $token): bool
    {
        try {
            self::decode($token);
            return true;
        } catch (\Exception $e) {
            return false;
        }
    }
}
