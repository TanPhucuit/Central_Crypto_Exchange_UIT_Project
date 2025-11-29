<?php

namespace App\Models;

use App\Helpers\Database;
use PDO;

class InternalTransfer
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    public function create(array $data): ?int
    {
        $stmt = $this->db->prepare("
            INSERT INTO internal_transfers (source_wallet_id, target_wallet_id, transfer_amount)
            VALUES (?, ?, ?)
        ");

        $success = $stmt->execute([
            $data['source_wallet_id'],
            $data['target_wallet_id'],
            $data['transfer_amount'],
        ]);

        return $success ? (int)$this->db->lastInsertId() : null;
    }

    public function getByWalletIds(array $walletIds, int $limit = 50): array
    {
        if (empty($walletIds)) {
            return [];
        }

        $limit = (int)$limit;
        $placeholders = str_repeat('?,', count($walletIds) - 1) . '?';
        $stmt = $this->db->prepare("
            SELECT * FROM internal_transfers
            WHERE source_wallet_id IN ($placeholders)
               OR target_wallet_id IN ($placeholders)
            ORDER BY ts DESC
            LIMIT {$limit}
        ");
        $params = array_merge($walletIds, $walletIds);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
