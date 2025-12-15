<?php
require __DIR__ . '/vendor/autoload.php';

use App\Helpers\Database;

$pdo = Database::getConnection();

$userId = 15;

echo "Checking data for User ID: $userId\n";

// Check User
$stmt = $pdo->prepare("SELECT * FROM users WHERE user_id = ?");
$stmt->execute([$userId]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

print_r($user);

if ($user) {
    echo "User Role: " . $user['role'] . "\n";
}

// Check Wallets
echo "\nWallets:\n";
$stmt = $pdo->prepare("SELECT * FROM wallets WHERE user_id = ?");
$stmt->execute([$userId]);
$wallets = $stmt->fetchAll(PDO::FETCH_ASSOC);

print_r($wallets);
