const db=require("../config/db");const asyncHandler=require("../utils/asyncHandler");const HttpError=require("../utils/HttpError");const inTransaction=require("../utils/inTransaction");const{documentNumber,requireItems,validateItemAtLocation,mapPgError}=require("../utils/operationHelpers");
exports.list=asyncHandler(async(req,res)=>{const p=[];let w="";if(req.query.status){p.push(req.query.status);w=`WHERE a.status=$${p.length}`;}const r=await db.query(`SELECT a.*,wh.name AS warehouse_name FROM adjustments a JOIN warehouses wh ON wh.id=a.warehouse_id ${w} ORDER BY a.created_at DESC`,p);res.json(r.rows);});
exports.create=asyncHandler(async(req,res)=>{const{warehouse_id,reason,items,notes,document_number}=req.body;requireItems(items,true,true);if(!Number.isInteger(Number(warehouse_id))||!reason?.trim())throw new HttpError(400,"warehouse_id and reason are required");try{const doc=await inTransaction(async c=>{const d=await c.query("INSERT INTO adjustments(document_number,warehouse_id,reason,notes,created_by) VALUES($1,$2,$3,$4,$5) RETURNING *",[document_number||documentNumber("ADJ"),warehouse_id,reason.trim(),notes||null,req.user.id]);for(const i of items){await validateItemAtLocation(c,i,warehouse_id);await c.query("INSERT INTO adjustment_items(adjustment_id,product_id,location_id,physical_quantity,unit_of_measure) VALUES($1,$2,$3,$4,$5)",[d.rows[0].id,i.product_id,i.location_id,i.quantity,i.unit_of_measure]);}return d.rows[0];});res.status(201).json(doc);}catch(e){throw mapPgError(e);}});
exports.validate=asyncHandler(async(req,res)=>{const result=await inTransaction(async c=>{const d=await c.query("SELECT * FROM adjustments WHERE id=$1 FOR UPDATE",[req.params.id]);if(!d.rowCount)throw new HttpError(404,"Adjustment not found");if(d.rows[0].status!=="DRAFT")throw new HttpError(409,"Only a draft adjustment can be validated");const items=await c.query("SELECT ai.*,p.unit_of_measure AS product_unit,l.warehouse_id FROM adjustment_items ai JOIN products p ON p.id=ai.product_id JOIN locations l ON l.id=ai.location_id WHERE ai.adjustment_id=$1 ORDER BY ai.product_id,ai.location_id",[req.params.id]);if(!items.rowCount)throw new HttpError(400,"Adjustment has no items");for(const i of items.rows){if(String(i.warehouse_id)!==String(d.rows[0].warehouse_id)||i.unit_of_measure!==i.product_unit)throw new HttpError(400,"Adjustment location or unit does not match document/product");const old=await c.query("SELECT quantity FROM stock WHERE product_id=$1 AND location_id=$2 FOR UPDATE",[i.product_id,i.location_id]);const deltaResult=old.rowCount?await c.query("SELECT $1::numeric-quantity AS delta FROM stock WHERE product_id=$2 AND location_id=$3",[i.physical_quantity,i.product_id,i.location_id]):null;const delta=old.rowCount?deltaResult.rows[0].delta:i.physical_quantity;if(old.rowCount)await c.query("UPDATE stock SET quantity=$3,updated_at=now() WHERE product_id=$1 AND location_id=$2",[i.product_id,i.location_id,i.physical_quantity]);else await c.query("INSERT INTO stock(product_id,location_id,quantity) VALUES($1,$2,$3)",[i.product_id,i.location_id,i.physical_quantity]);if(Number(delta)!==0)await c.query("INSERT INTO stock_ledger(product_id,location_id,movement_type,quantity,reference_type,reference_id,notes,created_by) VALUES($1,$2,'ADJUSTMENT',$3,'ADJUSTMENT',$4,$5,$6)",[i.product_id,i.location_id,delta,d.rows[0].id,d.rows[0].reason,req.user.id]);}const done=await c.query("UPDATE adjustments SET status='VALIDATED',validated_at=now(),validated_by=$1,updated_at=now() WHERE id=$2 RETURNING *",[req.user.id,req.params.id]);return done.rows[0];});res.json(result);});


const db=require("../config/db");const asyncHandler=require("../utils/asyncHandler");const HttpError=require("../utils/HttpError");
exports.list=asyncHandler(async(req,res)=>{const p=[];let where="";const filters=[["productId","sl.product_id"],["locationId","sl.location_id"],["referenceType","sl.reference_type"]];for(const[key,col]of filters)if(req.query[key]){if(!/^\d+$/.test(String(req.query[key]))&&key!=="referenceType")throw new HttpError(400,`Invalid ${key}`);p.push(req.query[key]);where+=`${where?" AND":"WHERE"} ${col}=$${p.length}`;}if(req.query.from){p.push(req.query.from);where+=`${where?" AND":"WHERE"} sl.created_at >= $${p.length}::timestamptz`;}if(req.query.to){p.push(req.query.to);where+=`${where?" AND":"WHERE"} sl.created_at < ($${p.length}::date + interval '1 day')`;}const limit=Math.min(Math.max(Number(req.query.limit)||100,1),500);p.push(limit);const result=await db.query(`SELECT sl.*,p.name AS product_name,p.sku,p.unit_of_measure,l.name AS location_name,w.name AS warehouse_name,u.name AS actor_name FROM stock_ledger sl JOIN products p ON p.id=sl.product_id JOIN locations l ON l.id=sl.location_id JOIN warehouses w ON w.id=l.warehouse_id JOIN users u ON u.id=sl.created_by ${where} ORDER BY sl.created_at DESC,sl.id DESC LIMIT $${p.length}`,p);res.json(result.rows);});

const db = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");
const HttpError = require("../utils/HttpError");
const positiveId = (value) => /^\d+$/.test(String(value)) && Number(value) > 0;

exports.listProducts = asyncHandler(async (req, res) => {
  const params = [];
  let where = "WHERE p.active=true";
  if (req.query.search) { params.push(`%${req.query.search}%`); where += ` AND (p.name ILIKE $${params.length} OR p.sku ILIKE $${params.length})`; }
  if (req.query.categoryId) { if (!positiveId(req.query.categoryId)) throw new HttpError(400, "Invalid categoryId"); params.push(req.query.categoryId); where += ` AND p.category_id=$${params.length}`; }
  if (req.query.locationId) { if (!positiveId(req.query.locationId)) throw new HttpError(400, "Invalid locationId"); params.push(req.query.locationId); where += ` AND EXISTS(SELECT 1 FROM stock sx WHERE sx.product_id=p.id AND sx.location_id=$${params.length})`; }
  const result = await db.query(`SELECT p.id,p.name,p.sku,p.category_id,c.name AS category_name,p.unit_of_measure,p.reorder_level,COALESCE(sum(s.quantity),0) AS total_quantity,CASE WHEN COALESCE(sum(s.quantity),0)=0 THEN 'OUT_OF_STOCK' WHEN COALESCE(sum(s.quantity),0)<=p.reorder_level THEN 'LOW_STOCK' ELSE 'IN_STOCK' END AS stock_status FROM products p LEFT JOIN categories c ON c.id=p.category_id LEFT JOIN stock s ON s.product_id=p.id ${where} GROUP BY p.id,c.name ORDER BY p.name`, params);
  res.json(result.rows);
});
exports.getProduct = asyncHandler(async (req, res) => {
  if (!positiveId(req.params.id)) throw new HttpError(400, "Invalid product id");
  const result = await db.query("SELECT p.id,p.name,p.sku,p.category_id,c.name AS category_name,p.unit_of_measure,p.reorder_level,p.active,COALESCE(json_agg(json_build_object('location_id',l.id,'location',l.name,'warehouse_id',w.id,'warehouse',w.name,'quantity',s.quantity)) FILTER(WHERE l.id IS NOT NULL),'[]') AS stock_by_location FROM products p LEFT JOIN categories c ON c.id=p.category_id LEFT JOIN stock s ON s.product_id=p.id LEFT JOIN locations l ON l.id=s.location_id LEFT JOIN warehouses w ON w.id=l.warehouse_id WHERE p.id=$1 GROUP BY p.id,c.name", [req.params.id]);
  if (!result.rowCount) throw new HttpError(404, "Product not found");
  res.json(result.rows[0]);
});
exports.createProduct = asyncHandler(async (req, res) => {
  const { name, sku, category_id, unit_of_measure, reorder_level = 0 } = req.body;
  if (!name?.trim() || !sku?.trim() || !unit_of_measure?.trim() || !Number.isFinite(Number(reorder_level)) || Number(reorder_level)<0) throw new HttpError(400, "Name, SKU, unit, and a nonnegative reorder level are required");
  const result = await db.query("INSERT INTO products(name,sku,category_id,unit_of_measure,reorder_level) VALUES($1,$2,$3,$4,$5) RETURNING *", [name.trim(),sku.trim(),category_id || null,unit_of_measure.trim(),reorder_level]);
  res.status(201).json(result.rows[0]);
});
exports.updateProduct = asyncHandler(async (req, res) => {
  if (!positiveId(req.params.id)) throw new HttpError(400, "Invalid product id");
  const { name, sku, category_id, unit_of_measure, reorder_level, active } = req.body;
  if (!name?.trim() || !sku?.trim() || !unit_of_measure?.trim() || !Number.isFinite(Number(reorder_level)) || Number(reorder_level)<0 || typeof active !== "boolean") throw new HttpError(400, "Provide name, SKU, unit, nonnegative reorder level, and active boolean");
  const result = await db.query("UPDATE products SET name=$1,sku=$2,category_id=$3,unit_of_measure=$4,reorder_level=$5,active=$6,updated_at=now() WHERE id=$7 RETURNING *", [name.trim(),sku.trim(),category_id || null,unit_of_measure.trim(),reorder_level,active,req.params.id]);
  if (!result.rowCount) throw new HttpError(404, "Product not found");
  res.json(result.rows[0]);
});

const db=require("../config/db");const asyncHandler=require("../utils/asyncHandler");const HttpError=require("../utils/HttpError");const inTransaction=require("../utils/inTransaction");const{documentNumber,requireItems,validateItemAtLocation,mapPgError}=require("../utils/operationHelpers");
exports.list=asyncHandler(async(req,res)=>{const p=[];let w="";if(req.query.status){p.push(req.query.status);w=`WHERE r.status=$${p.length}`;}if(req.query.warehouseId){p.push(req.query.warehouseId);w+=`${w?" AND":"WHERE"} r.warehouse_id=$${p.length}`;}const r=await db.query(`SELECT r.*,w.name AS warehouse_name,u.name AS created_by_name FROM receipts r JOIN warehouses w ON w.id=r.warehouse_id JOIN users u ON u.id=r.created_by ${w} ORDER BY r.created_at DESC`,p);res.json(r.rows);});
exports.create=asyncHandler(async(req,res)=>{const{warehouse_id,supplier_name,items,notes,document_number}=req.body;requireItems(items);if(!supplier_name?.trim()||!Number.isInteger(Number(warehouse_id)))throw new HttpError(400,"warehouse_id and supplier_name are required");try{const doc=await inTransaction(async c=>{const d=await c.query("INSERT INTO receipts(document_number,warehouse_id,supplier_name,notes,created_by) VALUES($1,$2,$3,$4,$5) RETURNING *",[document_number||documentNumber("REC"),warehouse_id,supplier_name.trim(),notes||null,req.user.id]);for(const i of items){await validateItemAtLocation(c,i,warehouse_id);await c.query("INSERT INTO receipt_items(receipt_id,product_id,location_id,quantity,unit_of_measure) VALUES($1,$2,$3,$4,$5)",[d.rows[0].id,i.product_id,i.location_id,i.quantity,i.unit_of_measure]);}return d.rows[0];});res.status(201).json(doc);}catch(e){throw mapPgError(e);}});
exports.validate=asyncHandler(async(req,res)=>{const result=await inTransaction(async c=>{const d=await c.query("SELECT * FROM receipts WHERE id=$1 FOR UPDATE",[req.params.id]);if(!d.rowCount)throw new HttpError(404,"Receipt not found");if(d.rows[0].status!=="DRAFT")throw new HttpError(409,"Only a draft receipt can be validated");const items=await c.query("SELECT ri.*,p.unit_of_measure AS product_unit,l.warehouse_id FROM receipt_items ri JOIN products p ON p.id=ri.product_id JOIN locations l ON l.id=ri.location_id WHERE ri.receipt_id=$1 ORDER BY ri.product_id,ri.location_id",[req.params.id]);if(!items.rowCount)throw new HttpError(400,"Receipt has no items");for(const i of items.rows){if(String(i.warehouse_id)!==String(d.rows[0].warehouse_id)||i.unit_of_measure!==i.product_unit)throw new HttpError(400,"Receipt item location or unit does not match the document/product");await c.query("INSERT INTO stock(product_id,location_id,quantity) VALUES($1,$2,$3) ON CONFLICT(product_id,location_id) DO UPDATE SET quantity=stock.quantity+EXCLUDED.quantity,updated_at=now()",[i.product_id,i.location_id,i.quantity]);await c.query("INSERT INTO stock_ledger(product_id,location_id,movement_type,quantity,reference_type,reference_id,notes,created_by) VALUES($1,$2,'RECEIPT',$3,'RECEIPT',$4,$5,$6)",[i.product_id,i.location_id,i.quantity,d.rows[0].id,d.rows[0].document_number,req.user.id]);}const done=await c.query("UPDATE receipts SET status='VALIDATED',validated_at=now(),validated_by=$1,updated_at=now() WHERE id=$2 RETURNING *",[req.user.id,req.params.id]);return done.rows[0];});res.json(result);});

const db=require("../config/db");const asyncHandler=require("../utils/asyncHandler");const HttpError=require("../utils/HttpError");const inTransaction=require("../utils/inTransaction");const{documentNumber,requireItems,mapPgError}=require("../utils/operationHelpers");
exports.list=asyncHandler(async(req,res)=>{const p=[];const w=req.query.status?(p.push(req.query.status),`WHERE t.status=$${p.length}`):"";const r=await db.query(`SELECT t.*,s.name AS source_location,d.name AS destination_location FROM transfers t JOIN locations s ON s.id=t.source_location_id JOIN locations d ON d.id=t.destination_location_id ${w} ORDER BY t.created_at DESC`,p);res.json(r.rows);});
exports.create=asyncHandler(async(req,res)=>{const{source_location_id,destination_location_id,items,notes,document_number}=req.body;requireItems(items,false);if(!Number.isInteger(Number(source_location_id))||!Number.isInteger(Number(destination_location_id))||String(source_location_id)===String(destination_location_id))throw new HttpError(400,"Choose different source and destination locations");try{const doc=await inTransaction(async c=>{const loc=await c.query("SELECT id FROM locations WHERE id=ANY($1::bigint[])",[ [source_location_id,destination_location_id] ]);if(loc.rowCount!==2)throw new HttpError(400,"Unknown transfer location");const d=await c.query("INSERT INTO transfers(document_number,source_location_id,destination_location_id,notes,created_by) VALUES($1,$2,$3,$4,$5) RETURNING *",[document_number||documentNumber("TRF"),source_location_id,destination_location_id,notes||null,req.user.id]);for(const i of items){const p=await c.query("SELECT unit_of_measure FROM products WHERE id=$1 AND active=true",[i.product_id]);if(!p.rowCount||p.rows[0].unit_of_measure!==i.unit_of_measure)throw new HttpError(400,"Unknown product or item unit does not match product");await c.query("INSERT INTO transfer_items(transfer_id,product_id,quantity,unit_of_measure) VALUES($1,$2,$3,$4)",[d.rows[0].id,i.product_id,i.quantity,i.unit_of_measure]);}return d.rows[0];});res.status(201).json(doc);}catch(e){throw mapPgError(e);}});
exports.validate=asyncHandler(async(req,res)=>{const result=await inTransaction(async c=>{const d=await c.query("SELECT * FROM transfers WHERE id=$1 FOR UPDATE",[req.params.id]);if(!d.rowCount)throw new HttpError(404,"Transfer not found");if(d.rows[0].status!=="DRAFT")throw new HttpError(409,"Only a draft transfer can be validated");const items=await c.query("SELECT ti.*,p.unit_of_measure AS product_unit FROM transfer_items ti JOIN products p ON p.id=ti.product_id WHERE ti.transfer_id=$1 ORDER BY ti.product_id",[req.params.id]);if(!items.rowCount)throw new HttpError(400,"Transfer has no items");for(const i of items.rows){if(i.unit_of_measure!==i.product_unit)throw new HttpError(400,"Transfer item unit does not match product");const u=await c.query("UPDATE stock SET quantity=quantity-$3,updated_at=now() WHERE product_id=$1 AND location_id=$2 AND quantity >= $3 RETURNING quantity",[i.product_id,d.rows[0].source_location_id,i.quantity]);if(!u.rowCount)throw new HttpError(409,"Insufficient stock at transfer source");await c.query("INSERT INTO stock(product_id,location_id,quantity) VALUES($1,$2,$3) ON CONFLICT(product_id,location_id) DO UPDATE SET quantity=stock.quantity+EXCLUDED.quantity,updated_at=now()",[i.product_id,d.rows[0].destination_location_id,i.quantity]);for(const[movement,location,qty]of [["TRANSFER_OUT",d.rows[0].source_location_id,-i.quantity],["TRANSFER_IN",d.rows[0].destination_location_id,i.quantity]])await c.query("INSERT INTO stock_ledger(product_id,location_id,movement_type,quantity,reference_type,reference_id,notes,created_by) VALUES($1,$2,$3,$4,'TRANSFER',$5,$6,$7)",[i.product_id,location,movement,qty,d.rows[0].id,d.rows[0].document_number,req.user.id]);}const done=await c.query("UPDATE transfers SET status='VALIDATED',validated_at=now(),validated_by=$1,updated_at=now() WHERE id=$2 RETURNING *",[req.user.id,req.params.id]);return done.rows[0];});res.json(result);});


const db = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");
const HttpError = require("../utils/HttpError");
exports.listWarehouses = asyncHandler(async (_req,res) => {
  const r = await db.query("SELECT w.id,w.name,w.code,w.address,COALESCE(json_agg(json_build_object('id',l.id,'name',l.name,'code',l.code)) FILTER(WHERE l.id IS NOT NULL),'[]') AS locations FROM warehouses w LEFT JOIN locations l ON l.warehouse_id=w.id GROUP BY w.id ORDER BY w.name"); res.json(r.rows);
});
exports.createWarehouse = asyncHandler(async (req,res) => {
  const { name, code, address, locations=[] } = req.body;
  if (!name?.trim() || !code?.trim() || !Array.isArray(locations)) throw new HttpError(400,"Warehouse name, code, and locations array are required");
  const client = await db.connect();
  try { await client.query("BEGIN"); const w=await client.query("INSERT INTO warehouses(name,code,address) VALUES($1,$2,$3) RETURNING *",[name.trim(),code.trim(),address||null]);
    for (const loc of locations) { if (!loc.name?.trim() || !loc.code?.trim()) throw new HttpError(400,"Every location needs a name and code"); await client.query("INSERT INTO locations(warehouse_id,name,code) VALUES($1,$2,$3)",[w.rows[0].id,loc.name.trim(),loc.code.trim()]); }
    await client.query("COMMIT"); res.status(201).json(w.rows[0]);
  } catch(e) { await client.query("ROLLBACK"); if(e.code==="23505") throw new HttpError(409,"Warehouse or location code already exists"); throw e; } finally { client.release(); }
});

const crypto = require("crypto");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const db = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");
const HttpError = require("../utils/HttpError");

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function tokenFor(user) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "8h" });
}

exports.signup = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  if (!name?.trim() || !emailPattern.test(email || "") || typeof password !== "string" || password.length < 8) {
    throw new HttpError(400, "Provide a name, valid email, and password of at least 8 characters");
  }
  const hash = await bcrypt.hash(password, 12);
  try {
    const result = await db.query(
      "INSERT INTO users(name,email,password_hash,role) VALUES($1,lower($2),$3,'STAFF') RETURNING id,name,email,role",
      [name.trim(), email.trim(), hash]
    );
    const user = result.rows[0];
    res.status(201).json({ user, token: tokenFor(user) });
  } catch (error) {
    if (error.code === "23505") throw new HttpError(409, "An account with that email already exists");
    throw error;
  }
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!emailPattern.test(email || "") || typeof password !== "string") throw new HttpError(400, "Email and password are required");
  const result = await db.query("SELECT id,name,email,password_hash,role FROM users WHERE lower(email)=lower($1)", [email.trim()]);
  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) throw new HttpError(401, "Email or password is incorrect");
  delete user.password_hash;
  res.json({ user, token: tokenFor(user) });
});

exports.me = asyncHandler(async (req, res) => {
  const result = await db.query("SELECT id,name,email,role,created_at FROM users WHERE id=$1", [req.user.id]);
  if (!result.rowCount) throw new HttpError(404, "User not found");
  res.json({ user: result.rows[0] });
});

exports.requestPasswordReset = asyncHandler(async (req, res) => {
  const email = (req.body.email || "").trim().toLowerCase();
  if (!emailPattern.test(email)) throw new HttpError(400, "Provide a valid email address");
  const found = await db.query("SELECT id,email FROM users WHERE lower(email)=lower($1)", [email]);
  // Always return the same response to avoid revealing whether an email is registered.
  if (found.rowCount) {
    const otp = String(crypto.randomInt(0, 1000000)).padStart(6, "0");
    const otpHash = await bcrypt.hash(otp, 10);
    await db.query("UPDATE password_reset_otps SET used_at=now() WHERE user_id=$1 AND used_at IS NULL", [found.rows[0].id]);
    await db.query("INSERT INTO password_reset_otps(user_id,otp_hash,expires_at) VALUES($1,$2,now()+interval '10 minutes')", [found.rows[0].id, otpHash]);
    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === "true",
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
      await transporter.sendMail({ from: process.env.MAIL_FROM, to: found.rows[0].email, subject: "StockSense password reset code", text: `Your code is ${otp}. It expires in 10 minutes.` });
    } else if (process.env.NODE_ENV !== "production") {
      console.log(`Development password reset code for ${email}: ${otp}`);
    } else {
      throw new Error("SMTP must be configured for password reset in production");
    }
  }
  res.json({ message: "If that account exists, a reset code has been sent." });
});

exports.resetPassword = asyncHandler(async (req, res) => {
  const email = (req.body.email || "").trim().toLowerCase();
  const { otp, newPassword } = req.body;
  if (!emailPattern.test(email) || !/^\d{6}$/.test(otp || "") || typeof newPassword !== "string" || newPassword.length < 8) {
    throw new HttpError(400, "Provide a valid email, 6-digit code, and password of at least 8 characters");
  }
  const userResult = await db.query("SELECT id FROM users WHERE lower(email)=lower($1)", [email]);
  if (!userResult.rowCount) throw new HttpError(400, "Reset code is invalid or expired");
  const otpResult = await db.query("SELECT id,otp_hash FROM password_reset_otps WHERE user_id=$1 AND used_at IS NULL AND expires_at>now() ORDER BY created_at DESC LIMIT 1", [userResult.rows[0].id]);
  if (!otpResult.rowCount || !(await bcrypt.compare(otp, otpResult.rows[0].otp_hash))) throw new HttpError(400, "Reset code is invalid or expired");
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await db.query("UPDATE users SET password_hash=$1,updated_at=now() WHERE id=$2", [passwordHash, userResult.rows[0].id]);
  await db.query("UPDATE password_reset_otps SET used_at=now() WHERE id=$1", [otpResult.rows[0].id]);
  res.json({ message: "Password reset successfully" });
});

const db=require("../config/db"); const asyncHandler=require("../utils/asyncHandler"); const HttpError=require("../utils/HttpError");
exports.listCategories=asyncHandler(async(_req,res)=>{const r=await db.query("SELECT id,name,description FROM categories ORDER BY name");res.json(r.rows);});
exports.createCategory=asyncHandler(async(req,res)=>{const{name,description}=req.body;if(!name?.trim())throw new HttpError(400,"Category name is required");try{const r=await db.query("INSERT INTO categories(name,description) VALUES($1,$2) RETURNING *",[name.trim(),description||null]);res.status(201).json(r.rows[0]);}catch(e){if(e.code==="23505")throw new HttpError(409,"Category already exists");throw e;}});

const db=require("../config/db");const asyncHandler=require("../utils/asyncHandler");const HttpError=require("../utils/HttpError");
exports.summary=asyncHandler(async(req,res)=>{const warehouseId=req.query.warehouseId||null;const categoryId=req.query.categoryId||null;for(const [n,v] of [["warehouseId",warehouseId],["categoryId",categoryId]])if(v&&!/^\d+$/.test(String(v)))throw new HttpError(400,`Invalid ${n}`);
const stock=await db.query("WITH balances AS (SELECT p.id,p.reorder_level,COALESCE(sum(s.quantity) FILTER(WHERE $1::bigint IS NULL OR l.warehouse_id=$1),0) AS qty FROM products p LEFT JOIN stock s ON s.product_id=p.id LEFT JOIN locations l ON l.id=s.location_id WHERE p.active=true AND ($2::bigint IS NULL OR p.category_id=$2) GROUP BY p.id) SELECT count(*) FILTER(WHERE qty>0)::int AS total_products_in_stock,count(*) FILTER(WHERE qty>0 AND qty<=reorder_level)::int AS low_stock_items,count(*) FILTER(WHERE qty=0)::int AS out_of_stock_items FROM balances",[warehouseId,categoryId]);
const docs=await db.query("SELECT (SELECT count(*) FROM receipts WHERE status='DRAFT' AND ($1::bigint IS NULL OR warehouse_id=$1))::int AS pending_receipts,(SELECT count(*) FROM deliveries WHERE status='DRAFT' AND ($1::bigint IS NULL OR warehouse_id=$1))::int AS pending_deliveries,(SELECT count(*) FROM transfers t JOIN locations l ON l.id=t.source_location_id WHERE t.status='DRAFT' AND ($1::bigint IS NULL OR l.warehouse_id=$1))::int AS internal_transfers_scheduled",[warehouseId]);
res.json({...stock.rows[0],...docs.rows[0]});});

const db=require("../config/db");const asyncHandler=require("../utils/asyncHandler");const HttpError=require("../utils/HttpError");const inTransaction=require("../utils/inTransaction");const{documentNumber,requireItems,validateItemAtLocation,mapPgError}=require("../utils/operationHelpers");
exports.list=asyncHandler(async(req,res)=>{const p=[];let w="";if(req.query.status){p.push(req.query.status);w=`WHERE d.status=$${p.length}`;}if(req.query.warehouseId){p.push(req.query.warehouseId);w+=`${w?" AND":"WHERE"} d.warehouse_id=$${p.length}`;}const r=await db.query(`SELECT d.*,w.name AS warehouse_name,u.name AS created_by_name FROM deliveries d JOIN warehouses w ON w.id=d.warehouse_id JOIN users u ON u.id=d.created_by ${w} ORDER BY d.created_at DESC`,p);res.json(r.rows);});
exports.create=asyncHandler(async(req,res)=>{const{warehouse_id,customer_name,items,notes,document_number}=req.body;requireItems(items);if(!customer_name?.trim()||!Number.isInteger(Number(warehouse_id)))throw new HttpError(400,"warehouse_id and customer_name are required");try{const doc=await inTransaction(async c=>{const d=await c.query("INSERT INTO deliveries(document_number,warehouse_id,customer_name,notes,created_by) VALUES($1,$2,$3,$4,$5) RETURNING *",[document_number||documentNumber("DEL"),warehouse_id,customer_name.trim(),notes||null,req.user.id]);for(const i of items){await validateItemAtLocation(c,i,warehouse_id);await c.query("INSERT INTO delivery_items(delivery_id,product_id,location_id,quantity,unit_of_measure) VALUES($1,$2,$3,$4,$5)",[d.rows[0].id,i.product_id,i.location_id,i.quantity,i.unit_of_measure]);}return d.rows[0];});res.status(201).json(doc);}catch(e){throw mapPgError(e);}});
exports.validate=asyncHandler(async(req,res)=>{const result=await inTransaction(async c=>{const d=await c.query("SELECT * FROM deliveries WHERE id=$1 FOR UPDATE",[req.params.id]);if(!d.rowCount)throw new HttpError(404,"Delivery not found");if(d.rows[0].status!=="DRAFT")throw new HttpError(409,"Only a draft delivery can be validated");const items=await c.query("SELECT di.*,p.unit_of_measure AS product_unit,l.warehouse_id FROM delivery_items di JOIN products p ON p.id=di.product_id JOIN locations l ON l.id=di.location_id WHERE di.delivery_id=$1 ORDER BY di.product_id,di.location_id",[req.params.id]);if(!items.rowCount)throw new HttpError(400,"Delivery has no items");for(const i of items.rows){if(String(i.warehouse_id)!==String(d.rows[0].warehouse_id)||i.unit_of_measure!==i.product_unit)throw new HttpError(400,"Delivery item location or unit does not match the document/product");const u=await c.query("UPDATE stock SET quantity=quantity-$3,updated_at=now() WHERE product_id=$1 AND location_id=$2 AND quantity >= $3 RETURNING quantity",[i.product_id,i.location_id,i.quantity]);if(!u.rowCount)throw new HttpError(409,"Insufficient stock to validate this delivery");await c.query("INSERT INTO stock_ledger(product_id,location_id,movement_type,quantity,reference_type,reference_id,notes,created_by) VALUES($1,$2,'DELIVERY',$3,'DELIVERY',$4,$5,$6)",[i.product_id,i.location_id,-i.quantity,d.rows[0].id,d.rows[0].document_number,req.user.id]);}const done=await c.query("UPDATE deliveries SET status='VALIDATED',validated_at=now(),validated_by=$1,updated_at=now() WHERE id=$2 RETURNING *",[req.user.id,req.params.id]);return done.rows[0];});res.json(result);});
