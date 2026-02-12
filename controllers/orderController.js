const catchAsync = require('../utils/catchAsync');
const APIFeatures = require('../utils/APIFeatures');
const Cart = require('../models/cartModels');
const Order = require('../models/orderModels');
const AppError = require('../utils/appError');
const mongoose = require('mongoose');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// ==============================
// USER CONTROLLERS
// ==============================

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
        image: item.product.images[0],
        quantity: item.quantity,
      }));

      [order] = await Order.create(
        [
          {
            user: userId,
            items: cartItems,
            totalAmount: cart.totalPrice,
            status: 'pending',
            paymentStatus: 'unpaid',
            payment: {
              provider: 'stripe',
            },
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

exports.getMyOrders = catchAsync(async (req, res, next) => {
  const baseQuery = Order.find({ user: req.user.id });

  const features = new APIFeatures(baseQuery, req.query)
    .filter()
    .sort()
    .limitFields()
    .pagination();

  const countFeatures = new APIFeatures(
    Order.find({ user: req.user.id }),
    req.query,
  ).filter();

  const totalDocuments = await countFeatures.query.countDocuments();

  const orders = await features.query;

  const pagination = features.getPaginationMetadata(totalDocuments);

  res.status(200).json({
    status: 'success',
    results: orders.length,
    pagination,
    data: { orders },
  });
});

exports.getOrderById = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  // Build query with authorization check
  const query = { _id: id };

  // If not admin, restrict to user's own orders
  if (req.user?.role !== 'admin') {
    query.user = req.userId;
  }

  const order = await Order.findOne(query)
    .populate('items.product', 'title brand category images stock') // Get current product state
    .populate('user', 'fullname email'); // Get user details (useful for admin)

  if (!order) {
    return next(new AppError('Order not found or you do not have access', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { order },
  });
});

// ==============================
// ADMIN CONTROLLERS
// ==============================

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

exports.getAllOrders = catchAsync(async (req, res, next) => {
  const features = new APIFeatures(Order.find().populate('user'), req.query)
    .filter()
    .sort()
    .limitFields()
    .pagination();

  const countFeatures = new APIFeatures(Order.find(), req.query).filter();
  const totalDocuments = await countFeatures.query.countDocuments();

  const orders = await features.query;

  const pagination = features.getPaginationMetadata(totalDocuments);

  res.status(200).json({
    status: 'success',
    results: orders.length,
    pagination,
    data: { orders },
  });
});

// ==============================
// STRIPE
// ==============================

exports.createCheckoutSession = catchAsync(async (req, res, next) => {
  const order = await Order.findById(req.params.orderId);

  if (!order) {
    return next(new AppError('Order not found', 404));
  }

  if (order.paymentStatus === 'paid') {
    return next(new AppError('Order already paid', 400));
  }
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    line_items: order.items.map((item) => ({
      price_data: {
        currency: 'aed',
        product_data: {
          name: item.name,
          images: [item.image],
        },
        unit_amount: item.price * 100, // AED → fils
      },
      quantity: item.quantity,
    })),
    success_url: `${process.env.FRONTEND_URL}/checkout/success?order=${order._id}`,
    cancel_url: `${process.env.FRONTEND_URL}/checkout/cancel`,
    metadata: {
      orderId: order._id.toString(),
      userId: order.user.toString(),
    },
  });

  // Save intent/session id
  order.payment = {
    provider: 'stripe',
    intentId: session.id,
    paidAt: new Date(),
  };

  await order.save();

  res.status(200).json({
    status: 'success',
    data: {
      checkoutUrl: session.url,
    },
  });
});

exports.stripeWebhook = catchAsync(async (req, res, next) => {
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const orderId = session.metadata.orderId;

    const order = await Order.findByIdAndUpdate(
      orderId,
      {
        $set: {
          paymentStatus: 'paid',
          status: 'confirmed',
          payment: {
            provider: 'stripe',
            intentId: session.payment_intent,
            paidAt: new Date(),
          },
        },
      },
      { new: true },
    );

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
  }

  res.status(200).json({ received: true });
});
