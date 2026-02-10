const catchAsync = require('../utils/catchAsync');
const Cart = require('../models/cartModels');
const Order = require('../models/orderModels');
const AppError = require('../utils/appError');
const mongoose = require('mongoose');

exports.createAdminOrder = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  let order;

  try {
    await session.withTransaction(async () => {
      const { userId, items } = req.body;

      if (!userId || !items || !items.length) {
        throw new AppError('UserId and items are required', 400);
      }

      const totalAmount = items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );

      [order] = await Order.create(
        [
          {
            user: userId,
            items,
            totalAmount,
            status: 'confirmed', // admin orders are usually confirmed
            paymentStatus: 'unpaid',
          },
        ],
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
