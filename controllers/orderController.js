const catchAsync = require('../utils/catchAsync');
const Cart = require('../models/cartModels');
const Order = require('../models/orderModels');
const AppError = require('../utils/appError');
const mongoose = require('mongoose');

exports.createOrder = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  let order;

  try {
    await session.withTransaction(async () => {
      const userId = req.userId;

      const cart = await Cart.findOne({ user: userId })
        .populate('items.product')
        .session(session);

      if (!cart || !cart.items.length) {
        throw new AppError('Empty cart or user not found', 404);
      }

      const cartItems = cart.items.map((item) => ({
        product: item.product._id,
        name: item.product.title,
        price: item.unitPrice,
        quantity: item.quantity,
      }));

      [order] = await Order.create(
        [
          {
            user: userId,
            items: cartItems,
            totalAmount: cart.totalPrice,
            status: 'pending',
          },
        ],
        { session },
      );

      await Cart.findOneAndUpdate(
        { user: userId },
        { $set: { items: [], totalPrice: 0 } },
        { session },
      );
    });

    res.status(201).json({
      status: 'success',
      data: { order },
    });
  } finally {
    await session.endSession();
  }
});
