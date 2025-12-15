<?php
require __DIR__ . '/vendor/autoload.php';

use App\Helpers\Database;

$pdo = Database::getConnection();

echo "Starting schema migration...\n";

try {
    // Disable Foreign Keys
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 0");
    echo "Foreign keys disabled.\n";

    // Drop properties table
    $pdo->exec("DROP TABLE IF EXISTS properties");
    echo "Table 'properties' dropped.\n";

    // Alter wallets table
    // Check if column exists is hard in generic SQL without procedure, so we'll just try/catch or use a smart query if mysql.
    // simpler to just try adding.
    
    try {
        $pdo->exec("ALTER TABLE wallets ADD COLUMN type varchar(20) NOT NULL DEFAULT 'spot'");
        echo "Column 'type' added to wallets.\n";
    } catch (PDOException $e) {
        echo "Column 'type' might already exist or error: " . $e->getMessage() . "\n";
    }

    try {
        $pdo->exec("ALTER TABLE wallets ADD COLUMN balance decimal(28,8) NOT NULL DEFAULT 0");
        echo "Column 'balance' added to wallets.\n";
    } catch (PDOException $e) {
        echo "Column 'balance' might already exist or error: " . $e->getMessage() . "\n";
    }

    // Enable Foreign Keys
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 1");
    echo "Foreign keys enabled.\n";
    
    echo "Migration completed successfully.\n";

} catch (Exception $e) {
    echo "Migration failed: " . $e->getMessage() . "\n";
    exit(1);
}
