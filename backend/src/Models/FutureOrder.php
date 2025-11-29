<?php

namespace App\Models;

use App\Helpers\Database;
use PDO;

class FutureOrder
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    public function getByWalletId(int $walletId, int $limit = 50): array
    {
        $limit = (int)$limit;
        $stmt = $this->db->prepare("
            SELECT * FROM future_orders 
            WHERE wallet_id = ?
            ORDER BY open_ts DESC
            LIMIT {$limit}
        ");
        $stmt->execute([$walletId]);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            return $this->normalizeOrders($rows);
    }

    public function getOpenOrders(int $walletId): array
    {
        $stmt = $this->db->prepare("
            SELECT * FROM future_orders 
            WHERE wallet_id = ? AND close_ts IS NULL
            ORDER BY open_ts DESC
        ");
        $stmt->execute([$walletId]);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            return $this->normalizeOrders($rows);
    }

    public function findById(int $futureOrderId): ?array
    {
        $stmt = $this->db->prepare("
            SELECT * FROM future_orders 
            WHERE future_order_id = ?
            LIMIT 1
        ");
        $stmt->execute([$futureOrderId]);
        $order = $stmt->fetch(PDO::FETCH_ASSOC);
        return $order ?: null;
    }

    /**
     * Fetch a future order row using FOR UPDATE to lock it within a transaction.
     */
    public function findByIdForUpdate(int $futureOrderId): ?array
    {
        $stmt = $this->db->prepare(
            "SELECT * FROM future_orders WHERE future_order_id = ? FOR UPDATE"
        );
        $stmt->execute([$futureOrderId]);
        $order = $stmt->fetch(PDO::FETCH_ASSOC);
        return $order ?: null;
    }

    public function create(array $data): ?int
    {
        // Build an INSERT dynamically based on existing table columns.
        $allowed = ['wallet_id','symbol','side','entry_price','position_size','margin','leverage'];
        $colsStmt = $this->db->prepare("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'future_orders'");
        $colsStmt->execute();
        $existingCols = $colsStmt->fetchAll(PDO::FETCH_COLUMN);

        $useCols = array_values(array_intersect($allowed, $existingCols));
        if (empty($useCols)) {
            throw new \RuntimeException('No compatible columns found in future_orders table');
        }

        $placeholders = implode(',', array_fill(0, count($useCols), '?'));
        $colList = '`' . implode('`,`', $useCols) . '`';

        $sql = "INSERT INTO future_orders ({$colList}) VALUES ({$placeholders})";
        $stmt = $this->db->prepare($sql);

        $values = [];
        foreach ($useCols as $c) {
            if (!array_key_exists($c, $data)) {
                // provide sensible defaults
                if ($c === 'side') $values[] = 'long';
                elseif ($c === 'entry_price' || $c === 'position_size' || $c === 'margin') $values[] = 0;
                elseif ($c === 'leverage') $values[] = 1;
                else $values[] = null;
            } else {
                $values[] = $data[$c];
            }
        }

        // Log the final SQL and values for debugging before execute
        try {
            error_log('[FutureOrder::create] Prepared SQL: ' . $sql . ' | values: ' . json_encode($values, JSON_UNESCAPED_UNICODE));
        } catch (\Throwable $_) {}

        try {
            $success = $stmt->execute($values);
            if (!$success) {
                $err = $stmt->errorInfo();
                error_log('[FutureOrder::create] SQL error: ' . json_encode($err));
                throw new \RuntimeException('FutureOrder create failed: ' . json_encode($err));
            }
            return (int)$this->db->lastInsertId();
        } catch (\Throwable $e) {
            try {
                $err = $stmt->errorInfo();
                error_log('[FutureOrder::create] Exception: ' . $e->getMessage() . ' | errorInfo: ' . json_encode($err));
            } catch (\Throwable $_) {}
            throw $e;
        }
    }

    public function close(int $futureOrderId, float $exitPrice, float $profit): bool
    {
        // Adapt update based on existing columns
        $colsStmt = $this->db->prepare("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'future_orders'");
        $colsStmt->execute();
        $existingCols = $colsStmt->fetchAll(PDO::FETCH_COLUMN);

        $sets = [];
        $values = [];
        if (in_array('close_ts', $existingCols)) {
            $sets[] = 'close_ts = CURRENT_TIMESTAMP(6)';
        }
        if (in_array('exit_price', $existingCols)) {
            $sets[] = 'exit_price = ?';
            $values[] = $exitPrice;
        }
        if (in_array('profit', $existingCols)) {
            $sets[] = 'profit = ?';
            $values[] = $profit;
        }

        if (empty($sets)) {
            throw new \RuntimeException('No updatable columns found in future_orders');
        }

        $sql = 'UPDATE future_orders SET ' . implode(', ', $sets) . ' WHERE future_order_id = ?';
        $values[] = $futureOrderId;
        $stmt = $this->db->prepare($sql);
        $success = $stmt->execute($values);
        if (!$success) {
            $err = $stmt->errorInfo();
            error_log('[FutureOrder::close] SQL error: ' . json_encode($err));
        }
        return $success;
    }

    public function getBySymbol(string $symbol, int $limit = 50): array
    {
        $limit = (int)$limit;
        $stmt = $this->db->prepare("
            SELECT * FROM future_orders 
            WHERE symbol = ?
            ORDER BY open_ts DESC
            LIMIT {$limit}
        ");
        $stmt->execute([$symbol]);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            return $this->normalizeOrders($rows);
        }

        /**
         * Return recent future_orders across all wallets (development/debug helper)
         */
        public function getRecent(int $limit = 50): array
        {
            $limit = (int)$limit;
            $stmt = $this->db->prepare("SELECT * FROM future_orders ORDER BY open_ts DESC LIMIT {$limit}");
            $stmt->execute();
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            return $this->normalizeOrders($rows);
        }

        /**
         * Normalize an array of order rows: cast numeric fields, ensure margin/leverage/position_size exist,
         * and compute position_size = margin * leverage if missing or zero.
         */
        private function normalizeOrders(array $rows): array
        {
            $out = [];
            foreach ($rows as $r) {
                $entry_price = isset($r['entry_price']) ? (float)$r['entry_price'] : 0.0;
                $margin = isset($r['margin']) ? (float)$r['margin'] : 0.0;
                $leverage = isset($r['leverage']) ? (int)$r['leverage'] : 1;
                $position_size = isset($r['position_size']) ? (float)$r['position_size'] : 0.0;

                if (empty($position_size) && $margin > 0 && $leverage > 0) {
                    // per product spec, position_size = margin * leverage
                    $position_size = $margin * $leverage;
                }

                $r['entry_price'] = $entry_price;
                $r['margin'] = $margin;
                $r['leverage'] = $leverage;
                $r['position_size'] = $position_size;

                $out[] = $r;
            }
            return $out;
        }
}
