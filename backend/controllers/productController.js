const LOAN_PRODUCTS = require("../config/products");

/**
 * GET /api/products
 * Return the full product catalog (public — no auth needed for browsing)
 */
const getProducts = (req, res) => {
  res.json({
    count: LOAN_PRODUCTS.length,
    products: LOAN_PRODUCTS,
  });
};

/**
 * GET /api/products/:id
 * Get details for a single product
 */
const getProductById = (req, res) => {
  const product = LOAN_PRODUCTS.find((p) => p.id === req.params.id);
  if (!product) {
    return res.status(404).json({ error: "Product not found" });
  }
  res.json(product);
};

module.exports = { getProducts, getProductById };