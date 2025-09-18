const mongoose = require('mongoose');
const { Schema } = mongoose;

const reviewSchema = new Schema({
  productId: {
    type: mongoose.ObjectId,
    required: true,
  },
  userId: {
    type: mongoose.ObjectId,
    required: true,
  },
  score: Number,
});

export const Review = mongoose.model('Review', reviewSchema);
