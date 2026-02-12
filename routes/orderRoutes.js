// routes/cartRoutes.js
const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const authMiddleware = require('../middleware/auth.middleware');

// ==============================
// AUTH ROUTES
// ==============================

router.use(authMiddleware.protect);

router.use(authMiddleware.appendUserId);

// ==============================
// USER ROUTES
// ==============================

router.post('/', orderController.createOrder);

router.get('/my-orders', orderController.getMyOrders);

router.get('/:id', orderController.getOrderById);
// ==============================
// STRIPE CHECKOUT SESSION
// ==============================

router.post('/:orderId/checkout', orderController.createCheckoutSession);

// ==============================
// ADMIN ROUTES
// ==============================

router.use(authMiddleware.restrictTo('admin'));

router.get('/', orderController.getAllOrders);

router.post('/admin', orderController.createAdminOrder);

router.patch('/:id/status', orderController.updateOrderStatus);

module.exports = router;
