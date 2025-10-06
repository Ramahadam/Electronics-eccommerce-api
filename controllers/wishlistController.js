const Wishlist = require('../models/wishlistModels');

// GET ALL ITEMS FROM WISHLIST
exports.getAllWishlistedItems = async (req, res, next) => {
  try {
    const wishlists = await Wishlist.find();

    if (!data) {
      return res.status(404).json({
        status: 'failed',
        message: 'not found',
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        wishlists,
      },
    });
  } catch (error) {
    console.log(error);
  }
};

// ADD PRODUCT FROM WISHLIST
exports.addProductToWishlist = async (req, res, next) => {
  try {
    const { userId, productId } = req.body;

    let wishlist = await Wishlist.findOne({ user: userId });

    if (!wishlist) {
      wishlist = await Wishlist.create({ user: userId });
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
  } catch (error) {
    console.log(error);
  }
};

// REMOVE PRODUCT FROM WISHLIST
exports.removeProductFormWishlist = async (req, res, next) => {
  try {
    const wishlists = await Wishlist.findOneAndDelete();

    if (!data) {
      return res.status(404).json({
        status: 'failed',
        message: 'not found',
      });
    }

    res.status(200).json({
      status: 'success',
      data: null,
    });
  } catch (error) {
    console.log(error);
  }
};
