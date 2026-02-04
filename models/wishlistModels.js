const mongoose = require('mongoose');
const { ObjectId } = require('mongodb'); // or ObjectID Not Working

const wishlistSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // One wishlist per user
    },
    products: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
      },
    ],
  },
  {
    timestamps: true, // ✅ Add createdAt, updatedAt
  },
);

// ✅ Add index for faster queries
wishlistSchema.index({ user: 1 });
wishlistSchema.index({ products: 1 });

wishlistSchema.methods.removeItemFromWishlist = function (productId) {
  // convert productId to Object Id. - new ObjectId('68cc3f8ad0da946d33060842') for better comparsion

  this.products = this.products.filter(
    (product) => product.toString() !== productId,
  );
};

const Wishlist = mongoose.model('Wishlist', wishlistSchema);

module.exports = Wishlist;
