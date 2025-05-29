const express = require('express');
const morgan = require('morgan');
const app = express();

app.use(express.json());

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('tiny'));
}

const productRouter = require('./routes/productRoutes');

app.use('/api/v1/products', productRouter);

module.exports = app;
