const mongoose = require('mongoose');

const { Schema } = mongoose;

const productsSchema = new Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxLength: [40, 'A product max length is 40 characters'],
    minLength: [10, 'A product min length is 10 characters'],
  },
  images: [
    {
      type: String,
    },
  ],
  category: {
    type: String,
    enum: ['laptop', 'desktop', 'monitor'],
  },
  avgRatings: Number,
  brand: {
    type: String,
    required: [true, 'Brand name is required'],
  },
  unitPrice: Number,
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
    maxLength: [100, 'A product max length is 100 characters'],
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
