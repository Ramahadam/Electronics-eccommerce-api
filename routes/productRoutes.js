const express = require('express');
const productController = require('../controllers/productController');
const reviewController = require('../controllers/reviewController');

const authMiddleware = require('../middleware/auth.middleware');

const {
  createProductValidation,
  queryValidation,
  validate,
  updateProductValidation,
} = require('../middleware/validateProduct');

const router = express.Router();

router
  .route('/')
  .get(queryValidation, validate, productController.getAllProducts)
  .post(
    authMiddleware.protect,
    authMiddleware.restrictTo('admin'),
    createProductValidation,
    validate,
    productController.createProduct,
  );

router
  .route('/:id')
  .get(productController.getProduct)
  .patch(
    authMiddleware.protect,
    authMiddleware.restrictTo('admin'),
    updateProductValidation,
    validate,
    productController.updateProduct,
  )
  .delete(
    authMiddleware.protect,
    authMiddleware.restrictTo('admin'),
    productController.deleteProduct,
  );

router
  .route('/:productId/reviews')
  .get(reviewController.getAllReviews)
  .post(authMiddleware.protect, reviewController.createReview);

module.exports = router;
