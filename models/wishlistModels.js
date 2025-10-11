const mongoose = require('mongoose');
const { ObjectId } = require('mongodb'); // or ObjectID Not Working

const wishlistSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  products: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
    },
  ],
});

wishlistSchema.methods.removeItemFromWishlist = function (productId) {
  // convert productId to Object Id. - new ObjectId('68cc3f8ad0da946d33060842') for better comparsion

  this.products = this.products.filter(
    (product) => product.toString() !== productId
  );
};

const Wishlist = mongoose.model('Wishlist', wishlistSchema);

module.exports = Wishlist;
