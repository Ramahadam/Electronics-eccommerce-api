const Wishlist = require('../models/wishlistModels');
const Product = require('../models/productModels');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.getWishlist = catchAsync(async (req, res, next) => {
  const wishlist = await Wishlist.findOne({ user: req.userId }).populate({
    path: 'products',
    select: 'title images unitPrice discount stock brand category avgRatings',
  });

  // ✅ Return empty array if no wishlist, not 404
  if (!wishlist || !wishlist.products.length) {
    return res.status(200).json({
      status: 'success',
      results: 0,
      data: {
        products: [],
      },
    });
  }

  res.status(200).json({
    status: 'success',
    results: wishlist.products.length,
    data: {
      products: wishlist.products,
      wishlist: {
        id: wishlist._id,
        createdAt: wishlist.createdAt,
        updatedAt: wishlist.updatedAt,
      },
    },
  });
});

/**
 * POST /api/v1/wishlist/items/:productId
 * Add product to wishlist
 */
exports.addToWishlist = catchAsync(async (req, res, next) => {
  const { productId } = req.params;

  // ✅ Validate product exists
  const product = await Product.findById(productId);
  if (!product) {
    throw new AppError('Product not found', 404);
  }

  let wishlist = await Wishlist.findOne({ user: req.userId });

  // Create wishlist if doesn't exist
  if (!wishlist) {
    wishlist = await Wishlist.create({
      user: req.userId,
      products: [productId],
    });
  } else {
    // ✅ Check if already in wishlist
    if (wishlist.products.includes(productId)) {
      throw new AppError('Product already in wishlist', 400);
    }

    wishlist.products.push(productId);
    await wishlist.save();
  }

  // Populate before sending response
  await wishlist.populate({
    path: 'products',
    select: 'title images unitPrice discount stock brand category avgRatings',
  });

  res.status(201).json({
    status: 'success',
    message: 'Product added to wishlist',
    data: {
      wishlist,
    },
  });
});

/**
 * DELETE /api/v1/wishlist/items/:productId
 * Remove product from wishlist
 */
exports.removeFromWishlist = catchAsync(async (req, res, next) => {
  const { productId } = req.params;

  const wishlist = await Wishlist.findOne({ user: req.userId });

  if (!wishlist) {
    throw new AppError('Wishlist not found', 404);
  }

  if (!wishlist.products.includes(productId)) {
    throw new AppError('Product not found in wishlist', 404);
  }

  // Remove product
  wishlist.products = wishlist.products.filter(
    (id) => id.toString() !== productId,
  );

  await wishlist.save();

  res.status(200).json({
    status: 'success',
    message: 'Product removed from wishlist',
    data: {
      wishlist,
    },
  });
});

/**
 * POST /api/v1/wishlist/toggle/:productId
 * Toggle product in wishlist (add if not exists, remove if exists)
 */
exports.toggleWishlist = catchAsync(async (req, res, next) => {
  const { productId } = req.params;

  // ✅ Validate product exists
  const product = await Product.findById(productId);
  if (!product) {
    throw new AppError('Product not found', 404);
  }

  let wishlist = await Wishlist.findOne({ user: req.userId });
  let action;

  if (!wishlist) {
    // Create new wishlist with product
    wishlist = await Wishlist.create({
      user: req.userId,
      products: [productId],
    });
    action = 'added';
  } else {
    const index = wishlist.products.indexOf(productId);

    if (index > -1) {
      // Remove if exists
      wishlist.products.splice(index, 1);
      action = 'removed';
    } else {
      // Add if doesn't exist
      wishlist.products.push(productId);
      action = 'added';
    }

    await wishlist.save();
  }

  // Populate before sending response
  await wishlist.populate({
    path: 'products',
    select: 'title images unitPrice discount stock brand category avgRatings',
  });

  res.status(200).json({
    status: 'success',
    action,
    message: `Product ${action} ${action === 'added' ? 'to' : 'from'} wishlist`,
    data: {
      wishlist,
    },
  });
});
