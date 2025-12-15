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
            SELECT 
                p.p2p_order_id as order_id,
                p.user_id,
                p.merchant_id,
                p.amount as unit_numbers,
                p.price,
                p.status as state,
                p.type,
                p.transaction_id,
                p.created_at,
                p.updated_at,
                u.username as merchant_username,
                u.fullname as merchant_fullname,
                u.usdt_price as merchant_price
            FROM p2p_orders p
            LEFT JOIN users u ON p.merchant_id = u.user_id
            WHERE p.user_id = ?
            ORDER BY p.created_at DESC
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
            ORDER BY created_at DESC
            LIMIT {$limit}
        ");
        $stmt->execute([$merchantId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getOpenOrders(int $limit = 50): array
    {
        // Status 'pending' includes both open and matched-waiting-for-release
        // We might want only those without transaction_id? 
        // For now, list all pending.
        $stmt = $this->db->prepare("
            SELECT p.*, u.username as merchant_name 
            FROM p2p_orders p
            LEFT JOIN users u ON p.user_id = u.user_id
            WHERE p.status = 'pending'
            ORDER BY p.created_at DESC
            LIMIT ?
        ");
        $stmt->bindValue(1, $limit, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function findById(int $orderId): ?array
    {
        $stmt = $this->db->prepare("
            SELECT * FROM p2p_orders 
            WHERE p2p_order_id = ?
            LIMIT 1
        ");
        $stmt->execute([$orderId]);
        $order = $stmt->fetch(PDO::FETCH_ASSOC);
        return $order ?: null;
    }

    public function create(array $data): ?int
    {
        try {
            // Mapping:
            // unit_numbers -> amount (Quantity of crypto)
            // state -> status (pending)
            // Note: DB schema also has 'price' (USD price per unit?). 
            // Controller needs to provide 'price'.
            
            $stmt = $this->db->prepare("
                INSERT INTO p2p_orders 
                (user_id, merchant_id, amount, price, type, status)
                VALUES (?, ?, ?, ?, ?, ?)
            ");
            
            $success = $stmt->execute([
                $data['user_id'],
                $data['merchant_id'] ?? null,
                $data['amount'], // was unit_numbers
                $data['price'] ?? 0, // ensure price is passed
                $data['type'] ?? 'buy', // buy or sell
                $data['status'] ?? 'pending' 
            ]);

            return $success ? (int)$this->db->lastInsertId() : null;
        } catch (\PDOException $e) {
            error_log("P2POrder Create Error: " . $e->getMessage());
            return null;
        }
    }

    public function updateStatus(int $orderId, string $status): bool
    {
        $stmt = $this->db->prepare("
            UPDATE p2p_orders 
            SET status = ?
            WHERE p2p_order_id = ?
        ");
        return $stmt->execute([$status, $orderId]);
    }

    public function linkTransaction(int $orderId, int $transactionId): bool
    {
        // When user pays, we link transaction. Status stays 'pending' but logic knows it's paid.
        // Or we could use 'disputed' if user claims paid but merchant denies?
        // Let's keep 'pending'.
        $stmt = $this->db->prepare("
            UPDATE p2p_orders 
            SET transaction_id = ?
            WHERE p2p_order_id = ?
        ");
        return $stmt->execute([$transactionId, $orderId]);
    }

    public function matchWithMerchant(int $orderId, int $merchantId): bool
    {
        $stmt = $this->db->prepare("
            UPDATE p2p_orders 
            SET merchant_id = ?
            WHERE p2p_order_id = ?
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
            WHERE merchant_id = ? AND status = 'completed'
        ");
        $stmt->execute([$merchantId]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return (int)($result['total'] ?? 0);
    }

    public function getTotalVolumeByMerchant(int $merchantId): float
    {
        $stmt = $this->db->prepare("
            SELECT SUM(amount) as total_volume 
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
                p.p2p_order_id as order_id,
                p.user_id,
                p.merchant_id,
                p.type,
                p.amount,
                p.status as state, -- Alias for frontend compat
                p.transaction_id,
                p.created_at,
                u.username as user_username,
                u.email as user_email,
                COALESCE(p.amount * p.price, 0) as total
            FROM p2p_orders p
            LEFT JOIN users u ON p.user_id = u.user_id
            WHERE p.merchant_id = ?
            ORDER BY p.created_at DESC
            LIMIT {$limit}
        ");
        $stmt->execute([$merchantId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}

