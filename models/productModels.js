const mongoose = require('mongoose');

const { Schema } = mongoose;

const productsSchema = new Schema({
  name: {
    type: String,
    require: [true, 'Product name is required'],
    trim: true,
    maxLength: [40, 'A product max length is 40 characters'],
    minLength: [10, 'A product min length is 10 characters'],
  },
  category: {
    type: String,
    enum: ['laptop', 'desktop', 'monitor'],
  },
  avgRatings: Number,
  brand: {
    type: String,
    require: [true, 'Brand name is required'],
  },
  price: Number,
  discount: {
    type: Number,
    validator: {
      validate: function (val) {
        return val < this.price;
      },
      message: `The discount price {VALUE} must be less than the price`,
    },
  },
  stock: Number,
  description: {
    type: String,
    trim: true,
    maxLength: [40, 'A product max length is 40 characters'],
    minLength: [10, 'A product min length is 10 characters'],
  },
  specs: {
    cpu: String,
    ram: String,
    storage: String,
    screen: String,
  },
});

const Product = mongoose.model('Product', productsSchema);

module.exports = Product;
