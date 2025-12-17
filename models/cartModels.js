// models/cart.js
const mongoose = require('mongoose');
const { Schema } = mongoose;
const Product = require('./productModels');

const cartItemSchema = new Schema(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    quantity: {
      type: Number,
      default: 1,
      min: [1, 'Quantity cannot be less than 1'],
    },
  },
  { _id: false } // prevent automatic _id for subdocuments
);

const cartSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User', // assuming you have users
      required: true,
      unique: true, // one cart per user
    },
    items: [cartItemSchema],
    totalPrice: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

cartSchema.methods.calculateTotalPrice = async (items) => {
  let total = 0;
  for (const item of items) {
    const product = await Product.findById(item.product);
    if (product) total += product.unitPrice * item.quantity;
  }
  return total;
};

const Cart = mongoose.model('Cart', cartSchema);

module.exports = Cart;
