const Review = require('../models/reviewModels');

// Get all reviews on specific product
exports.getAllReviews = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const reviews = await Review.find({ product: productId });

    res.status(200).json({
      status: 'success',
      length: reviews.length,
      data: {
        reviews,
      },
    });
  } catch (err) {
    console.log(err);
  }
};

// Get a review on specific product

exports.createReview = async (req, res, next) => {
  try {
    const product = req.params.productId;
    console.log(product, req.body);
    const newReview = await Review.create({ ...req.body, product });

    res.status(201).json({
      status: 'success',
      data: {
        newReview,
      },
    });
  } catch (err) {
    res.status(400).json({
      status: 'failed',
      err,
    });
  }
};

exports.updateReview = (req, res, next) => {};

exports.deleteReview = (req, res, next) => {};
