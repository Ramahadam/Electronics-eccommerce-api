// routes/cartRoutes.js
const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const adminOrderController = require('../controllers/adminOrderController');
const authMiddleware = require('../middleware/auth.middleware');

router.use(authMiddleware.protect);

router.use(authMiddleware.appendUserId);

router.post('/', orderController.createOrder);

router.post(
  '/admin',
  authMiddleware.restrictTo('admin'),
  adminOrderController.createAdminOrder,
);

module.exports = router;
