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

exports.updateReview = async (req, res, next) => {
  try {
    // TODO Crucially, you add a second check to ensure the user making the request owns the review before updating it:
    /**
 * const reviewId = req.params.id;
const userIdFromToken = req.user.id; // Added by middleware

const updatedReview = await ReviewModel.findOneAndUpdate(
    { _id: reviewId, userId: userIdFromToken }, // <-- Check ownership here
    req.body,
    { new: true, runValidators: true }
);

if (!updatedReview) {
    // If null, either the review doesn't exist OR the current user doesn't own it
    return res.status(404).json({ message: "Review not found or user not authorized" });
}
 */

    const updatedReview = await Review.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedReview) throw new Error('No review found with this id');

    res.status(200).json({
      status: 'success',
      data: {
        review: updatedReview,
      },
    });
  } catch (err) {
    res.status(400).json({
      status: 'failed to updated the review',
      err,
    });
  }
};

exports.deleteReview = async (req, res, next) => {
  try {
    const deletedReview = await Review.findByIdAndDelete(req.params.id, {
      runValidators: true,
    });

    if (!deletedReview) throw new Error('Could not delte the review');

    res.status(200).json({
      status: 'success',
    });
  } catch (err) {
    res.status(400).json({
      status: 'failed to updated the review',
      err,
    });
  }
};
