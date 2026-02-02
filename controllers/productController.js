const Product = require('../models/productModels');
const { uploadImage } = require('../utils/uploadimages');
const { isValidImageURL } = require('../utils/helper');
const APIFeatures = require('../utils/APIFeatures');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.getAllProducts = catchAsync(async (req, res, next) => {
  const features = new APIFeatures(Product.find(), req.query)
    .filter()
    .sort()
    .limitFields()
    .pagination();

  // STEP 2: Get total count of documents matching the filter
  // WHY? We need this to calculate totalPages for pagination metadata
  // TRADE-OFF: This adds an extra database query, but it's necessary for complete pagination info

  // Create a separate count query with the same filters
  const countFeatures = new APIFeatures(Product.find(), req.query).filter();
  const totalDocuments = await countFeatures.query.countDocuments();

  // STEP 3: Execute the main query to get paginated products
  const products = await features.query;

  // STEP 4: Generate pagination metadata
  const paginationMetadata = features.getPaginationMetadata(totalDocuments);

  // STEP 5: Send response with products and pagination info
  res.status(200).json({
    status: 'success',
    results: products.length, // Number of products in current page
    pagination: paginationMetadata,
    data: {
      products,
    },
  });
});

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
