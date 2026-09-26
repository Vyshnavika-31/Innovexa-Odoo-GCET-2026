class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
module.exports = HttpError;

const db = require("../config/db");

async function inTransaction(work) {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
module.exports = inTransaction;

const crypto = require("crypto");
const HttpError = require("./HttpError");

function documentNumber(prefix) {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  return `${prefix}-${stamp}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}
function requireItems(items, needsLocation = true, allowZeroQuantity = false) {
  if (!Array.isArray(items) || items.length === 0) throw new HttpError(400, "Add at least one item");
  for (const item of items) {
    if (!Number.isInteger(Number(item.product_id)) || Number(item.product_id) <= 0 || (needsLocation && (!Number.isInteger(Number(item.location_id)) || Number(item.location_id) <= 0)) || !Number.isFinite(Number(item.quantity)) || (allowZeroQuantity ? Number(item.quantity) < 0 : Number(item.quantity) <= 0) || !item.unit_of_measure?.trim()) {
      throw new HttpError(400, "Each item needs product_id, required location_id, positive quantity, and unit_of_measure");
    }
  }
}
async function validateItemAtLocation(client, item, warehouseId) {
  const r = await client.query("SELECT p.unit_of_measure,l.warehouse_id FROM products p CROSS JOIN locations l WHERE p.id=$1 AND l.id=$2 AND p.active=true", [item.product_id,item.location_id]);
  if (!r.rowCount) throw new HttpError(400, "Item has an unknown product or location");
  if (String(r.rows[0].warehouse_id) !== String(warehouseId)) throw new HttpError(400, "Item location is outside the document warehouse");
  if (r.rows[0].unit_of_measure !== item.unit_of_measure) throw new HttpError(400, "Item unit must match the product unit");
}
function mapPgError(error) {
  if (error.code === "23505") return new HttpError(409, "A duplicate document number or item exists");
  if (error.code === "23503") return new HttpError(400, "A referenced product, location, warehouse, or user does not exist");
  return error;
}
module.exports = { documentNumber, requireItems, validateItemAtLocation, mapPgError };



function asyncHandler(handler) {
  return function wrappedHandler(req, res, next) {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}
module.exports = asyncHandler;

const db = require("../config/db");
const asyncHandler = require("./asyncHandler");
const HttpError = require("./HttpError");

// Table and key names are fixed in route files, never supplied by an API caller.
function documentHandlers(table, itemTable, foreignKey) {
  const get = asyncHandler(async (req, res) => {
    if (!/^\d+$/.test(req.params.id)) throw new HttpError(400, "Invalid document id");
    const doc = await db.query(`SELECT * FROM ${table} WHERE id=$1`, [req.params.id]);
    if (!doc.rowCount) throw new HttpError(404, "Document not found");
    const items = await db.query(`SELECT * FROM ${itemTable} WHERE ${foreignKey}=$1 ORDER BY id`, [req.params.id]);
    res.json({ ...doc.rows[0], items: items.rows });
  });
  const cancel = asyncHandler(async (req, res) => {
    if (!/^\d+$/.test(req.params.id)) throw new HttpError(400, "Invalid document id");
    const result = await db.query(`UPDATE ${table} SET status='CANCELLED',updated_at=now() WHERE id=$1 AND status='DRAFT' RETURNING *`, [req.params.id]);
    if (!result.rowCount) {
      const exists = await db.query(`SELECT id FROM ${table} WHERE id=$1`, [req.params.id]);
      if (!exists.rowCount) throw new HttpError(404, "Document not found");
      throw new HttpError(409, "Only a draft document can be cancelled");
    }
    res.json(result.rows[0]);
  });
  return { get, cancel };
}
module.exports = documentHandlers;
