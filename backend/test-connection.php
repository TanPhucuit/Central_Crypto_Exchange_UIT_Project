<?php

// Test TiDB Connection without Composer dependencies

error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "=== Testing MySQL Connection ===\n\n";

// Updated credentials
$config = [
    'host' => 'localhost',
    'port' => '3306',
    'database' => 'webdb',
    'username' => 'root',
    'password' => '123456',
    'charset' => 'utf8mb4'
];

try {
    echo "Attempting to connect to MySQL...\n";
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

    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
    ];
    
    echo "Connecting...\n";
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
    // If database not found, try to create it
    if (strpos($e->getMessage(), "Unknown database") !== false) {
        echo "Database '{$config['database']}' not found. Attempting to create it...\n";
        try {
            // Connect without database selected
            $dsnNoDb = sprintf(
                "mysql:host=%s;port=%s;charset=%s",
                $config['host'],
                $config['port'],
                $config['charset']
            );
            $pdo = new PDO($dsnNoDb, $config['username'], $config['password'], $options);
            $pdo->exec("CREATE DATABASE IF NOT EXISTS `{$config['database']}`");
            echo "✓ Database '{$config['database']}' created successfully!\n";
            
            // Reconnect with database
            $pdo->exec("USE `{$config['database']}`");
            goto connection_success;
        } catch (PDOException $e2) {
            echo "✗ Failed to create database: " . $e2->getMessage() . "\n";
            exit(1);
        }
    }

    echo "\n✗ Connection failed!\n";
    echo "Error: " . $e->getMessage() . "\n";
    echo "\nPlease check:\n";
    echo "1. Database credentials are correct\n";
    echo "2. MySQL is running (XAMPP Control Panel)\n";
    echo "3. Port {$config['port']} is correct\n";
    exit(1);
}

connection_success:
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
        echo "No tables found. You may need to run migrations.\n";
    } else {
        echo "Found " . count($tables) . " tables:\n";
        foreach ($tables as $table) {
            echo "  - $table\n";
        }
    }

    echo "\n✓ All tests passed!\n";
    echo "\n=== Connection Test Complete ===\n";
