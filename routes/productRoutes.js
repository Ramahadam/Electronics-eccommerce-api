const express = require('express');
const Product = require('../models/productModels');
const productController = require('../controllers/productController');
const reviewController = require('../controllers/reviewController');

const authController = require('../controllers/authController');

const router = express.Router();

router
  .route('/')
  .get(productController.getAllProducts)
  .post(
    authController.protect,
    authController.restrictTo('admin'),
    productController.createProduct,
  );

router
  .route('/:id')
  .get(productController.getProduct)
  .patch(
    authController.protect,
    authController.restrictTo('admin'),
    productController.updateProduct,
  )
  .delete(
    authController.protect,
    authController.restrictTo('admin'),
    productController.deleteProduct,
  );

// Nested routes for product review
// GET /products/:productId/reviews
// POST /products/:productId/reviews
router
  .route('/:productId/reviews')
  .get(reviewController.getAllReviews)
  .post(authController.protect, reviewController.createReview);

module.exports = router;
