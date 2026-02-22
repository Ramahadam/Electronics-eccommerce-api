const catchAsync = require('../utils/catchAsync');
const APIFeatures = require('../utils/APIFeatures');
const Cart = require('../models/cartModels');
const Order = require('../models/orderModels');
const mongoose = require('mongoose');
const Stock = require('../models/stockModels');
const StockMovement = require('../models/stockMovementModels');
const AppError = require('../utils/appError');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// ==============================
// USER CONTROLLERS
// ==============================

/**
 * CREATE ORDER
 *
 * STOCK INTEGRATION:
 * 1. Validate stock availability for all items
 * 2. Reserve stock for each item
 * 3. Record stock movements
 * 4. All within transaction for atomicity
 */

exports.createOrder = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  let order;
  try {
    await session.withTransaction(async () => {
      const userId = req.userId;
      // Get cart with populated products
      const cart = await Cart.findOne({ user: userId })
        .populate('items.product')
        .session(session);
      if (!cart || !cart.items.length) {
        throw new AppError('Empty cart or user not found', 404);
      }

      // Step 1: Fetch all stocks in parallel
      const stockPromises = cart.items.map((item) =>
        Stock.findOne({ product: item.product._id }).session(session),
      );
      const stocks = await Promise.all(stockPromises);

      // Step 2: Validate stock and prepare reservation
      const stockValidations = cart.items.map((item, idx) => {
        const stock = stocks[idx];
        if (!stock) {
          throw new AppError(
            `Stock information not available for ${item.product.title}`,
            404,
          );
        }
        const availableStock = stock.quantity - stock.reserved;
        if (availableStock < item.quantity) {
          throw new AppError(
            `Insufficient stock for ${item.product.title}. Available: ${availableStock}, Requested: ${item.quantity}`,
            400,
          );
        }
        return { stock, item, availableStock };
      });

      // Step 3: Reserve stock for each item in parallel
      const reservePromises = stockValidations.map(({ stock, item }) =>
        stock.reserve(item.quantity, session),
      );
      const updatedStocks = await Promise.all(reservePromises);

      // Step 4: Batch create stock movements
      const stockMovements = stockValidations.map(({ stock, item }, idx) => ({
        product: item.product._id,
        type: 'sale',
        quantity: -item.quantity,
        balanceBefore: stock.quantity,
        balanceAfter: stock.quantity - item.quantity,
        userId: userId,
        reason: 'Stock reserved for order',
        metadata: {
          reservedQuantity: item.quantity,
          productTitle: item.product.title,
        },
      }));
      await StockMovement.insertMany(stockMovements, { session });

      // Step 5: Create order
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
            payment: { provider: 'stripe' },
          },
        ],
        { session },
      );

      // Step 6: Clear cart
      await Cart.findOneAndUpdate(
        { user: userId },
        { $set: { items: [], totalPrice: 0 } },
        { session },
      );
    });
    res.status(201).json({
      status: 'success',
      message: 'Order created successfully. Stock reserved.',
      data: { order },
    });
  } finally {
    await session.endSession();
  }
});

/**
 * GET MY ORDERS
 *
 * No stock integration needed - just listing orders
 */

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

/**
 * CANCEL ORDER
 *
 * STOCK INTEGRATION:
 * 1. Validate order can be cancelled
 * 2. Release reserved stock
 * 3. Record stock movements
 * 4. All within transaction
 */
exports.cancelOrder = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      // Get order
      const order = await Order.findOne({
        _id: id,
        user: req.userId,
      }).session(session);

      if (!order) {
        throw new AppError('Order not found', 404);
      }

      // Check if order can be cancelled
      const cancellableStatuses = ['pending', 'confirmed'];
      if (!cancellableStatuses.includes(order.status)) {
        throw new AppError(
          `Cannot cancel order with status: ${order.status}. Please contact support.`,
          400,
        );
      }

      if (order.status === 'cancelled') {
        throw new AppError('Order is already cancelled', 400);
      }

      // ========================================
      // STOCK RELEASE
      // ========================================

      // Release reserved stock for each item
      for (const item of order.items) {
        const stock = await Stock.findOne({ product: item.product }).session(
          session,
        );

        if (!stock) {
          // Log warning but don't fail (product might have been deleted)
          console.warn(`Stock not found for product ${item.product}`);
          continue;
        }

        // Check order status to determine stock action
        if (order.paymentStatus === 'paid') {
          // Payment confirmed: Add back to quantity
          await stock.adjust(item.quantity, session);
        } else {
          // Payment not confirmed: Release reserved
          await stock.release(item.quantity, session);
        }

        // Record stock movement
        await StockMovement.create(
          [
            {
              product: item.product,
              type: 'return',
              quantity: item.quantity, // Positive = returned to stock
              balanceBefore: stock.quantity,
              balanceAfter: stock.quantity + item.quantity,
              orderId: order._id,
              userId: req.userId,
              reason: 'Order cancelled by user',
              metadata: {
                orderStatus: order.status,
                paymentStatus: order.paymentStatus,
                productName: item.name,
              },
            },
          ],
          { session },
        );
      }

      // Update order status
      order.status = 'cancelled';
      await order.save({ session });
    });

    res.status(200).json({
      status: 'success',
      message: 'Order cancelled successfully. Stock restored.',
    });
  } finally {
    await session.endSession();
  }
});

/**
 * CREATE ADMIN ORDER
 *
 * STOCK INTEGRATION:
 * Same as regular order creation but with admin privileges
 */
exports.createAdminOrder = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  let order;

  try {
    await session.withTransaction(async () => {
      const { userId, items } = req.body;

      if (!userId || !items || !items.length) {
        throw new AppError('UserId and items are required', 400);
      }

      // ========================================
      // STOCK VALIDATION & RESERVATION
      // ========================================

      // Validate and reserve stock for each item
      for (const item of items) {
        const stock = await Stock.findOne({ product: item.product }).session(
          session,
        );

        if (!stock) {
          throw new AppError(
            `Stock information not available for product ${item.product}`,
            404,
          );
        }

        // Reserve stock
        const updatedStock = await stock.reserved(item.quantity, session);

        if (!updatedStock) {
          throw new AppError(
            `Insufficient stock for product ${item.product}`,
            400,
          );
        }

        // Record movement
        await StockMovement.create(
          [
            {
              product: item.product,
              type: 'sale',
              quantity: -item.quantity,
              balanceBefore: stock.quantity,
              balanceAfter: updatedStock.quantity,
              userId: req.userId, // Admin who created the order
              reason: 'Admin order creation',
            },
          ],
          { session },
        );
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
            status: 'confirmed',
            paymentStatus: 'unpaid',
          },
        ],
        { session },
      );
    });

    res.status(201).json({
      status: 'success',
      message: 'Admin order created successfully. Stock reserved.',
      data: { order },
    });
  } finally {
    await session.endSession();
  }
});

/**
 * GET ALL ORDERS (ADMIN)
 *
 * No stock integration needed
 */

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

/**
 * UPDATE ORDER STATUS (ADMIN)
 *
 * CRITICAL STOCK INTEGRATION:
 * - When status changes to 'cancelled' → Release/restore stock
 * - Other status changes → No stock action needed
 *
 * Why stock handling is needed:
 * 1. Admin cancelling order = same as user cancelling
 * 2. Stock must be restored to inventory
 * 3. Movement must be recorded for audit
 */
exports.updateOrderStatus = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { status } = req.body;

  // Validate status value
  const validStatuses = [
    'pending',
    'confirmed',
    'shipped',
    'delivered',
    'cancelled',
  ];

  if (!validStatuses.includes(status)) {
    return next(
      new AppError(
        `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        400,
      ),
    );
  }

  const order = await Order.findById(id);

  if (!order) {
    return next(new AppError('Order not found', 404));
  }

  // Validate status transitions
  const currentStatus = order.status;
  const validTransitions = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['shipped', 'cancelled'],
    shipped: ['delivered', 'cancelled'], // ✅ Admin can cancel shipped orders
    delivered: [], // Final state
    cancelled: [], // Final state
  };

  // Allow setting same status (idempotent)
  if (currentStatus === status) {
    return res.status(200).json({
      status: 'success',
      message: `Order is already ${status}`,
      data: { order },
    });
  }

  // Check if transition is valid
  if (!validTransitions[currentStatus].includes(status)) {
    return next(
      new AppError(
        `Cannot transition from ${currentStatus} to ${status}. Valid transitions: ${validTransitions[currentStatus].join(', ') || 'none'}`,
        400,
      ),
    );
  }

  // ========================================
  // STOCK INTEGRATION: Handle Cancellation
  // ========================================

  if (status === 'cancelled') {
    // Admin is cancelling the order - MUST restore stock
    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        // Check if already cancelled (should not happen due to validation above, but safety check)
        if (order.status === 'cancelled') {
          throw new AppError('Order is already cancelled', 400);
        }

        // Release/restore stock for each item
        for (const item of order.items) {
          const stock = await Stock.findOne({ product: item.product }).session(
            session,
          );

          if (!stock) {
            console.warn(
              `Stock not found for product ${item.product}. Skipping stock restoration.`,
            );
            continue;
          }

          // Determine stock action based on payment status
          if (order.paymentStatus === 'paid') {
            // Payment was confirmed: Add back to quantity
            await stock.adjust(item.quantity, session);
          } else {
            // Payment not confirmed: Release reserved stock
            await stock.release(item.quantity, session);
          }

          // Record stock movement
          await StockMovement.create(
            [
              {
                product: item.product,
                type: 'return',
                quantity: item.quantity, // Positive = returned
                balanceBefore:
                  order.paymentStatus === 'paid'
                    ? stock.quantity - item.quantity
                    : stock.quantity,
                balanceAfter:
                  order.paymentStatus === 'paid'
                    ? stock.quantity
                    : stock.quantity, // Reserved just released, quantity unchanged
                orderId: order._id,
                userId: req.userId, // Admin who cancelled
                reason: `Order cancelled by admin (status change: ${currentStatus} → cancelled)`,
                metadata: {
                  previousStatus: currentStatus,
                  paymentStatus: order.paymentStatus,
                  productName: item.name,
                  cancelledBy: 'admin',
                },
              },
            ],
            { session },
          );
        }

        // Update order status
        order.status = 'cancelled';
        await order.save({ session });
      });

      await session.endSession();

      return res.status(200).json({
        status: 'success',
        message: 'Order cancelled and stock restored successfully',
        data: { order },
      });
    } catch (error) {
      await session.endSession();
      return next(error);
    }
  }

  // ========================================
  // Non-cancellation status updates (no stock action needed)
  // ========================================

  // For other status transitions (pending→confirmed, confirmed→shipped, shipped→delivered)
  // No stock action is needed because:
  // - Stock was already reserved when order was created
  // - Stock was confirmed when payment was made
  // - These status changes are just workflow updates

  order.status = status;
  await order.save();

  res.status(200).json({
    status: 'success',
    message: `Order status updated to ${status}`,
    data: { order },
  });
});
// ==============================
// STRIPE INTEGRATION
// ==============================

/**
 * CREATE CHECKOUT SESSION
 *
 * No additional stock integration needed (already reserved)
 */
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

/**
 * STRIPE WEBHOOK
 *
 * STOCK INTEGRATION:
 * 1. Confirm stock reservation (convert reserved to sold)
 * 2. Record stock movements
 */
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
    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        const stripeSession = event.data.object;
        const orderId = stripeSession.metadata.orderId;

        const order = await Order.findById(orderId).session(session);

        if (!order) {
          throw new Error('Order not found in webhook');
        }

        // ========================================
        // CONFIRM STOCK (Reserved → Sold)
        // ========================================

        for (const item of order.items) {
          const stock = await Stock.findOne({ product: item.product }).session(
            session,
          );

          if (!stock) {
            console.warn(`Stock not found for product ${item.product}`);
            continue;
          }

          // Confirm reservation: reduce quantity and reserved
          await stock.confirm(item.quantity, session);

          // Record confirmed sale movement
          await StockMovement.create(
            [
              {
                product: item.product,
                type: 'confirmed_sale',
                quantity: -item.quantity,
                balanceBefore: stock.quantity + item.quantity,
                balanceAfter: stock.quantity,
                orderId: order._id,
                reason: 'Payment confirmed',
                metadata: {
                  paymentProvider: 'stripe',
                  paymentIntent: stripeSession.payment_intent,
                  productName: item.name,
                },
              },
            ],
            { session },
          );
        }

        // Update order
        order.paymentStatus = 'paid';
        order.status = 'confirmed';
        order.payment = {
          provider: 'stripe',
          intentId: stripeSession.payment_intent,
          paidAt: new Date(),
        };
        await order.save({ session });
      });
    } catch (error) {
      console.error('Webhook transaction failed:', error);
      return res.status(500).json({ error: 'Webhook processing failed' });
    } finally {
      await session.endSession();
    }
  }

  res.status(200).json({ received: true });
});
