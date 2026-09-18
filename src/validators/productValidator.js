import { body, param, query } from "express-validator";

const categories = ["Eggs", "Chicken", "Chicks", "Hatching Eggs", "Breeding Pair", "Live Birds"];

const isValidImage = (value) => {
  if (typeof value !== "string") {
    return false;
  }

  const trimmed = value.trim();

  return /^https?:\/\/.+/i.test(trimmed) || /^\/[a-zA-Z0-9/_\-.]+$/.test(trimmed);
};

const validateObjectId = (field) => param(field).isMongoId().withMessage(`Invalid ${field}`);

export const createProductValidator = [
  body("name").trim().notEmpty().withMessage("Product name is required").isLength({ min: 2, max: 150 }).withMessage("Product name must be between 2 and 150 characters"),

  body("slug")
    .trim()
    .notEmpty()
    .withMessage("Product slug is required")
    .matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .withMessage("Slug can contain only lowercase letters, numbers and hyphens")
    .isLength({ max: 180 })
    .withMessage("Slug cannot exceed 180 characters"),

  body("category").trim().notEmpty().withMessage("Category is required").isIn(categories).withMessage("Invalid product category"),

  body("shortDescription").trim().notEmpty().withMessage("Short description is required").isLength({ max: 300 }).withMessage("Short description cannot exceed 300 characters"),

  body("description").trim().notEmpty().withMessage("Product description is required").isLength({ max: 5000 }).withMessage("Product description cannot exceed 5000 characters"),

  body("price").isFloat({ min: 0 }).withMessage("Price must be a valid number greater than or equal to 0").toFloat(),

  body("compareAtPrice").optional({ nullable: true }).isFloat({ min: 0 }).withMessage("Compare-at price must be valid").toFloat(),

  body("unit").trim().notEmpty().withMessage("Product unit is required").isLength({ max: 50 }).withMessage("Product unit cannot exceed 50 characters"),

  body("stock").isInt({ min: 0 }).withMessage("Stock must be a whole number greater than or equal to 0").toInt(),

  body("image").trim().notEmpty().withMessage("Product image is required").custom(isValidImage).withMessage("Product image must be a valid URL or image path"),

  body("images").optional().isArray().withMessage("Images must be an array"),

  body("images.*").optional().custom(isValidImage).withMessage("Every product image must be a valid URL or image path"),

  body("isActive").optional().isBoolean().withMessage("isActive must be true or false").toBoolean(),

  body("isFeatured").optional().isBoolean().withMessage("isFeatured must be true or false").toBoolean(),

  body("sortOrder").optional().isInt().withMessage("sortOrder must be a whole number").toInt(),
];

export const updateProductValidator = [
  validateObjectId("id"),

  body("name").optional().trim().isLength({ min: 2, max: 150 }).withMessage("Product name must be between 2 and 150 characters"),

  body("slug")
    .optional()
    .trim()
    .matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .withMessage("Slug can contain only lowercase letters, numbers and hyphens"),

  body("category").optional().trim().isIn(categories).withMessage("Invalid product category"),

  body("shortDescription").optional().trim().isLength({ max: 300 }).withMessage("Short description cannot exceed 300 characters"),

  body("description").optional().trim().isLength({ max: 5000 }).withMessage("Product description cannot exceed 5000 characters"),

  body("price").optional().isFloat({ min: 0 }).withMessage("Price must be valid").toFloat(),

  body("compareAtPrice").optional({ nullable: true }).isFloat({ min: 0 }).withMessage("Compare-at price must be valid").toFloat(),

  body("unit").optional().trim().isLength({ max: 50 }).withMessage("Product unit cannot exceed 50 characters"),

  body("stock").optional().isInt({ min: 0 }).withMessage("Stock must be a whole number").toInt(),

  body("image").optional().trim().custom(isValidImage).withMessage("Product image must be a valid URL or image path"),

  body("images").optional().isArray().withMessage("Images must be an array"),

  body("images.*").optional().custom(isValidImage).withMessage("Every product image must be valid"),

  body("isActive").optional().isBoolean().withMessage("isActive must be true or false").toBoolean(),

  body("isFeatured").optional().isBoolean().withMessage("isFeatured must be true or false").toBoolean(),

  body("sortOrder").optional().isInt().withMessage("sortOrder must be a whole number").toInt(),
];

export const productIdValidator = [validateObjectId("id")];

export const productSlugValidator = [
  param("slug")
    .trim()
    .matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .withMessage("Invalid product slug"),
];

export const productListValidator = [
  query("category").optional().trim().isIn(categories).withMessage("Invalid product category"),

  query("search").optional().trim().isLength({ max: 100 }).withMessage("Search cannot exceed 100 characters"),

  query("page").optional().isInt({ min: 1 }).withMessage("Page must be at least 1").toInt(),

  query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("Limit must be between 1 and 100").toInt(),

  query("featured").optional().isBoolean().withMessage("featured must be true or false").toBoolean(),
];
