const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const mongoSanitize = require('express-mongo-sanitize');

const app = express();

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

// const userRouter = require('./routes/userRoutes');
const authRouter = require('./routes/authRoutes');
const productRouter = require('./routes/productRoutes');
const wishlistRouter = require('./routes/wishlistRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const cartRoutes = require('./routes/cartRoutes');

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/products', productRouter);
app.use('/api/v1/wishlists', wishlistRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/cart', cartRoutes);

module.exports = app;
