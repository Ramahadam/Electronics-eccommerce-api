const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const mongoSanitize = require('express-mongo-sanitize');
const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const {
  stripeWebhook: stripeWebhookController,
} = require('./controllers/orderController');
const app = express();

// Stripe webhook lifted before express.json() - stripe require raw request body
app.post(
  '/api/v1/order/webhook/stripe',
  express.raw({ type: 'application/json' }),
  stripeWebhookController,
);

app.use(express.json());

// Sanitize data to prevent NoSQL injection
app.use(
  mongoSanitize({
    replaceWith: '_', // Replace $ and . with _
    onSanitize: ({ req, key }) => {
      console.warn(`Sanitized key: ${key}`);
    },
  }),
);

// Allow your Next.js frontend
app.use(cors());

app.options(/.*/, cors()); // include before other routes

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('tiny'));
}

// Routes
const authRouter = require('./routes/authRoutes');
const productRouter = require('./routes/productRoutes');
const wishlistRouter = require('./routes/wishlistRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const cartRoutes = require('./routes/cartRoutes');
const orderRoutes = require('./routes/orderRoutes');

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/products', productRouter);
app.use('/api/v1/wishlists', wishlistRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/cart', cartRoutes);
app.use('/api/v1/order', orderRoutes);

// Handle undefined routes
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global error handling middleware (MUST BE LAST)
app.use(globalErrorHandler);

module.exports = app;
