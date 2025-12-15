<?php
require __DIR__ . '/../vendor/autoload.php';

use App\Helpers\Database;

$schemaFile = __DIR__ . '/../database/schema.sql';

if (!file_exists($schemaFile)) {
    die("Schema file not found!\n");
}

try {
    echo "Initializing database schema...\n";
    $pdo = Database::getConnection();
    
    $sql = file_get_contents($schemaFile);
    
    // Split by semicolon? Or just execute?
    // Some detailed SQL parsing might be needed if there are delimiters, 
    // but schema.sql looks simple enough to be split by ';'.
    
    $statements = array_filter(array_map('trim', explode(';', $sql)));

    foreach ($statements as $stmt) {
        if (!empty($stmt)) {
            // echo "Executing: " . substr($stmt, 0, 50) . "...\n";
            try {
                $pdo->exec($stmt);
            } catch (\PDOException $e) {
                // Ignore "Table already exists" or similar if pertinent, but IF NOT EXISTS handles it.
                // However, views might fail if dependent tables aren't there yet, but order seems ok.
                echo "Warning on statement: " . substr($stmt, 0, 50) . "...\n";
                echo "Error: " . $e->getMessage() . "\n";
            }
        }
    }
    
    echo "Schema initialized successfully.\n";

} catch (\Exception $e) {
    die("Error: " . $e->getMessage() . "\n");
}
