<?php

namespace App\Models;

use App\Helpers\Database;
use PDO;

class P2POrder
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    public function getByUserId(int $userId, int $limit = 50): array
    {
        $limit = (int)$limit;
        $stmt = $this->db->prepare("
            SELECT * FROM p2p_orders 
            WHERE user_id = ?
            ORDER BY ts DESC
            LIMIT {$limit}
        ");
        $stmt->execute([$userId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getByMerchantId(int $merchantId, int $limit = 50): array
    {
        $limit = (int)$limit;
        $stmt = $this->db->prepare("
            SELECT * FROM p2p_orders 
            WHERE merchant_id = ?
            ORDER BY ts DESC
            LIMIT {$limit}
        ");
        $stmt->execute([$merchantId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getOpenOrders(int $limit = 50, int $offset = 0): array
    {
        $limit = (int)$limit;
        $offset = (int)$offset;
        $stmt = $this->db->prepare("
            SELECT * FROM p2p_orders 
            WHERE state = 'open'
            ORDER BY ts DESC
            LIMIT {$limit} OFFSET {$offset}
        ");
        $stmt->execute([]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function findById(int $orderId): ?array
    {
        $stmt = $this->db->prepare("
            SELECT * FROM p2p_orders 
            WHERE order_id = ?
            LIMIT 1
        ");
        $stmt->execute([$orderId]);
        $order = $stmt->fetch(PDO::FETCH_ASSOC);
        return $order ?: null;
    }

    public function create(array $data): ?int
    {
        $stmt = $this->db->prepare("
            INSERT INTO p2p_orders 
            (user_id, merchant_id, type, unit_numbers, state)
            VALUES (?, ?, ?, ?, ?)
        ");
        
        $success = $stmt->execute([
            $data['user_id'],
            $data['merchant_id'] ?? null,
            $data['type'],
            $data['unit_numbers'],
            $data['state'] ?? 'open'
        ]);

        return $success ? (int)$this->db->lastInsertId() : null;
    }

    public function updateState(int $orderId, string $state): bool
    {
        $stmt = $this->db->prepare("
            UPDATE p2p_orders 
            SET state = ?
            WHERE order_id = ?
        ");
        return $stmt->execute([$state, $orderId]);
    }

    public function linkTransaction(int $orderId, int $transactionId): bool
    {
        $stmt = $this->db->prepare("
            UPDATE p2p_orders 
            SET transaction_id = ?, state = 'filled'
            WHERE order_id = ?
        ");
        return $stmt->execute([$transactionId, $orderId]);
    }

    public function matchWithMerchant(int $orderId, int $merchantId): bool
    {
        $stmt = $this->db->prepare("
            UPDATE p2p_orders 
            SET merchant_id = ?, state = 'matched'
            WHERE order_id = ?
        ");
        return $stmt->execute([$merchantId, $orderId]);
    }

    public function getTotalOrdersByMerchant(int $merchantId): int
    {
        $stmt = $this->db->prepare("
            SELECT COUNT(*) as total 
            FROM p2p_orders 
            WHERE merchant_id = ?
        ");
        $stmt->execute([$merchantId]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return (int)($result['total'] ?? 0);
    }

    public function getCompletedOrdersByMerchant(int $merchantId): int
    {
        $stmt = $this->db->prepare("
            SELECT COUNT(*) as total 
            FROM p2p_orders 
            WHERE merchant_id = ? AND state = 'filled'
        ");
        $stmt->execute([$merchantId]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return (int)($result['total'] ?? 0);
    }

    public function getTotalVolumeByMerchant(int $merchantId): float
    {
        $stmt = $this->db->prepare("
            SELECT SUM(unit_numbers) as total_volume 
            FROM p2p_orders 
            WHERE merchant_id = ?
        ");
        $stmt->execute([$merchantId]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return (float)($result['total_volume'] ?? 0);
    }

    public function getOrdersByMerchant(int $merchantId, int $limit = 100): array
    {
        $limit = (int)$limit;
        $stmt = $this->db->prepare("
            SELECT 
                p.order_id,
                p.user_id,
                p.merchant_id,
                p.type,
                p.unit_numbers as amount,
                p.state,
                p.transaction_id,
                p.ts as created_at,
                u.username as user_username,
                u.email as user_email,
                COALESCE(p.unit_numbers * m.usdt_price, 0) as total
            FROM p2p_orders p
            LEFT JOIN users u ON p.user_id = u.user_id
            LEFT JOIN users m ON p.merchant_id = m.user_id
            WHERE p.merchant_id = ?
            ORDER BY p.ts DESC
            LIMIT {$limit}
        ");
        $stmt->execute([$merchantId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}

