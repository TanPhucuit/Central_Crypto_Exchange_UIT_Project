<?php

namespace App\Models;

use App\Helpers\Database;
use PDO;

class AccountTransaction
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    public function getByAccountNumber(string $accountNumber, int $limit = 50): array
    {
        $limit = (int)$limit;
        $stmt = $this->db->prepare("
            SELECT * FROM account_transactions 
            WHERE source_account_number = ? OR target_account_number = ?
            ORDER BY ts DESC
            LIMIT {$limit}
        ");
        $stmt->execute([$accountNumber, $accountNumber]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function findById(int $transactionId): ?array
    {
        $stmt = $this->db->prepare("
            SELECT * FROM account_transactions 
            WHERE transaction_id = ?
            LIMIT 1
        ");
        $stmt->execute([$transactionId]);
        $transaction = $stmt->fetch(PDO::FETCH_ASSOC);
        return $transaction ?: null;
    }

    public function create(array $data): ?int
    {
        $stmt = $this->db->prepare("
            INSERT INTO account_transactions 
            (source_account_number, target_account_number, transaction_amount, note)
            VALUES (?, ?, ?, ?)
        ");
        
        $success = $stmt->execute([
            $data['source_account'] ?? $data['source_account_number'],
            $data['destination_account_number'] ?? $data['target_account_number'],
            $data['amount'] ?? $data['transaction_amount'],
            $data['note'] ?? null
        ]);

        return $success ? (int)$this->db->lastInsertId() : null;
    }

    public function getRecent(int $limit = 100): array
    {
        $limit = (int)$limit;
        $stmt = $this->db->prepare("
            SELECT * FROM account_transactions 
            ORDER BY ts DESC
            LIMIT {$limit}
        ");
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Check if a transaction exists for a P2P order
     * Returns transaction data if exists, null otherwise
     */
    public function getTransactionByOrderId(int $orderId): ?array
    {
        $stmt = $this->db->prepare("
            SELECT * FROM account_transactions 
            WHERE order_id = ?
            LIMIT 1
        ");
        $stmt->execute([$orderId]);
        $transaction = $stmt->fetch(PDO::FETCH_ASSOC);
        return $transaction ?: null;
    }

    /**
     * Get all transactions for a merchant's bank accounts
     */
    public function getByAccountNumbers(array $accountNumbers, int $limit = 100): array
    {
        if (empty($accountNumbers)) {
            return [];
        }
        
        $limit = (int)$limit;
        $placeholders = str_repeat('?,', count($accountNumbers) - 1) . '?';
        $stmt = $this->db->prepare("
            SELECT * FROM account_transactions 
            WHERE source_account_number IN ($placeholders) 
               OR target_account_number IN ($placeholders)
            ORDER BY ts DESC
            LIMIT {$limit}
        ");
        $params = array_merge($accountNumbers, $accountNumbers);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
