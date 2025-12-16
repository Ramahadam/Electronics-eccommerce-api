const Review = require('../models/reviewModels');

exports.getAllReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find();

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

exports.createReview = async (req, res, next) => {
  try {
    const newReview = await Review.create(req.body);

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

exports.getReview = (req, res, next) => {};

exports.updateReview = (req, res, next) => {};

exports.deleteReview = (req, res, next) => {};
