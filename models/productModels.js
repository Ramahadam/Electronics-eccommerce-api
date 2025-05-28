const mongoose = require('mongoose');

const { Schema } = mongoose;

const productsSchema = new Schema({
  name: {
    type: String,
    require: [true, 'Product name is required'],
  },
  category: {
    type: String,
    enum: ['laptop', 'desktop', 'monitor'],
  },
  brand: {
    type: String,
    require: [true, 'Brand name is required'],
  },
  price: Number,
  stock: Number,
  description: String,
  specs: {
    cpu: String,
    ram: String,
    storage: String,
    screen: String,
  },
});

const Product = mongoose.model('Product', productsSchema);

module.exports = Product;
