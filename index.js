const express = require('express');
const Product = require('./models/productModels');
const app = express();

app.get('/api/v1/products', async (req, res) => {
  try {
    const products = await Product.find();
    console.log(products);

    res.status(200).json({
      status: 'success',
      data: {
        products,
      },
    });
  } catch (err) {
    res.status(404).json({
      status: 'failed',
      message: {
        err,
      },
    });
  }
});

app.get('/api/v1/products/:id', async (req, res) => {
  try {
    console.log(req.params);

    res.status(200).json({
      status: 'success',
      data: {},
    });
  } catch (err) {
    console.log(err);
  }
});

module.exports = app;
