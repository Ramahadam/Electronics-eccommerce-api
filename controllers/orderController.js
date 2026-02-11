const catchAsync = require('../utils/catchAsync');
const Cart = require('../models/cartModels');
const Order = require('../models/orderModels');
const AppError = require('../utils/appError');
const mongoose = require('mongoose');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

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

exports.getOrders = catchAsync(async (req, res, next) => {
  const userId = req.user.id;

  const orders = await Order.find({ user: userId })
    .populate('items.product', 'title images')
    .sort('-createdAt');

  res.status(200).json({
    status: 'success',
    results: orders.length,
    data: {
      orders,
    },
  });
});

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
