const Wishlist = require('../models/wishlistModels');
const catchAsync = require('../utils/catchAsync');

// GET ALL ITEMS FROM WISHLIST
exports.getWishlist = catchAsync(async (req, res, next) => {
  const userId = req.user;
  console.log(userId);
  const wishlists = await Wishlist.findOne({ user: userId });

  if (!wishlists) {
    return res.status(404).json({
      status: 'failed',
      message: 'wishilist is empty',
    });
  }

  res.status(200).json({
    status: 'success',
    data: {
      wishlists,
    },
  });
});

// ADD PRODUCT FROM WISHLIST
exports.addToWishlist = catchAsync(async (req, res, next) => {
  const user = req.user;

  const { productId } = req.body;

  let wishlist = await Wishlist.findOne({ user });

  if (!wishlist) {
    wishlist = await Wishlist.create({ user });
  }

  if (!wishlist.products.includes(productId)) {
    wishlist.products.push(productId);
  }

  await wishlist.save();
  res.status(201).json({
    status: 'success',
    data: {
      wishlist,
    },
  });
});

// REMOVE PRODUCT FROM WISHLIST
exports.removeFromWishlist = catchAsync(async (req, res, next) => {
  const user = req.user;
  const { productId } = req.body;

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
