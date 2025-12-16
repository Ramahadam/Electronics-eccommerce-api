const mongoose = require('mongoose');
const { Schema } = mongoose;

const reviewSchema = new Schema({
  product: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },

  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  rating: {
    type: Number,
    default: 4.5,
    max: [5, 'Maximum value must be 5'],
    min: [1, 'Minimum value must be 1'],
  },
  review: String,
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
