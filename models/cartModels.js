// models/cart.js
const mongoose = require('mongoose');
const { Schema } = mongoose;
const Product = require('./productModels');

const cartItemSchema = new Schema({
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
  unitPrice: {
    type: Number,
    require: [true, 'Unit price is require'],
  },
});

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

// Middleware to clean _id/__v on all finds
cartSchema.set('toJSON', {
  virtuals: true,
  versionKey: false, //Removes __v
  transform: (_, ret) => {
    ret.id = ret._id; // expose id
    delete ret._id;
  },
});

cartSchema.set('toObject', {
  virtuals: true,
  versionKey: false,
  transform: (_, ret) => {
    ret.id = ret._id;
    delete ret._id;
  },
});

cartSchema.methods.calculateTotalPrice = function () {
  const totalPrice = this.items.reduce((total, item) => {
    return total + Number(item.unitPrice) * item.quantity;
  }, 0);

  return totalPrice;
};

const Cart = mongoose.model('Cart', cartSchema);

module.exports = Cart;
