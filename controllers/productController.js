const Product = require('../models/productModels');
const Stock = require('../models/stockModels');
const StockMovement = require('../models/stockMovementModels');
const { uploadImage } = require('../utils/uploadimages');
const { isValidImageURL } = require('../utils/helper');
const APIFeatures = require('../utils/APIFeatures');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const mongoose = require('mongoose');

/**
 * GET ALL PRODUCTS
 *
 * STOCK INTEGRATION:
 * - Include stock info in response
 * - Support filtering by stock status
 */
exports.getAllProducts = catchAsync(async (req, res, next) => {
  const features = new APIFeatures(Product.find(), req.query)
    .filter()
    .sort()
    .limitFields()
    .pagination();

  const countFeatures = new APIFeatures(Product.find(), req.query).filter();
  const totalDocuments = await countFeatures.query.countDocuments();

  // Execute query and populate stock info
  const products = await features.query.populate();

  const paginationMetadata = features.getPaginationMetadata(totalDocuments);

  res.status(200).json({
    status: 'success',
    results: products.length,
    pagination: paginationMetadata,
    data: {
      products,
    },
  });
});

/**
 * GET SINGLE PRODUCT
 *
 * STOCK INTEGRATION:
 * - Include detailed stock info
 */
exports.getProduct = catchAsync(async (req, res, next) => {
  const product = await Product.findById(req.params.id).populate({
    path: 'reviews',
    select: 'review rating user',
    populate: {
      path: 'user',
      select: 'fullname -_id',
    },
  });

  if (!product) {
    return next(new AppError('No product found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      product,
    },
  });
});

/**
 * CREATE PRODUCT
 *
 * STOCK INTEGRATION:
 * - Create stock record when product is created
 * - Accept initial stock quantity from request
 * - Record initial stock movement
 */
exports.createProduct = catchAsync(async (req, res, next) => {
  const { images, initialStock = 0, minStock = 10, maxStock = 1000 } = req.body;

  // Validate images
  if (!Array.isArray(images) || !images.length) {
    return next(new AppError('Images must not be empty array', 400));
  }

  const invalidImages = images.filter((url) => !isValidImageURL(url));

  if (invalidImages.length > 0) {
    return next(
      new AppError(`Invalid image URLs: ${invalidImages.join(', ')}`, 400),
    );
  }

  // Validate stock quantities
  if (initialStock < 0) {
    return next(new AppError('Initial stock cannot be negative', 400));
  }

  if (minStock < 0 || maxStock < 0) {
    return next(new AppError('Min/max stock cannot be negative', 400));
  }

  if (maxStock < minStock) {
    return next(new AppError('Max stock must be greater than min stock', 400));
  }

  // ========================================
  // CREATE PRODUCT + STOCK (TRANSACTION)
  // ========================================

  const session = await mongoose.startSession();
  let newProduct, newStock;

  try {
    await session.withTransaction(async () => {
      // Step 1: Create product (without stock field)
      [newProduct] = await Product.create(
        [
          {
            ...req.body,
            images,
            // Don't include stock-related fields in product
          },
        ],
        { session },
      );
      // Step 2: Create stock record

      [newStock] = await Stock.create(
        [
          {
            product: newProduct._id,
            quantity: initialStock,
            reserved: 0,
            minStock: minStock,
            maxStock: maxStock,
            lastRestocked: initialStock > 0 ? new Date() : null,
          },
        ],
        { session },
      );

      // Step 3: Record initial stock movement (if stock > 0)
      if (initialStock > 0) {
        await StockMovement.create(
          [
            {
              product: newProduct._id,
              type: 'initial',
              quantity: initialStock,
              balanceBefore: 0,
              balanceAfter: initialStock,
              userId: req.userId, // Admin who created product
              reason: 'Initial stock on product creation',
              metadata: {
                productTitle: newProduct.title,
                createdBy: 'admin',
              },
            },
          ],
          { session },
        );
      }
    });

    await session.endSession();

    // Populate stock for response
    await newProduct.populate('stock');

    res.status(201).json({
      status: 'success',
      message: 'Product and stock record created successfully',
      data: {
        product: newProduct,
      },
    });
  } catch (error) {
    await session.endSession();
    return next(error);
  }
});

/**
 * DELETE PRODUCT
 *
 * STOCK INTEGRATION:
 * - Check for pending orders before deletion
 * - Delete stock record with product
 * - Prevent deletion if stock is reserved
 */
exports.deleteProduct = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const product = await Product.findById(req.params.id).session(session);

      if (!product) {
        throw new AppError('No product found with that ID', 404);
      }

      // Check stock status
      const stock = await Stock.findOne({ product: req.params.id }).session(
        session,
      );

      if (stock) {
        // Check if stock is reserved
        if (stock.reserved > 0) {
          throw new AppError(
            `Cannot delete product. ${stock.reserved} units are reserved for pending orders`,
            400,
          );
        }

        // Optional: Check if stock exists
        if (stock.quantity > 0) {
          throw new AppError(
            `Cannot delete product. ${stock.quantity} units still in stock. Adjust stock to 0 first.`,
            400,
          );
        }

        // Delete stock record
        await Stock.findOneAndDelete({ product: req.params.id }, { session });
      }

      // Delete product
      await Product.findByIdAndDelete(req.params.id, { session });
    });

    await session.endSession();

    res.status(204).json({
      status: 'success',
      data: null,
    });
  } catch (error) {
    await session.endSession();
    return next(error);
  }
});

/**
 * UPDATE PRODUCT
 *
 * STOCK INTEGRATION:
 * - Product updates don't affect stock
 * - Stock is managed separately via stock routes
 * - Prevents accidental stock changes
 */
exports.updateProduct = catchAsync(async (req, res, next) => {
  // Remove stock-related fields from update to prevent accidental changes
  const { initialStock, stock, minStock, maxStock, ...updateData } = req.body;

  // Warn if stock fields were provided
  if (initialStock !== undefined || stock !== undefined) {
    return next(
      new AppError(
        'Cannot update stock via product endpoint. Use /api/stock/adjust instead',
        400,
      ),
    );
  }

  const product = await Product.findByIdAndUpdate(req.params.id, updateData, {
    new: true,
    runValidators: true,
  }).populate('stock');

  if (!product) {
    return next(new AppError('No product found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      product,
    },
  });
});
