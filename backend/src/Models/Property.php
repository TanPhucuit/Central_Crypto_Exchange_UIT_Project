<?php

namespace App\Models;

use App\Helpers\Database;
use PDO;

class Property
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    public function getByWalletId(int $walletId): array
    {
        $stmt = $this->db->prepare("
            SELECT * FROM properties 
            WHERE wallet_id = ?
            ORDER BY symbol
        ");
        $stmt->execute([$walletId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getByWalletAndSymbol(int $walletId, string $symbol): ?array
    {
        $stmt = $this->db->prepare("
            SELECT * FROM properties 
            WHERE wallet_id = ? AND symbol = ?
            LIMIT 1
        ");
        $stmt->execute([$walletId, $symbol]);
        $property = $stmt->fetch(PDO::FETCH_ASSOC);
        return $property ?: null;
    }

    public function create(int $walletId, string $symbol, float $averageBuyPrice = 0, float $unitNumbers = 0): bool
    {
        $stmt = $this->db->prepare("
            INSERT INTO properties (wallet_id, symbol, average_buy_price, unit_number)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                average_buy_price = VALUES(average_buy_price),
                unit_number = VALUES(unit_number)
        ");
        try {
            $success = $stmt->execute([$walletId, $symbol, $averageBuyPrice, $unitNumbers]);
            if ($success) {
                return true;
            }
            $err = $stmt->errorInfo();
            throw new \RuntimeException('Property create failed: ' . json_encode($err));
        } catch (\Throwable $e) {
            // rethrow so caller (controller) can log and rollback
            throw $e;
        }
    }

    public function updateUnitNumber(int $walletId, string $symbol, float $delta): bool
    {
        $stmt = $this->db->prepare("
            UPDATE properties 
            SET unit_number = unit_number + ?
            WHERE wallet_id = ? AND symbol = ?
        ");
        return $stmt->execute([$delta, $walletId, $symbol]);
    }

    public function updateAverageBuyPrice(int $walletId, string $symbol, float $newAvg): bool
    {
        $stmt = $this->db->prepare("
            UPDATE properties 
            SET average_buy_price = ?
            WHERE wallet_id = ? AND symbol = ?
        ");
        return $stmt->execute([$newAvg, $walletId, $symbol]);
    }

    public function delete(int $walletId, string $symbol): bool
    {
        $stmt = $this->db->prepare("
            DELETE FROM properties 
            WHERE wallet_id = ? AND symbol = ?
        ");
        return $stmt->execute([$walletId, $symbol]);
    }
}
