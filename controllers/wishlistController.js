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

// REMOVE PRODUCT FROM WISHLIST
exports.removeFromWishlist = catchAsync(async (req, res, next) => {
  const user = req.user;
  const { productId } = req.params;

  let wishlists = await Wishlist.findOne({ user });

  if (!wishlists) {
    return res.status(404).json({
      status: 'Failed ',
      message: 'No wishilist found',
    });
  }

  // If there is wishilist check if the product exists .
  if (wishlists.products) {
    if (wishlists?.products?.includes(productId)) {
      wishlists.removeItemFromWishlist(productId);

      await wishlists.save();
    }

    if (!wishlists.products.length) {
      await Wishlist.findByIdAndDelete({ _id: wishlists._id });
      return res.status(200).json({
        status: 'success',
        message: 'wishilist is empty',
      });
    }
  }

  // If the product exists in the wishlish remove the product.
  // If the product doesn't exist do nothing.

  res.status(200).json({
    status: 'success',
    data: wishlists,
  });
});
