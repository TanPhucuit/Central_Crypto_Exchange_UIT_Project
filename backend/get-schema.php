<?php

// Get actual schema from TiDB

error_reporting(E_ALL);
ini_set('display_errors', 1);

$config = [
    'host' => 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com',
    'port' => '4000',
    'database' => 'crypto_exchange_2',
    'username' => '4GXQNpQMpv6LcyF.root',
    'password' => '12345678',
    'charset' => 'utf8mb4'
];

try {
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
    ];

    $pdo = new PDO($dsn, $config['username'], $config['password'], $options);

    echo "=== Getting Schema from TiDB ===\n\n";

    // Get all tables
    $stmt = $pdo->query("SHOW TABLES");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);

    echo "Found " . count($tables) . " tables:\n";
    foreach ($tables as $table) {
        echo "  - $table\n";
    }
    echo "\n";

    // Get CREATE TABLE statement for each table
    echo "=== Table Structures ===\n\n";
    
    foreach ($tables as $table) {
        echo "-- Table: $table\n";
        $stmt = $pdo->query("SHOW CREATE TABLE `$table`");
        $result = $stmt->fetch();
        echo $result['Create Table'] . ";\n\n";
    }

} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
