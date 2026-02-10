// routes/cartRoutes.js
const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const adminOrderController = require('../controllers/adminOrderController');
const authMiddleware = require('../middleware/auth.middleware');

router.post(
  '/webhook/stripe',
  express.raw({ type: 'application/json' }),
  orderController.stripeWebhook,
);

router.use(authMiddleware.protect);

router.use(authMiddleware.appendUserId);

router.post('/', orderController.createOrder);

router.post(
  '/admin',
  authMiddleware.restrictTo('admin'),
  adminOrderController.createAdminOrder,
);

// checkout session
router.post('/:orderId/checkout', orderController.createCheckoutSession);

module.exports = router;
