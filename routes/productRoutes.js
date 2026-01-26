const express = require('express');
const productController = require('../controllers/productController');
const reviewController = require('../controllers/reviewController');

const authController = require('../controllers/authController');

const {
  createProductValidation,
  validate,
  queryValidation,
  updateProductValidation,
} = require('../middleware/validateProduct');

const router = express.Router();

router
  .route('/')
  .get(queryValidation, validate, productController.getAllProducts)
  .post(
    authController.protect,
    authController.restrictTo('admin'),
    createProductValidation,
    validate,
    productController.createProduct,
  );

router
  .route('/:id')
  .get(productController.getProduct)
  .patch(
    authController.protect,
    authController.restrictTo('admin'),
    validate,
    updateProductValidation,
    productController.updateProduct,
  )
  .delete(
    authController.protect,
    authController.restrictTo('admin'),
    productController.deleteProduct,
  );

router
  .route('/:productId/reviews')
  .get(reviewController.getAllReviews)
  .post(authController.protect, reviewController.createReview);

module.exports = router;
