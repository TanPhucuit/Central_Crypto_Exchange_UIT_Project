<?php
// Connect to MySQL server without selecting a database first
$host = '127.0.0.1';
$port = '3306';
$username = 'root';
$password = '123456';
$dbname = 'crypto_exchange_2';

try {
    $pdo = new PDO("mysql:host=$host;port=$port", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    echo "Connected to MySQL server.\n";

    // Create database if not exists
    $pdo->exec("CREATE DATABASE IF NOT EXISTS `$dbname` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    echo "Database '$dbname' created or already exists.\n";

} catch (PDOException $e) {
    die("DB Error: " . $e->getMessage() . "\n");
}
