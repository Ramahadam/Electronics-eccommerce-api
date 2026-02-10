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
      //   const items = {
      //     product: item.product._id,
      //     name: item.product.title,
      //     price: item.unitPrice,
      //     quantity: item.quantity,
      //   }

      const { userId, items } = req.body;

      if ((!userId, !items || !items.length)) {
        return new AppError('User Id and items are required', 400);
      }

      const totalAmount = (req.body.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      )[order] = await Order.create(
        [
          {
            user: userId,
            items,
            totalAmount,
            status: 'confirmed',
            paymentStatus: 'unpaid',
          },
        ],
        { session },
      ));
    });

    res.status(201).json({
      status: 'success',
      data: { order },
    });
  } finally {
    await session.endSession();
  }
});
