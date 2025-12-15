<?php
/**
 * Migration script: Add type column to p2p_orders table
 */

require_once __DIR__ . '/config/database.php';

try {
    // Get database connection
    $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
    $pdo = new PDO($dsn, DB_USER, DB_PASS);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "Connected to database: " . DB_NAME . "\n\n";
    
    // Check if column already exists
    $checkSql = "SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.COLUMNS 
                 WHERE table_schema = :dbname 
                 AND table_name = 'p2p_orders' 
                 AND column_name = 'type'";
    
    $stmt = $pdo->prepare($checkSql);
    $stmt->execute(['dbname' => DB_NAME]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($result['count'] > 0) {
        echo "✓ Column 'type' already exists in p2p_orders table.\n";
    } else {
        echo "Adding 'type' column to p2p_orders table...\n";
        
        // Add the column
        $alterSql = "ALTER TABLE p2p_orders 
                     ADD COLUMN `type` ENUM('buy', 'sell') NOT NULL DEFAULT 'buy' 
                     AFTER `merchant_id`";
        
        $pdo->exec($alterSql);
        echo "✓ Column 'type' added successfully!\n\n";
        
        // Update existing records
        echo "Updating existing orders with default type 'buy'...\n";
        $updateSql = "UPDATE p2p_orders SET type = 'buy' WHERE type IS NULL OR type = ''";
        $affected = $pdo->exec($updateSql);
        echo "✓ Updated {$affected} existing orders.\n";
    }
    
    // Display current table structure
    echo "\nCurrent p2p_orders table structure:\n";
    echo "-----------------------------------\n";
    $describeSql = "DESCRIBE p2p_orders";
    $stmt = $pdo->query($describeSql);
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($columns as $column) {
        echo sprintf("%-20s %-30s %s\n", 
            $column['Field'], 
            $column['Type'], 
            $column['Null'] === 'NO' ? 'NOT NULL' : 'NULL'
        );
    }
    
    echo "\n✓ Migration completed successfully!\n";
    
} catch (PDOException $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}
