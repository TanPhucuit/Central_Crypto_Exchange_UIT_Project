<?php
// Simple migration runner for local/dev only
// Usage: php run_migrations.php

require __DIR__ . '/../vendor/autoload.php';

use App\Helpers\Database;

// Load .env if present so CLI scripts pick up DB credentials (TiDB online)
try {
    if (file_exists(__DIR__ . '/../.env')) {
        $dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/..');
        $dotenv->load();
    }
} catch (\Throwable $e) {
    // ignore; Database::getConnection will still try config defaults
}

$pdo = Database::getConnection();

// Ensure migrations table exists
$pdo->exec(
    "CREATE TABLE IF NOT EXISTS migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;"
);

$migrationsDir = __DIR__ . '/../database/migrations';
$files = is_dir($migrationsDir) ? glob($migrationsDir . '/*.sql') : [];
sort($files);

foreach ($files as $file) {
    $filename = basename($file);
    $stmt = $pdo->prepare('SELECT COUNT(1) as c FROM migrations WHERE filename = ?');
    $stmt->execute([$filename]);
    $row = $stmt->fetch();
    if ($row && $row['c'] > 0) {
        echo "Skipping already applied migration: $filename\n";
        continue;
    }

    echo "Applying migration: $filename\n";
    $sql = file_get_contents($file);
    if ($sql === false) {
        echo "Failed to read $filename\n";
        exit(1);
    }

    // Normalize delimiter lines (simple handling) and split statements by semicolon
    $sql = preg_replace('/^DELIMITER\s+\S+/mi', '', $sql);
    // Split by semicolon followed by line break to allow multi-statement files
    $stmts = preg_split('/;\s*\n/', $sql);

    try {
        $pdo->beginTransaction();
        foreach ($stmts as $stmtSql) {
            $stmtSql = trim($stmtSql);
            if ($stmtSql === '') continue;
            // Use exec which returns false on failure
            $res = $pdo->exec($stmtSql);
            if ($res === false) {
                $err = $pdo->errorInfo();
                throw new \RuntimeException('Statement failed: ' . ($err[2] ?? json_encode($err)) . "\nSQL: " . substr($stmtSql, 0, 300));
            }
        }
        $ins = $pdo->prepare('INSERT INTO migrations (filename) VALUES (?)');
        $ins->execute([$filename]);
        $pdo->commit();
        echo "Applied: $filename\n";
    } catch (\Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        echo "Failed to apply $filename: " . $e->getMessage() . "\n";
        exit(1);
    }
}

echo "Migrations complete.\n";



