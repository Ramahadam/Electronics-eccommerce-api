const express = require('express');
const router = express.Router();
const wishlistController = require('../controllers/wishlistController');

// Import from middleware (new pattern)
const { protect, appendUserId } = require('../middleware/auth.middleware');

// ✅ Apply authentication to all routes
router.use(protect);
router.use(appendUserId);

// Core operations
router.route('/').get(wishlistController.getWishlist);

router
  .route('/items/:productId')
  .post(wishlistController.addToWishlist)
  .delete(wishlistController.removeFromWishlist);

// Advanced features
router.post('/toggle/:productId', wishlistController.toggleWishlist);
router.get('/check/:productId', wishlistController.checkInWishlist);
router.delete('/clear', wishlistController.clearWishlist);

module.exports = router;
