<?php
require __DIR__ . '/vendor/autoload.php';
use App\Helpers\Database;

$pdo = Database::getConnection();

echo "Applying FULL database schema update...\n";
$sql = file_get_contents(__DIR__ . '/database/schema.sql');

if (!$sql) {
    die("Could not read schema.sql");
}

try {
    // Execute multiple queries
    // PDO::exec doesn't support multiple queries directly in all drivers well, but MySQL usually does.
    // However, splitting by ; is safer generally, but we have to be careful about strings containing ;.
    // Given the file content, splitting by ";\n" or similar might be okay.
    // Let's try executing block by block or the whole thing if driver allows.
    
    // Disable FK checks first
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 0");
    
    $statements = array_filter(array_map('trim', explode(';', $sql)));

    foreach ($statements as $stmt) {
        if (!empty($stmt)) {
            echo "Executing: " . substr($stmt, 0, 50) . "...\n";
            try {
                $pdo->exec($stmt);
            } catch (PDOException $e) {
                echo "Error executing statement: " . $e->getMessage() . "\n";
                // Don't stop on drop error if not exists
            }
        }
    }

    $pdo->exec("SET FOREIGN_KEY_CHECKS = 1");
    echo "Schema update completed.\n";

} catch (Exception $e) {
    echo "Fatal Error: " . $e->getMessage() . "\n";
}
