<?php

namespace App\Models;

use App\Helpers\Database;
use PDO;

class User
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    public function findByEmail(string $email): ?array
    {
        $stmt = $this->db->prepare("SELECT * FROM users WHERE email = ? LIMIT 1");
        $stmt->execute([$email]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        return $user ?: null;
    }

    public function findByUsername(string $username): ?array
    {
        $stmt = $this->db->prepare("SELECT * FROM users WHERE username = ? LIMIT 1");
        $stmt->execute([$username]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        return $user ?: null;
    }

    public function findById(int $userId): ?array
    {
        $stmt = $this->db->prepare("SELECT * FROM users WHERE user_id = ? LIMIT 1");
        $stmt->execute([$userId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        return $user ?: null;
    }

    public function create(array $data): ?int
    {
        $stmt = $this->db->prepare("
            INSERT INTO users (username, password, email, role)
            VALUES (?, ?, ?, ?)
        ");

        try {
            $success = $stmt->execute([
                $data['username'],
                $data['password'],
                $data['email'],
                $data['role'] ?? 'normal'
            ]);
            return $success ? (int)$this->db->lastInsertId() : null;
        } catch (\PDOException $e) {
            error_log("User create failed: " . $e->getMessage());
            throw $e;
        }
    }

    public function update(int $userId, array $data): bool
    {
        $fields = [];
        $values = [];

        foreach ($data as $key => $value) {
            if (in_array($key, ['username', 'email', 'role'])) {
                $fields[] = "$key = ?";
                $values[] = $value;
            }
        }

        if (empty($fields)) {
            return false;
        }

        $values[] = $userId;

        $sql = "UPDATE users SET " . implode(', ', $fields) . " WHERE user_id = ?";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute($values);
    }

    public function verifyPassword(string $password, string $hash): bool
    {
        return password_verify($password, $hash);
    }

    public function updatePassword(int $userId, string $newPassword): bool
    {
        $stmt = $this->db->prepare("UPDATE users SET password = ? WHERE user_id = ?");
        return $stmt->execute([$newPassword, $userId]);
    }

    public function setMerchantRole(int $userId, bool $isMerchant = true): bool
    {
        $role = $isMerchant ? 'merchant' : 'normal';
        $stmt = $this->db->prepare("UPDATE users SET role = ? WHERE user_id = ?");
        return $stmt->execute([$role, $userId]);
    }

    public function getMerchants(): array
    {
        $stmt = $this->db->prepare("
            SELECT user_id, username, fullname, email, usdt_price, role, created_at 
            FROM users 
            WHERE role = 'merchant'
            ORDER BY username ASC
        ");
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function updateUsdtPrice(int $userId, float $price): bool
    {
        $stmt = $this->db->prepare("UPDATE users SET usdt_price = ? WHERE user_id = ? AND role = 'merchant'");
        return $stmt->execute([$price, $userId]);
    }
}
