<?php
// Check what columns exist in users table
require_once __DIR__ . '/vendor/autoload.php';

use App\Helpers\Database;

$db = Database::getConnection();

$stmt = $db->prepare("DESCRIBE users");
$stmt->execute();
$columns = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "Columns in 'users' table:\n";
echo str_repeat("=", 80) . "\n";
foreach ($columns as $col) {
    printf("%-20s %-20s %-10s %-10s\n", 
        $col['Field'], 
        $col['Type'], 
        $col['Null'], 
        $col['Key']
    );
}
echo str_repeat("=", 80) . "\n";

// Check if full_name exists
$hasFullName = false;
$hasUsdtPrice = false;
foreach ($columns as $col) {
    if ($col['Field'] === 'full_name') $hasFullName = true;
    if ($col['Field'] === 'usdt_price') $hasUsdtPrice = true;
}

echo "\nColumn check:\n";
echo "full_name exists: " . ($hasFullName ? "YES ✓" : "NO ✗") . "\n";
echo "usdt_price exists: " . ($hasUsdtPrice ? "YES ✓" : "NO ✗") . "\n";

if (!$hasFullName || !$hasUsdtPrice) {
    echo "\n⚠️  Missing columns detected!\n";
    echo "Please run the SQL commands in add_columns.sql\n";
}
