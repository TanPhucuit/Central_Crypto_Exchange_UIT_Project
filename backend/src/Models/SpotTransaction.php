<?php

namespace App\Models;

use App\Helpers\Database;
use PDO;

class SpotTransaction
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    public function getByWalletId(int $walletId, int $limit = 50, int $offset = 0): array
    {
        $limit = (int)$limit;
        $offset = (int)$offset;
        $stmt = $this->db->prepare("
            SELECT * FROM spot_transactions 
            WHERE wallet_id = ?
            ORDER BY ts DESC
            LIMIT {$limit} OFFSET {$offset}
        ");
        $stmt->execute([$walletId]);
        return $stmt->fetchAll();
    }

    public function getBySymbol(string $symbol, int $limit = 50): array
    {
        $limit = (int)$limit;
        $stmt = $this->db->prepare("
            SELECT * FROM spot_transactions 
            WHERE symbol = ?
            ORDER BY ts DESC
            LIMIT {$limit}
        ");
        $stmt->execute([$symbol]);
        return $stmt->fetchAll();
    }

    public function create(array $data): ?int
    {
        $stmt = $this->db->prepare("
            INSERT INTO spot_transactions 
            (wallet_id, symbol, type, index_price, unit_numbers, amount, profit)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");
        
        $success = $stmt->execute([
            $data['wallet_id'],
            $data['symbol'],
            $data['type'],
            $data['index_price'],
            $data['unit_numbers'],
            $data['amount'],
            $data['profit'] ?? null
        ]);

        return $success ? (int)$this->db->lastInsertId() : null;
    }

    public function getTotalByWalletAndSymbol(int $walletId, string $symbol): array
    {
        $stmt = $this->db->prepare("
            SELECT 
                type,
                COUNT(*) as count,
                SUM(unit_numbers) as total_units,
                SUM(amount) as total_amount,
                AVG(index_price) as avg_price
            FROM spot_transactions
            WHERE wallet_id = ? AND symbol = ?
            GROUP BY type
        ");
        $stmt->execute([$walletId, $symbol]);
        return $stmt->fetchAll();
    }
}
