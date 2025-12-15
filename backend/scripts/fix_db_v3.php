<?php
require __DIR__ . '/../vendor/autoload.php';
use App\Helpers\Database;

// Load env
try {
    $dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/../');
    $dotenv->load();
} catch (\Exception $e) {}

$pdo = Database::getConnection();

echo "Applying Schema V3 Fixes based on schema.csv...\n";

try {
    // 1. Wallets
    echo "Fixing Wallets table...\n";
    // Check if column 'currency' exists and drop it if found? Or just ensure 'type' exists.
    // Schema.csv: wallet_id, user_id, type, balance, created_at, updated_at
    
    // Check/Add 'type'
    try {
        $pdo->query("SELECT type FROM wallets LIMIT 1");
    } catch (\Exception $e) {
        echo "Adding 'type' to wallets...\n";
        $pdo->exec("ALTER TABLE wallets ADD COLUMN type ENUM('fund', 'spot', 'future') NOT NULL DEFAULT 'spot' AFTER user_id");
    }

    // Check/Drop 'currency' if it exists (since schema.csv doesn't have it)
    try {
         $res = $pdo->query("SHOW COLUMNS FROM wallets LIKE 'currency'");
         if ($res->rowCount() > 0) {
             echo "Dropping 'currency' from wallets (not in schema.csv)...\n";
             // Dropping unique key first if exists
             try {
                $pdo->exec("ALTER TABLE wallets DROP INDEX unique_user_currency");
             } catch (\Exception $e) {}
             
             // Now drop column
             $pdo->exec("ALTER TABLE wallets DROP COLUMN currency");
         }
    } catch (\Exception $e) {
        echo "Error checking currency: " . $e->getMessage() . "\n";
    }

    // 2. Users
    echo "Fixing Users table...\n";
    // Schema.csv: user_id, username, password, email, role, created_at, updated_at, usdt_price, fullname
    $userCols = ['usdt_price' => 'DOUBLE', 'fullname' => 'TEXT'];
    foreach ($userCols as $col => $def) {
        try {
            $pdo->query("SELECT $col FROM users LIMIT 1");
        } catch (\Exception $e) {
             echo "Adding '$col' to users...\n";
             $pdo->exec("ALTER TABLE users ADD COLUMN $col $def");
        }
    }

    // 3. Bank Accounts
    echo "Fixing Bank Accounts table...\n";
    // Schema.csv: account_number (PK), bank_name, user_id, account_balance
    // Current DB might have 'id' PK.
    try {
        $res = $pdo->query("SHOW COLUMNS FROM bank_accounts LIKE 'id'");
        if ($res->rowCount() > 0) {
             echo "Detected 'id' in bank_accounts. Dropping it and setting account_number as PK...\n";
             $pdo->exec("ALTER TABLE bank_accounts MODIFY id BIGINT NOT NULL"); // remove auto_increment
             $pdo->exec("ALTER TABLE bank_accounts DROP PRIMARY KEY");
             $pdo->exec("ALTER TABLE bank_accounts DROP COLUMN id");
             $pdo->exec("ALTER TABLE bank_accounts ADD PRIMARY KEY (account_number)");
        }
    } catch (\Exception $e) {}

    // Check account_holder removal
    try {
        $res = $pdo->query("SHOW COLUMNS FROM bank_accounts LIKE 'account_holder'");
        if ($res->rowCount() > 0) {
            echo "Dropping 'account_holder' from bank_accounts...\n";
            $pdo->exec("ALTER TABLE bank_accounts DROP COLUMN account_holder");
        }
    } catch (\Exception $e) {}

    // Check account_balance
    try {
        $pdo->query("SELECT account_balance FROM bank_accounts LIMIT 1");
    } catch (\Exception $e) {
        echo "Adding account_balance to bank_accounts...\n";
        $pdo->exec("ALTER TABLE bank_accounts ADD COLUMN account_balance DECIMAL(28, 8) NOT NULL DEFAULT 0");
    }
    
    // 4. Properties
    echo "Fixing Properties table...\n";
    // Ensure properties table exists
    $pdo->exec("CREATE TABLE IF NOT EXISTS properties (
        wallet_id BIGINT(20) UNSIGNED NOT NULL,
        symbol VARCHAR(32) NOT NULL,
        average_buy_price DECIMAL(28, 8) NOT NULL DEFAULT 0,
        unit_number DECIMAL(28, 8) NOT NULL DEFAULT 0,
        PRIMARY KEY (wallet_id, symbol)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    echo "Schema V3 Fixes Applied.\n";

} catch (\Exception $e) {
    echo "Fatal Error: " . $e->getMessage() . "\n";
}
