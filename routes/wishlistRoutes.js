const express = require('express');
const wihslistController = require('../controllers/wishlistController');
const authController = require('../controllers/authController');
const router = express.Router();

// Get all wishlists items

router
  .route('/')
  .get(wihslistController.getWishlist)
  .post(wihslistController.addToWishlist);

// Remove product from wishlist
router.route('/:productId').delete(wihslistController.removeFromWishlist);

module.exports = router;
