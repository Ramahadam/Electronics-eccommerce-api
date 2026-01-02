// routes/cartRoutes.js
const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const authController = require('../controllers/authController');
// const { protect } = require('../middleware/authMiddleware'); // ensure user is logged in

// router.use(protect); // all routes need auth
router.use(authController.protect);

router.use(authController.appendUserId);

router.get('/', cartController.getCart);
router.post('/', cartController.addToCart);
router.patch('/:itemId', cartController.updateCartItem);
router.delete('/', cartController.removeCartItem);

module.exports = router;
