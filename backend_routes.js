const router=require("express").Router();const c=require("../controllers/adjustmentController");router.get("/",c.list);router.post("/",c.create);router.post("/:id/validate",c.validate);const detail=require('../utils/documentHandlers')('adjustments','adjustment_items','adjustment_id');
router.get("/:id",detail.get);router.post("/:id/cancel",detail.cancel);
module.exports=router;


const router = require("express").Router();
const controller = require("../controllers/authController");
const { requireAuth } = require("../middleware/auth");
router.post("/signup", controller.signup);
router.post("/login", controller.login);
router.post("/forgot-password", controller.requestPasswordReset);
router.post("/reset-password", controller.resetPassword);
router.get("/me", requireAuth, controller.me);
module.exports = router;

const router=require("express").Router();const c=require("../controllers/categoryController");const{requireAdmin}=require("../middleware/auth");router.get("/",c.listCategories);router.post("/",requireAdmin,c.createCategory);module.exports=router;

const router=require("express").Router();const c=require("../controllers/dashboardController");router.get("/summary",c.summary);module.exports=router;

const router=require("express").Router();const c=require("../controllers/deliveryController");router.get("/",c.list);router.post("/",c.create);router.post("/:id/validate",c.validate);const detail=require('../utils/documentHandlers')('deliveries','delivery_items','delivery_id');
router.get("/:id",detail.get);router.post("/:id/cancel",detail.cancel);
module.exports=router;


const router=require("express").Router();const c=require("../controllers/ledgerController");router.get("/",c.list);module.exports=router;

const router = require("express").Router();
const controller = require("../controllers/productController");
const { requireAdmin } = require("../middleware/auth");
router.get("/", controller.listProducts);
router.get("/:id", controller.getProduct);
router.post("/", requireAdmin, controller.createProduct);
router.put("/:id", requireAdmin, controller.updateProduct);
module.exports = router;

const router=require("express").Router();const c=require("../controllers/receiptController");router.get("/",c.list);router.post("/",c.create);router.post("/:id/validate",c.validate);const detail=require('../utils/documentHandlers')('receipts','receipt_items','receipt_id');
router.get("/:id",detail.get);router.post("/:id/cancel",detail.cancel);
module.exports=router;


const router=require("express").Router();const c=require("../controllers/transferController");router.get("/",c.list);router.post("/",c.create);router.post("/:id/validate",c.validate);const detail=require('../utils/documentHandlers')('transfers','transfer_items','transfer_id');
router.get("/:id",detail.get);router.post("/:id/cancel",detail.cancel);
module.exports=router;


const router = require("express").Router(); const c=require("../controllers/warehouseController"); const {requireAdmin}=require("../middleware/auth");
router.get("/",c.listWarehouses); router.post("/",requireAdmin,c.createWarehouse); module.exports=router;
