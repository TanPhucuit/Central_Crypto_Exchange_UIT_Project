-- Fix wallet balance - Close all old positions and restore balance
-- Old positions were created with logic that deducted margin from balance
-- We need to close them all and restore the correct balance

USE crypto_exchange_2;

-- Step 1: Show current problematic state
SELECT 
    w.wallet_id,
    w.user_id,
    w.type,
    w.balance as current_balance,
    COALESCE(SUM(fo.margin), 0) as locked_margin,
    COUNT(fo.future_order_id) as open_positions
FROM wallets w
LEFT JOIN future_orders fo ON w.wallet_id = fo.wallet_id AND fo.close_ts IS NULL
WHERE w.type = 'future'
GROUP BY w.wallet_id;

-- Step 2: Close all open positions with zero profit (to avoid calculation issues)
UPDATE future_orders
SET 
    close_ts = CURRENT_TIMESTAMP(6),
    exit_price = entry_price,
    profit = 0
WHERE close_ts IS NULL;

-- Step 3: Restore wallet balance by adding back all the margin that was deducted
-- Correct balance = current_balance + sum(all closed margins)
UPDATE wallets w
SET balance = (
    SELECT w.balance + COALESCE(SUM(fo.margin), 0)
    FROM future_orders fo
    WHERE fo.wallet_id = w.wallet_id
)
WHERE w.type = 'future';

-- Step 4: Verify - should show no open positions and correct balance
SELECT 
    w.wallet_id,
    w.user_id,
    w.type,
    w.balance as corrected_balance,
    COALESCE(SUM(CASE WHEN fo.close_ts IS NULL THEN fo.margin ELSE 0 END), 0) as locked_margin,
    COUNT(CASE WHEN fo.close_ts IS NULL THEN 1 END) as open_positions
FROM wallets w
LEFT JOIN future_orders fo ON w.wallet_id = fo.wallet_id
WHERE w.type = 'future'
GROUP BY w.wallet_id;

-- Optional: If you know the exact correct balance, set it manually
-- UPDATE wallets SET balance = 100.00 WHERE wallet_id = 1 AND type = 'future';
