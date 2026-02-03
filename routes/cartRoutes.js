// routes/cartRoutes.js
const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const authMiddleware = require('../middleware/auth.middleware');

router.use(authMiddleware.protect);

router.use(authMiddleware.appendUserId);

router.get('/', cartController.getCart);
router.post('/', cartController.addToCart);
router.patch('/:itemId', cartController.updateCartItem);
router.delete('/:itemId', cartController.removeCartItem);
router.delete('/', cartController.clearCart);
module.exports = router;
