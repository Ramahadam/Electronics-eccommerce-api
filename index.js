const express = require('express');
const morgan = require('morgan');

const Product = require('./models/productModels');

const app = express();

app.use(express.json());

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('tiny'));
}

app.get('/api/v1/products', async (req, res) => {
  try {
    const products = await Product.find();

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
    const product = await Product.findById(req.params.id);

    res.status(200).json({
      status: 'success',
      data: {
        product,
      },
    });
  } catch (err) {
    console.log(err);
  }
});

app.post('/api/v1/products', async (req, res) => {
  try {
    const newProduct = await Product.insertOne(req.body);

    res.status(201).json({
      status: 'success',
      data: {
        product: newProduct,
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

app.delete('/api/v1/products/:id', async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);

    res.status(204).json({
      status: 'success',
      data: null,
    });
  } catch (err) {
    console.log(err);
  }
});

app.patch('/api/v1/products/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      status: 'success',
      data: {
        product,
      },
    });
  } catch (err) {
    console.log(err);
  }
});

module.exports = app;
