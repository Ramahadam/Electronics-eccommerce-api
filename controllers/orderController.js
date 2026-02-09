const catchAsync = require('../utils/catchAsync');
const Cart = require('../models/cartModels');
const Order = require('../models/orderModels');
const AppError = require('../utils/appError');
const mongoose = require('mongoose');

// exports.createOrder = catchAsync(async (req, res, next) => {
//   const session = await mongoose.startSession();

//   // withTransaction handles startTransaction, commit, and abort automatically
//   try {
//     await session.withTransaction(async () => {
//       const userId = req.userId;

//       // 1. Fetch Cart (Must pass { session } to every query)
//       const carts = await Cart.find({ user: userId })
//         .populate('items.product')
//         .session(session);

//       // Entire cart is array of single object
//       const cart = carts[0];

//       if (!cart || !cart.items.length) {
//         throw new AppError('Empty cart or user not found', 404);
//       }

//       // 2. Map Items
//       const cartItems = cart.items.map((cur) => ({
//         product: cur.product.id,
//         name: cur.product.title,
//         price: cur.product.unitPrice,
//         quantity: cur.quantity,
//       }));

//       // 3. Create Order (Pass session)
//       const newOrder = await Order.create(
//         [
//           {
//             user: userId,
//             items: cartItems,
//             totalAmount: cart.totalPrice,
//           },
//         ],
//         { session },
//       );

//       // 4. Clear Cart (Pass session)
//       const updatedCart = await Cart.findOneAndUpdate(
//         { user: userId },
//         { $set: { items: [], totalPrice: 0 } },
//         { new: true, session }, // with { session }
//       );

//       res.status(200).json({
//         status: 'success',
//         data: { order: newOrder[0], cart: updatedCart },
//       });
//     });
//   } finally {
//     session.endSession(); // Always end the session
//   }
// });
// exports.createOrder = catchAsync(async (req, res, next) => {
//   const session = await mongoose.startSession();

//   // withTransaction handles startTransaction, commit, and abort automatically
//   await session.withTransaction(async () => {
//     const userId = req.userId;

//     // 1. Fetch Cart (Must pass { session } to every query)
//     const carts = await Cart.find({ user: userId })
//       .populate('items.product')
//       .session(session);

//     // Entire cart is array of single object
//     const cart = carts[0];

//     if (!cart || !cart.items.length) {
//       throw new AppError('Empty cart or user not found', 404);
//     }

//     // 2. Map Items
//     const cartItems = cart.items.map((cur) => ({
//       product: cur.product.id,
//       name: cur.product.title,
//       price: cur.product.unitPrice,
//       quantity: cur.quantity,
//     }));

//     // 3. Create Order (Pass session)
//     const newOrder = await Order.create(
//       [
//         {
//           user: userId,
//           items: cartItems,
//           totalAmount: cart.totalPrice,
//         },
//       ],
//       { session },
//     );

//     // 4. Clear Cart (Pass session)
//     const updatedCart = await Cart.findOneAndUpdate(
//       { user: userId },
//       { $set: { items: [], totalPrice: 0 } },
//       { new: true, session }, // with { session }
//     );

//     res.status(200).json({
//       status: 'success',
//       data: { order: newOrder[0], cart: updatedCart },
//     });
//   });

//   session.endSession(); // Always end the session
// });

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
        price: item.unitPrice, // Cart item's saved price
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
        { session }, // new: true not needed since we don't use result
      );
    });

    res.status(201).json({
      status: 'success',
      data: { order },
    });
  } finally {
    session.endSession();
  }
});
