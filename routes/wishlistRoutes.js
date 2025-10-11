const express = require('express');
const wihslistController = require('../controllers/wishlistController');
const authController = require('../controllers/authController');
const router = express.Router();

// Get all wishlists items

router
  .route('/')
  .get(authController.protect, wihslistController.getWishlist)
  .post(authController.protect, wihslistController.addToWishlist);

// Remove product from wishlist
router
  .route('/:productId')
  .delete(authController.protect, wihslistController.removeFromWishlist);

module.exports = router;
