const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const app = express();

app.use(express.json());

// Allow your Next.js frontend
app.use(cors({ origin: 'http://localhost:3000' }));

// OR allow all origins (not recommended for production)
app.use(cors());

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('tiny'));
}

const productRouter = require('./routes/productRoutes');
const userRouter = require('./routes/userRoutes');

app.use('/api/v1/products', productRouter);
app.use('/api/v1/users', userRouter);

module.exports = app;
