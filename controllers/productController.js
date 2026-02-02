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

  const products = await features.query;

  res.status(200).json({
    status: 'success',
    results: products.length,
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
