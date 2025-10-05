const express = require('express');

const router = express.Router;

// Get all wishlists items

router.route('/').get(getAllWishlistedItems);

// Add product to wishlist
router.route('/').post(addProductToWishlist);

// Remove product from wishlist
router.route('/:id').delete(removeProductFormWishlist);

module.exports = router;
