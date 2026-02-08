const catchAsync = require('../utils/catchAsync');
const Cart = require('../models/cartModels');
const Order = require('../models/orderModels');
const AppError = require('../utils/appError');

exports.createOrder = catchAsync(async (req, res, next) => {
  const userId = req.userId;

  // Find the cartBy user ID
  const cart = await Cart.find({ user: userId }).populate('items.product');

  // If there is no cart return 404 empty
  if (!cart || !userId) return next(AppError('Empty cart', 404));

  // normalize cart items
  const cartItems = cart[0].items.map((cur) => ({
    product: cur.product.id,
    name: cur.product.title,
    price: cur.product.unitPrice,
    quantity: cur.quantity,
  }));

  // prepare the order
  //   const order = {
  //     user: userId,
  //     items: cartItems,
  //     totalAmount: cart[0].totalPrice,
  //   };

  // create the order

  const newOrder = await Order.create({
    user: userId,
    items: cartItems,
    totalAmount: cart[0].totalPrice,
  });

  console.log(newOrder);

  res.status(200).json({
    status: 'success',
    data: {
      order: newOrder,
    },
  });
});
