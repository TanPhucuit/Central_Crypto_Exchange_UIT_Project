<?php
/**
 * Script to apply the future_orders schema fix migration
 * Run this script to update the database schema
 */

require_once __DIR__ . '/vendor/autoload.php';

use App\Helpers\Database;

try {
    echo "Starting future_orders schema migration...\n";
    
    $db = Database::getConnection();
    
    // Read the migration file
    $migrationFile = __DIR__ . '/database/migrations/0005_fix_future_orders_schema.sql';
    
    if (!file_exists($migrationFile)) {
        throw new Exception("Migration file not found: $migrationFile");
    }
    
    $sql = file_get_contents($migrationFile);
    
    echo "Executing migration...\n";
    
    // Execute the migration
    $db->exec($sql);
    
    echo "✓ Migration completed successfully!\n";
    
    // Verify the schema
    echo "\nVerifying new schema...\n";
    $stmt = $db->prepare("SHOW COLUMNS FROM future_orders");
    $stmt->execute();
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "Current columns in future_orders table:\n";
    foreach ($columns as $col) {
        echo "  - {$col['Field']} ({$col['Type']})\n";
    }
    
    echo "\n✓ Schema verification complete!\n";
    
} catch (Exception $e) {
    echo "✗ Error: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
    exit(1);
}
