const Review = require('../models/reviewModels');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

// Get all reviews on specific product
exports.getAllReviews = catchAsync(async (req, res, next) => {
  const { productId } = req.params;
  const reviews = await Review.find({ product: productId });

  res.status(200).json({
    status: 'success',
    length: reviews.length,
    data: {
      reviews,
    },
  });
});

// Get a review on specific product

exports.createReview = catchAsync(async (req, res, next) => {
  const product = req.params.productId;
  console.log(product, req.body);
  const newReview = await Review.create({ ...req.body, product });

  res.status(201).json({
    status: 'success',
    data: {
      newReview,
    },
  });
});

exports.updateReview = catchAsync(async (req, res, next) => {
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
    },
  );

  if (!updatedReview) throw new AppError('No review found with this id', 404);

  res.status(200).json({
    status: 'success',
    data: {
      review: updatedReview,
    },
  });
});

exports.deleteReview = catchAsync(async (req, res, next) => {
  // TODO Crucially, you add a second check to ensure the user making the request owns the review before deelteing it:
  /**
 * const reviewId = req.params.id;
const userIdFromToken = req.user.id; // Added by middleware

const updatedReview = await ReviewModel.findOneAndDelete(
    { _id: reviewId, userId: userIdFromToken }, // <-- Check ownership here
    req.body,
    { new: true, runValidators: true }
);

if (!updatedReview) {
    // If null, either the review doesn't exist OR the current user doesn't own it
    return res.status(404).json({ message: "Review not found or user not authorized" });
}
 */

  const deletedReview = await Review.findByIdAndDelete(req.params.id, {
    runValidators: true,
  });

  if (!deletedReview) throw new AppError('Could not delte the review', 400);

  res.status(200).json({
    status: 'success',
  });
});
