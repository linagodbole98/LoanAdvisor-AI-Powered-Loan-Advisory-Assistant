const express = require("express");
const router = express.Router();
const { getProducts, getProductById } = require("../controllers/productController");

// Products are publicly browsable (no auth needed)
router.get("/", getProducts);
router.get("/:id", getProductById);

module.exports = router;