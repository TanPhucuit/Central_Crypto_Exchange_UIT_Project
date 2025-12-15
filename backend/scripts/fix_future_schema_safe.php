<?php
try {

    $config = require __DIR__ . '/../config/database.php';
    echo "Config loaded: Host={$config['host']}, DB={$config['database']}, User={$config['username']}\n";
    
    echo "Fixing future_orders table schema...\n";
    
    $dsn = sprintf(
        "mysql:host=%s;port=%s;dbname=%s;charset=%s",
        $config['host'],
        $config['port'],
        $config['database'],
        $config['charset'] ?? 'utf8mb4'
    );
    
    $pdo = new PDO($dsn, $config['username'], $config['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    
    // Get current columns
    $stmt = $pdo->query("SHOW COLUMNS FROM future_orders");
    $columns = $stmt->fetchAll(PDO::FETCH_COLUMN);
    $columns = array_map('strtolower', $columns);
    
    echo "Current columns: " . implode(', ', $columns) . "\n";
    
    // Define desired changes
    // We want: side, entry_price, position_size, margin, exit_price
    
    if (!in_array('side', $columns)) {
        echo "Adding 'side' column...\n";
        $pdo->exec("ALTER TABLE `future_orders` ADD COLUMN `side` ENUM('long','short') NOT NULL DEFAULT 'long' AFTER `symbol`");
    } else {
        echo "'side' column exists.\n";
    }

    if (!in_array('entry_price', $columns)) {
        echo "Adding 'entry_price' column...\n";
        $pdo->exec("ALTER TABLE `future_orders` ADD COLUMN `entry_price` DECIMAL(28,8) NOT NULL DEFAULT 0 AFTER `side`");
    } else {
        echo "'entry_price' column exists. Updating type...\n";
        // Convert DOUBLE to DECIMAL if needed
        $pdo->exec("ALTER TABLE `future_orders` MODIFY COLUMN `entry_price` DECIMAL(28,8) NOT NULL DEFAULT 0");
    }

    if (!in_array('position_size', $columns)) {
        echo "Adding 'position_size' column...\n";
        $pdo->exec("ALTER TABLE `future_orders` ADD COLUMN `position_size` DECIMAL(28,8) NOT NULL DEFAULT 0 AFTER `entry_price`");
    } else {
        echo "'position_size' column exists.\n";
    }

    if (!in_array('margin', $columns)) {
        echo "Adding 'margin' column...\n";
        $pdo->exec("ALTER TABLE `future_orders` ADD COLUMN `margin` DECIMAL(28,8) NOT NULL DEFAULT 0 AFTER `position_size`");
    } else {
        echo "'margin' column exists. Updating type...\n";
        $pdo->exec("ALTER TABLE `future_orders` MODIFY COLUMN `margin` DECIMAL(28,8) NOT NULL DEFAULT 0");
    }

    if (!in_array('exit_price', $columns)) {
        echo "Adding 'exit_price' column...\n";
        $pdo->exec("ALTER TABLE `future_orders` ADD COLUMN `exit_price` DECIMAL(28,8) DEFAULT NULL AFTER `close_ts`");
    } else {
        echo "'exit_price' column exists.\n";
    }

    echo "Schema fix complete.\n";

} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
