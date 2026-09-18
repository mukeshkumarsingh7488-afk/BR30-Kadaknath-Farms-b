import express from "express";
import { validationResult } from "express-validator";

import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";

import { getProducts, getProductBySlug, getAdminProducts, createProduct, updateProduct, deleteProduct } from "../controllers/productController.js";

import { createProductValidator, updateProductValidator, productIdValidator, productSlugValidator, productListValidator } from "../validators/productValidator.js";

const router = express.Router();

const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      errors: errors.array().map((error) => ({
        field: error.path,
        message: error.msg,
      })),
    });
  }

  next();
};

/*
|--------------------------------------------------------------------------
| PUBLIC PRODUCT ROUTES
|--------------------------------------------------------------------------
*/

router.get("/", productListValidator, validate, getProducts);

router.get("/slug/:slug", productSlugValidator, validate, getProductBySlug);

/*
|--------------------------------------------------------------------------
| ADMIN PRODUCT ROUTES
|--------------------------------------------------------------------------
*/

router.get("/admin/all", authMiddleware, adminMiddleware, productListValidator, validate, getAdminProducts);

router.post("/admin", authMiddleware, adminMiddleware, createProductValidator, validate, createProduct);

router.put("/admin/:id", authMiddleware, adminMiddleware, updateProductValidator, validate, updateProduct);

router.delete("/admin/:id", authMiddleware, adminMiddleware, productIdValidator, validate, deleteProduct);

export default router;
