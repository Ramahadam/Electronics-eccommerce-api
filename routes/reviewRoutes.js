const express = require('express');
const reviewController = require('../controllers/reviewController');
const authMiddleware = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authMiddleware.protect);

router
  .route('/:id')
  .patch(reviewController.updateReview)
  .delete(reviewController.deleteReview);

module.exports = router;
