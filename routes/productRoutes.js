const express = require('express');
const Product = require('../models/productModels');
const productController = require('../controllers/productController');
const reviewController = require('../controllers/reviewController');

const authController = require('../controllers/authController');

const router = express.Router();

// router
//   .route('/')
//   .get(
//     authController.protect,
//     authController.restrictTo('admin'),
//     productController.getAllProducts
//   )

router
  .route('/')
  .get(productController.getAllProducts)
  .post(productController.createProduct);

router
  .route('/:id')
  .get(authController.protect, productController.getProduct)
  .patch(productController.updateProduct)
  .delete(productController.deleteProduct);

// Nested routes for product review
// GET /products/:productId/reviews
// POST /products/:productId/reviews
router
  .route('/:productId/reviews')
  .get(reviewController.getAllReviews)
  .post(reviewController.createReview);

module.exports = router;
