const express = require('express');
const wihslistController = require('../controllers/wishlistController');
const router = express.Router();

// Get all wishlists items

router
  .route('/')
  .get(wihslistController.getAllWishlistedItems)
  .post(wihslistController.addProductToWishlist);

// Remove product from wishlist
router.route('/:id').delete(wihslistController.removeProductFormWishlist);

module.exports = router;
