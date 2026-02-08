// routes/cartRoutes.js
const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const authMiddleware = require('../middleware/auth.middleware');

router.use(authMiddleware.protect);

router.use(authMiddleware.appendUserId);

router.post('/', orderController.createOrder);

module.exports = router;
