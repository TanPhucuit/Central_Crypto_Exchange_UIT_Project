<?php

namespace App\Helpers;

use PDO;
use PDOException;

class Database
{
    private static ?PDO $connection = null;

    public static function getConnection(): PDO
    {
        if (self::$connection === null) {
            $config = require __DIR__ . '/../../config/database.php';
            
            try {
                $dsn = sprintf(
                    "mysql:host=%s;port=%s;dbname=%s;charset=%s",
                    $config['host'],
                    $config['port'],
                    $config['database'],
                    $config['charset']
                );

                $options = array_merge($config['options'], [
                    PDO::ATTR_PERSISTENT => true,
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                ]);

                // Add SSL/TLS support - required for TiDB Cloud
                if (!empty($config['ssl']['ca'])) {
                    $caPath = __DIR__ . '/../../' . $config['ssl']['ca'];
                    if (file_exists($caPath)) {
                        $options[PDO::MYSQL_ATTR_SSL_CA] = $caPath;
                        $options[PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT] = false;
                    }
                }

                self::$connection = new PDO(
                    $dsn,
                    $config['username'],
                    $config['password'],
                    $options
                );

            } catch (PDOException $e) {
                error_log("Database connection failed: " . $e->getMessage());
                throw new \RuntimeException("Database connection failed: " . $e->getMessage());
            }
        }

        return self::$connection;
    }

    public static function testConnection(): array
    {
        try {
            $pdo = self::getConnection();
            $stmt = $pdo->query("SELECT VERSION() as version");
            $result = $stmt->fetch();
            
            $config = require __DIR__ . '/../../config/database.php';
            
            return [
                'success' => true,
                'message' => 'Database connection successful',
                'version' => $result['version'],
                'database' => $config['database']
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'message' => 'Database connection failed',
                'error' => $e->getMessage()
            ];
        }
    }

    public static function closeConnection(): void
    {
        self::$connection = null;
    }
}
