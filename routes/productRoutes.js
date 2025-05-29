const express = require('express');
const Product = require('../models/productModels');
const productController = require('../controllers/productController');

const router = express.Router();

router.get('/', productController.getAllProducts);

router.get('/:id', productController.getProduct);

router.post('/', productController.createProduct);

router.delete('/:id', productController.deleteProduct);

router.patch('/:id', productController.updateProduct);

module.exports = router;
