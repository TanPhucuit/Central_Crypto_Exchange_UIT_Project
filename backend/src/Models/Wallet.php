<?php

namespace App\Models;

use App\Helpers\Database;
use PDO;

class Wallet
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    public function getByUserIdAndType(int $userId, string $type): ?array
    {
        $stmt = $this->db->prepare("
            SELECT * FROM wallets 
            WHERE user_id = ? AND type = ?
            LIMIT 1
        ");
        $stmt->execute([$userId, $type]);
        $wallet = $stmt->fetch(PDO::FETCH_ASSOC);
        return $wallet ?: null;
    }

    /**
     * Get all wallets for a user
     */
    public function getByUserId(int $userId): array
    {
        $stmt = $this->db->prepare("
            SELECT * FROM wallets 
            WHERE user_id = ? 
            ORDER BY type, wallet_id ASC
        ");
        $stmt->execute([$userId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Find wallet by ID
     */
    public function findById(int $walletId): ?array
    {
        $stmt = $this->db->prepare("SELECT * FROM wallets WHERE wallet_id = ? LIMIT 1");
        $stmt->execute([$walletId]);
        $wallet = $stmt->fetch(PDO::FETCH_ASSOC);
        return $wallet ?: null;
    }

    /**
     * Update wallet balance
     */
    public function updateBalance(int $walletId, float $newBalance): bool
    {
        $stmt = $this->db->prepare("
            UPDATE wallets 
            SET balance = ? 
            WHERE wallet_id = ?
        ");
        return $stmt->execute([$newBalance, $walletId]);
    }

    /**
     * Set wallet balance (alias for updateBalance)
     */
    public function setBalance(int $walletId, float $balance): bool
    {
        return $this->updateBalance($walletId, $balance);
    }

    /**
     * Create new wallet
     */
    public function create(int $userId, string $type, float $balance = 0): ?int
    {
        $stmt = $this->db->prepare("
            INSERT INTO wallets (user_id, type, balance)
            VALUES (?, ?, ?)
        ");
        
        $success = $stmt->execute([$userId, $type, $balance]);
        
        return $success ? (int)$this->db->lastInsertId() : null;
    }

    /**
     * Lock balance (for pending orders)
     */
    public function lockBalance(int $walletId, float $amount): bool
    {
        $stmt = $this->db->prepare("
            UPDATE wallets 
            SET balance = balance - ?, 
                locked_balance = locked_balance + ? 
            WHERE wallet_id = ? AND balance >= ?
        ");
        return $stmt->execute([$amount, $amount, $walletId, $amount]);
    }

    /**
     * Unlock balance (when order cancelled)
     */
    public function unlockBalance(int $walletId, float $amount): bool
    {
        $stmt = $this->db->prepare("
            UPDATE wallets 
            SET balance = balance + ?, 
                locked_balance = locked_balance - ? 
            WHERE wallet_id = ? AND locked_balance >= ?
        ");
        return $stmt->execute([$amount, $amount, $walletId, $amount]);
    }

    /**
     * Deduct from locked balance (when order completed)
     */
    public function deductLockedBalance(int $walletId, float $amount): bool
    {
        $stmt = $this->db->prepare("
            UPDATE wallets 
            SET locked_balance = locked_balance - ? 
            WHERE wallet_id = ? AND locked_balance >= ?
        ");
        return $stmt->execute([$amount, $walletId, $amount]);
    }
}
