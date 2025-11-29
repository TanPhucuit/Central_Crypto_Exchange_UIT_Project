<?php

// Test TiDB Connection without Composer dependencies

error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "=== Testing TiDB Connection ===\n\n";

// Updated credentials
$config = [
    'host' => 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com',
    'port' => '4000',
    'database' => 'crypto_exchange_2',
    'username' => '4GXQNpQMpv6LcyF.root',
    'password' => '12345678',
    'charset' => 'utf8mb4'
];

try {
    echo "Attempting to connect to TiDB...\n";
    echo "Host: {$config['host']}\n";
    echo "Port: {$config['port']}\n";
    echo "Database: {$config['database']}\n";
    echo "Username: {$config['username']}\n\n";

    $dsn = sprintf(
        "mysql:host=%s;port=%s;dbname=%s;charset=%s",
        $config['host'],
        $config['port'],
        $config['database'],
        $config['charset']
    );

    $caPath = __DIR__ . '/isrgrootx1.pem';
    
    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
        PDO::MYSQL_ATTR_SSL_CA => $caPath,
        PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT => false,
        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
    ];
    
    echo "Using SSL Certificate: $caPath\n";
    echo "Connecting with SSL/TLS...\n";
    $pdo = new PDO($dsn, $config['username'], $config['password'], $options);

    echo "✓ Connection successful!\n\n";

    // Test query
    echo "Running test query...\n";
    $stmt = $pdo->query("SELECT VERSION() as version");
    $result = $stmt->fetch();

    echo "✓ Query successful!\n\n";
    echo "Database Info:\n";
    echo "- Version: {$result['version']}\n";
    echo "- Database: {$config['database']}\n\n";

    // Check if tables exist
    echo "Checking existing tables...\n";
    $stmt = $pdo->query("SHOW TABLES");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);

    if (empty($tables)) {
        echo "No tables found. You need to run the schema.sql file.\n";
    } else {
        echo "Found " . count($tables) . " tables:\n";
        foreach ($tables as $table) {
            echo "  - $table\n";
        }
    }

    echo "\n✓ All tests passed!\n";
    echo "\n=== Connection Test Complete ===\n";

} catch (PDOException $e) {
    echo "\n✗ Connection failed!\n";
    echo "Error: " . $e->getMessage() . "\n";
    echo "\nPlease check:\n";
    echo "1. Database credentials are correct\n";
    echo "2. TiDB instance is running\n";
    echo "3. Network/firewall allows connection\n";
    exit(1);
}
