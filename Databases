-- StockSense reporting queries and safe transaction patterns.

-- Products with current quantity by location and warehouse.
SELECT p.id, p.name, p.sku, p.unit_of_measure,
       w.name AS warehouse, l.name AS location, s.quantity
FROM stock s
JOIN products p ON p.id = s.product_id
JOIN locations l ON l.id = s.location_id
JOIN warehouses w ON w.id = l.warehouse_id
ORDER BY p.name, w.name, l.name;

-- Total quantity by product (includes products with no stock row).
SELECT p.id, p.name, p.sku, p.unit_of_measure,
       COALESCE(sum(s.quantity), 0) AS total_quantity,
       p.reorder_level,
       CASE WHEN COALESCE(sum(s.quantity), 0) = 0 THEN 'OUT_OF_STOCK'
            WHEN COALESCE(sum(s.quantity), 0) <= p.reorder_level THEN 'LOW_STOCK'
            ELSE 'IN_STOCK' END AS stock_status
FROM products p
LEFT JOIN stock s ON s.product_id = p.id
GROUP BY p.id
ORDER BY p.name;

-- Ledger history, newest first.
SELECT sl.*, p.name AS product_name, p.sku, l.name AS location_name,
       u.name AS actor_name
FROM stock_ledger sl
JOIN products p ON p.id = sl.product_id
JOIN locations l ON l.id = sl.location_id
JOIN users u ON u.id = sl.created_by
ORDER BY sl.created_at DESC, sl.id DESC;

-- Safe receipt validation outline: execute on one pooled connection.
-- 1. BEGIN; select the document FOR UPDATE; verify status = DRAFT.
-- 2. For each item, upsert stock atomically, then insert its positive ledger row.
-- 3. Set status='VALIDATED', validated_at=now(); COMMIT. Roll back on any error.
-- Example atomic stock upsert for one item:
-- INSERT INTO stock(product_id, location_id, quantity)
-- VALUES ($1, $2, $3)
-- ON CONFLICT (product_id, location_id) DO UPDATE
-- SET quantity = stock.quantity + EXCLUDED.quantity, updated_at = now();
-- Then insert stock_ledger with movement_type='RECEIPT', quantity=$3.

-- Safe delivery decrement: lock rows in stable (product_id, location_id) order,
-- verify available quantity >= requested quantity, then decrement and ledger.
-- UPDATE stock SET quantity = quantity - $3, updated_at = now()
-- WHERE product_id=$1 AND location_id=$2 AND quantity >= $3
-- RETURNING quantity; -- zero returned rows means insufficient stock.

-- Transfer validation uses both locations in one transaction: decrement source
-- with the guarded UPDATE above, upsert destination (+quantity), then write
-- TRANSFER_OUT (-quantity) and TRANSFER_IN (+quantity) ledger rows.

-- Adjustment: lock the stock row; recompute system_quantity from current stock;
-- set stock.quantity to physical_quantity; ledger quantity is the difference.
-- Do not trust a client-supplied system_quantity or difference.
