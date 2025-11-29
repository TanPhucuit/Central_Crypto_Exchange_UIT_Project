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

    public function getByUserId(int $userId): array
    {
        $stmt = $this->db->prepare("
            SELECT * FROM wallets 
            WHERE user_id = ? 
            ORDER BY type, created_at DESC
        ");
        $stmt->execute([$userId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getByUserIdAndSymbol(int $userId, string $symbol): ?array
    {
        // Find a wallet for the user (prefer fund -> spot -> future)
        $stmt = $this->db->prepare("
            SELECT * FROM wallets 
            WHERE user_id = ?
            ORDER BY FIELD(type, 'fund', 'spot', 'future')
            LIMIT 1
        ");
        $stmt->execute([$userId]);
        $wallet = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$wallet) {
            return null;
        }

        // Lookup crypto balance from properties table
        $propStmt = $this->db->prepare("
            SELECT unit_number FROM properties 
            WHERE wallet_id = ? AND symbol = ?
            LIMIT 1
        ");
        $propStmt->execute([$wallet['wallet_id'], $symbol]);
        $prop = $propStmt->fetch(PDO::FETCH_ASSOC);

        // Prefer properties.unit_number for crypto balances. If missing, fall back
        // to wallets.balance (some test data may store crypto amount there).
        if (isset($prop['unit_number'])) {
            $wallet['balance'] = (float)$prop['unit_number'];
        } else {
            // fallback to wallet balance if present (assume it represents crypto units)
            $wallet['balance'] = isset($wallet['balance']) ? (float)$wallet['balance'] : 0;
        }
        $wallet['symbol'] = $symbol;
        return $wallet;
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

    public function findById(int $walletId): ?array
    {
        $stmt = $this->db->prepare("SELECT * FROM wallets WHERE wallet_id = ? LIMIT 1");
        $stmt->execute([$walletId]);
        $wallet = $stmt->fetch(PDO::FETCH_ASSOC);
        return $wallet ?: null;
    }

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
     * Update crypto unit number in properties table for a specific symbol
     */
    public function updatePropertyBalance(int $walletId, string $symbol, float $newUnitNumber): bool
    {
        // Try to update existing property
        $stmt = $this->db->prepare(
            "UPDATE properties SET unit_number = ? WHERE wallet_id = ? AND symbol = ?"
        );
        $updated = $stmt->execute([$newUnitNumber, $walletId, $symbol]);

        // If no rows affected, try insert
        if ($stmt->rowCount() === 0) {
            $ins = $this->db->prepare(
                "INSERT INTO properties (wallet_id, symbol, average_buy_price, unit_number) VALUES (?, ?, ?, ?)"
            );
            return $ins->execute([$walletId, $symbol, 0, $newUnitNumber]);
        }

        return $updated;
    }

    public function setBalance(int $walletId, float $balance): bool
    {
        $stmt = $this->db->prepare("
            UPDATE wallets 
            SET balance = ? 
            WHERE wallet_id = ?
        ");
        return $stmt->execute([$balance, $walletId]);
    }

    public function create(array $data): ?int
    {
        // Insert wallet record according to schema (user_id, type, balance)
        $stmt = $this->db->prepare("
            INSERT INTO wallets (user_id, type, balance)
            VALUES (?, ?, ?)
        ");

        $success = $stmt->execute([
            $data['user_id'],
            $data['type'] ?? 'spot',
            $data['balance'] ?? 0
        ]);

        if (!$success) return null;

        $walletId = (int)$this->db->lastInsertId();

        // If symbol provided, create a properties entry for the crypto balance
        if (!empty($data['symbol'])) {
            $propStmt = $this->db->prepare("
                INSERT INTO properties (wallet_id, symbol, average_buy_price, unit_number)
                VALUES (?, ?, ?, ?)
            ");
            $propStmt->execute([
                $walletId,
                $data['symbol'],
                $data['average_buy_price'] ?? 0,
                $data['balance'] ?? 0
            ]);
        }

        return $walletId;
    }

    // Get wallet with properties (crypto holdings)
    public function getWithProperties(int $walletId): ?array
    {
        $wallet = $this->findById($walletId);
        if (!$wallet) {
            return null;
        }

        $stmt = $this->db->prepare("
            SELECT * FROM properties 
            WHERE wallet_id = ?
        ");
        $stmt->execute([$walletId]);
        $wallet['properties'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return $wallet;
    }
}
