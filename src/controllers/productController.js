import Product from "../models/Product.js";

const escapeRegex = (value) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const normalizeProduct = (product) => {
  return {
    id: product._id,
    name: product.name,
    slug: product.slug,
    category: product.category,
    shortDescription: product.shortDescription,
    description: product.description,
    price: product.price,
    compareAtPrice: product.compareAtPrice,
    unit: product.unit,
    stock: product.stock,
    image: product.image,
    images: product.images,
    isActive: product.isActive,
    isFeatured: product.isFeatured,
    sortOrder: product.sortOrder,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
};

/*
|--------------------------------------------------------------------------
| PUBLIC - GET PRODUCTS
|--------------------------------------------------------------------------
*/

export const getProducts = async (req, res, next) => {
  try {
    const { category, search, page = 1, limit = 12, featured } = req.query;

    const currentPage = Number(page);
    const perPage = Number(limit);

    const filter = {};

    if (category) {
      filter.category = category;
    }

    if (featured !== undefined) {
      filter.isFeatured = featured === true || featured === "true";
    }

    if (search) {
      const safeSearch = escapeRegex(search);

      filter.$or = [
        {
          name: {
            $regex: safeSearch,
            $options: "i",
          },
        },
        {
          shortDescription: {
            $regex: safeSearch,
            $options: "i",
          },
        },
        {
          description: {
            $regex: safeSearch,
            $options: "i",
          },
        },
      ];
    }

    const skip = (currentPage - 1) * perPage;

    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort({
          sortOrder: 1,
          createdAt: -1,
        })
        .skip(skip)
        .limit(perPage)
        .lean(),

      Product.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      products: products.map(normalizeProduct),
      pagination: {
        page: currentPage,
        limit: perPage,
        total,
        totalPages: Math.ceil(total / perPage),
        hasNextPage: currentPage * perPage < total,
        hasPreviousPage: currentPage > 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
|--------------------------------------------------------------------------
| PUBLIC - GET PRODUCT BY SLUG
|--------------------------------------------------------------------------
*/

export const getProductBySlug = async (req, res, next) => {
  try {
    const product = await Product.findOne({
      slug: req.params.slug,
    }).lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      product: normalizeProduct(product),
    });
  } catch (error) {
    next(error);
  }
};

/*
|--------------------------------------------------------------------------
| ADMIN - GET ALL PRODUCTS
|--------------------------------------------------------------------------
*/

export const getAdminProducts = async (req, res, next) => {
  try {
    const { category, search, page = 1, limit = 20, featured, status } = req.query;

    const currentPage = Number(page);
    const perPage = Number(limit);

    const filter = {};

    if (category) {
      filter.category = category;
    }

    if (featured !== undefined) {
      filter.isFeatured = featured === true || featured === "true";
    }

    if (status === "active") {
      filter.isActive = true;
    }

    if (status === "inactive") {
      filter.isActive = false;
    }

    if (search) {
      const safeSearch = escapeRegex(search);

      filter.$or = [
        {
          name: {
            $regex: safeSearch,
            $options: "i",
          },
        },
        {
          slug: {
            $regex: safeSearch,
            $options: "i",
          },
        },
      ];
    }

    const skip = (currentPage - 1) * perPage;

    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort({
          sortOrder: 1,
          createdAt: -1,
        })
        .skip(skip)
        .limit(perPage)
        .lean(),

      Product.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      products: products.map(normalizeProduct),
      pagination: {
        page: currentPage,
        limit: perPage,
        total,
        totalPages: Math.ceil(total / perPage),
        hasNextPage: currentPage * perPage < total,
        hasPreviousPage: currentPage > 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
|--------------------------------------------------------------------------
| ADMIN - CREATE PRODUCT
|--------------------------------------------------------------------------
*/

export const createProduct = async (req, res, next) => {
  try {
    const { name, slug, category, shortDescription, description, price, compareAtPrice, unit, stock, image, images, isActive, isFeatured, sortOrder } = req.body;

    const existingProduct = await Product.findOne({
      slug: slug.toLowerCase(),
    });

    if (existingProduct) {
      return res.status(409).json({
        success: false,
        message: "A product with this slug already exists",
      });
    }

    const product = await Product.create({
      name,
      slug: slug.toLowerCase(),
      category,
      shortDescription,
      description,
      price,
      compareAtPrice,
      unit,
      stock,
      image,
      images: images || [],
      isActive: isActive ?? true,
      isFeatured: isFeatured ?? false,
      sortOrder: sortOrder ?? 0,
    });

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      product: normalizeProduct(product),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A product with this slug already exists",
      });
    }

    next(error);
  }
};

/*
|--------------------------------------------------------------------------
| ADMIN - UPDATE PRODUCT
|--------------------------------------------------------------------------
*/

export const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const allowedFields = ["name", "slug", "category", "shortDescription", "description", "price", "compareAtPrice", "unit", "stock", "image", "images", "isActive", "isFeatured", "sortOrder"];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        product[field] = field === "slug" ? req.body[field].toLowerCase() : req.body[field];
      }
    }

    const duplicateProduct = await Product.findOne({
      slug: product.slug,
      _id: {
        $ne: product._id,
      },
    });

    if (duplicateProduct) {
      return res.status(409).json({
        success: false,
        message: "A product with this slug already exists",
      });
    }

    await product.save();

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      product: normalizeProduct(product),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A product with this slug already exists",
      });
    }

    next(error);
  }
};

/*
|--------------------------------------------------------------------------
| ADMIN - SOFT DELETE PRODUCT
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| ADMIN - DELETE PRODUCT
|--------------------------------------------------------------------------
*/

export const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    await Product.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
