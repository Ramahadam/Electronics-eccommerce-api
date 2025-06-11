const express = require('express');
const morgan = require('morgan');
const app = express();

app.use(express.json());

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('tiny'));
}

const productRouter = require('./routes/productRoutes');
const userRouter = require('./routes/userRoutes');

app.use('/api/v1/products', productRouter);
app.use('/api/v1/users', userRouter);

module.exports = app;
