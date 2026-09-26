-- Demo data for a fresh StockSense database. Safe to run more than once.
BEGIN;

-- pgcrypto's bcrypt hashes can be verified by common backend bcrypt libraries.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO users (name, email, password_hash, role)
SELECT v.name, v.email, crypt('ChangeMe123!', gen_salt('bf', 10)), v.role
FROM (VALUES
  ('Admin', 'admin@example.com', 'ADMIN'),
  ('Staff', 'staff@example.com', 'STAFF')
) AS v(name, email, role)
ON CONFLICT (email) DO NOTHING;

INSERT INTO categories (name, description) VALUES
  ('Raw Material', 'Materials used in production'),
  ('Finished Goods', 'Ready for customer shipment'),
  ('Components', 'Parts used in assemblies'),
  ('Packaging', 'Shipping and product packaging')
ON CONFLICT (name) DO NOTHING;

INSERT INTO warehouses (name, code, address) VALUES
  ('Main Warehouse', 'WH-001', '100 Industrial Road'),
  ('Production Warehouse', 'WH-002', '200 Factory Avenue')
ON CONFLICT (code) DO NOTHING;

INSERT INTO locations (warehouse_id, name, code)
SELECT w.id, v.name, v.code
FROM (VALUES
  ('WH-001', 'Rack A', 'A-01'),
  ('WH-001', 'Rack B', 'B-01'),
  ('WH-002', 'Production Rack', 'P-01'),
  ('WH-002', 'Finished Goods Rack', 'FG-01')
) AS v(warehouse_code, name, code)
JOIN warehouses w ON w.code = v.warehouse_code
ON CONFLICT (warehouse_id, code) DO NOTHING;

INSERT INTO products (name, sku, category_id, unit_of_measure, reorder_level)
SELECT v.name, v.sku, c.id, v.unit, v.reorder
FROM (VALUES
  ('Steel Sheet', 'STL-001', 'Raw Material', 'kg', 20::numeric),
  ('Copper Wire', 'COP-001', 'Raw Material', 'm', 100::numeric),
  ('Bolts', 'BLT-001', 'Components', 'pcs', 200::numeric),
  ('Packaging Box', 'PKG-001', 'Packaging', 'pcs', 50::numeric)
) AS v(name, sku, category_name, unit, reorder)
JOIN categories c ON c.name = v.category_name
ON CONFLICT (sku) DO NOTHING;

INSERT INTO stock (product_id, location_id, quantity)
SELECT p.id, l.id, v.quantity
FROM (VALUES
  ('STL-001', 'WH-001', 'A-01', 80::numeric),
  ('STL-001', 'WH-001', 'B-01', 20::numeric),
  ('COP-001', 'WH-002', 'P-01', 500::numeric),
  ('BLT-001', 'WH-002', 'P-01', 1000::numeric),
  ('PKG-001', 'WH-002', 'FG-01', 120::numeric)
) AS v(sku, warehouse_code, location_code, quantity)
JOIN products p ON p.sku = v.sku
JOIN warehouses w ON w.code = v.warehouse_code
JOIN locations l ON l.warehouse_id = w.id AND l.code = v.location_code
ON CONFLICT (product_id, location_id) DO NOTHING;

-- Seed initial stock history only for locations with no prior ledger entry.
INSERT INTO stock_ledger
  (product_id, location_id, movement_type, quantity, reference_type, reference_id, notes, created_by)
SELECT s.product_id, s.location_id, 'RECEIPT', s.quantity, 'RECEIPT', 0,
       'Demo opening balance', u.id
FROM stock s
JOIN users u ON u.email = 'admin@example.com'
WHERE s.quantity > 0
  AND NOT EXISTS (
    SELECT 1 FROM stock_ledger sl
    WHERE sl.product_id = s.product_id AND sl.location_id = s.location_id
  );

COMMIT;

-- Demo login password for both accounts: ChangeMe123! Change it before any
-- shared or production deployment; seed users are for local development only.
