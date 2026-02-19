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
  const products = await features.query.populate({
    path: 'stock',
    select: 'quantity reserved minStock maxStock',
  });

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
  const product = await Product.findById(req.params.id)
    .populate({
      path: 'reviews',
      select: 'review rating user',
      populate: {
        path: 'user',
        select: 'fullname -_id',
      },
    })
    .populate({
      path: 'stock',
      select: 'quantity reserved minStock maxStock lastRestocked',
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
exports.createProduct = catchAsync(async (req, res, next) => {
  const { images } = req.body;

  if (!Array.isArray(images) || !images.length) {
    return next(new AppError('Images must not be empty array', 400));
  }

  const invalidImages = images.filter((url) => !isValidImageURL(url));

  if (invalidImages.length > 0) {
    return next(
      new AppError(`Invalid image URLs: ${invalidImages.join(', ')}`, 400),
    );
  }

  const newProduct = await Product.create({
    ...req.body,
    images,
  });

  res.status(201).json({
    status: 'success',
    data: {
      product: newProduct,
    },
  });
});

exports.deleteProduct = catchAsync(async (req, res, next) => {
  const product = await Product.findByIdAndDelete(req.params.id);

  if (!product) {
    return next(new AppError('No product found with that ID', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

exports.updateProduct = catchAsync(async (req, res, next) => {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
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
