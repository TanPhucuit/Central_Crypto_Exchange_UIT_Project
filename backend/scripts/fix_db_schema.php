<?php
require __DIR__ . '/../vendor/autoload.php';
use App\Helpers\Database;

// Load env
try {
    $dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/..');
    $dotenv->load();
} catch (\Exception $e) {}

$pdo = Database::getConnection();

echo "Running schema fix migration...\n";

// 1. Update users table structure
echo "Checking users table...\n";
try {
    // Check for username
    $stmt = $pdo->query("SHOW COLUMNS FROM users LIKE 'username'");
    if ($stmt->rowCount() == 0) {
        echo "Adding username column...\n";
        $sql = "ALTER TABLE users ADD COLUMN username VARCHAR(255) UNIQUE AFTER email";
        $pdo->exec($sql);
        // Populate username from email
        $pdo->exec("UPDATE users SET username = SUBSTRING_INDEX(email, '@', 1) WHERE username IS NULL");
    }

    // Check for fullname vs full_name
    $hasFullname = $pdo->query("SHOW COLUMNS FROM users LIKE 'fullname'")->rowCount() > 0;
    $hasFullName = $pdo->query("SHOW COLUMNS FROM users LIKE 'full_name'")->rowCount() > 0;

    if (!$hasFullname && $hasFullName) {
        echo "Renaming full_name to fullname...\n";
        $pdo->exec("ALTER TABLE users CHANGE full_name fullname VARCHAR(255)");
    } elseif (!$hasFullname && !$hasFullName) {
         echo "Adding fullname column...\n";
         $pdo->exec("ALTER TABLE users ADD COLUMN fullname VARCHAR(255)");
    }

    // Check for role
    $stmt = $pdo->query("SHOW COLUMNS FROM users LIKE 'role'");
    if ($stmt->rowCount() == 0) {
        echo "Adding role column...\n";
        $pdo->exec("ALTER TABLE users ADD COLUMN role ENUM('normal', 'merchant', 'admin') DEFAULT 'normal' AFTER email");
        // Migrate from is_merchant
        $pdo->exec("UPDATE users SET role = 'merchant' WHERE is_merchant = 1");
    }

    // Check for usdt_price
    $stmt = $pdo->query("SHOW COLUMNS FROM users LIKE 'usdt_price'");
    if ($stmt->rowCount() == 0) {
        echo "Adding usdt_price column...\n";
        $pdo->exec("ALTER TABLE users ADD COLUMN usdt_price DECIMAL(20, 8) DEFAULT NULL");
        $pdo->exec("UPDATE users SET usdt_price = 25000.00 WHERE role = 'merchant'");
    }

} catch (Exception $e) {
    echo "Error updating users table: " . $e->getMessage() . "\n";
}

// 2. Update bank_accounts table
echo "Checking bank_accounts table...\n";
try {
    // Check account_balance
    $stmt = $pdo->query("SHOW COLUMNS FROM bank_accounts LIKE 'account_balance'");
    if ($stmt->rowCount() == 0) {
        echo "Adding account_balance to bank_accounts...\n";
        $pdo->exec("ALTER TABLE bank_accounts ADD COLUMN account_balance DECIMAL(20, 8) DEFAULT 0");
    }

    // Make account_holder nullable as the code doesn't set it on create
    echo "Modifying account_holder to be NULLABLE...\n";
    $pdo->exec("ALTER TABLE bank_accounts MODIFY account_holder VARCHAR(255) NULL");

} catch (Exception $e) {
    echo "Error updating bank_accounts table: " . $e->getMessage() . "\n";
}

echo "Migration completed.\n";
