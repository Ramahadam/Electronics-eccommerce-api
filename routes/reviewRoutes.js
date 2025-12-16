const express = require('express');
const reviewController = require('../controllers/reviewController');

const router = express.Router();

router
  .route('/:id')
  .patch(reviewController.updateReview)
  .delete(reviewController.deleteReview);

module.exports = router;
