const Product = require('../models/productModels');
const { uploadImage } = require('../utils/uploadImages');

exports.getAllProducts = async (req, res) => {
  try {
    console.log(req.query);
    let query = Product.find(req.query);

    const products = await query;

    res.status(200).json({
      status: 'success',
      length: products.length,
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
};

exports.getProduct = async (req, res) => {
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
};

exports.createProduct = async (req, res) => {
  try {
    // TODO: You can use the below to upload photose to cloudinary then you have to insert the URL to db
    // const imagePath =
    //   'https://cloudinary-devs.github.io/cld-docs-assets/assets/images/happy_people.jpg';

    // // Upload the image
    // const publicId = await uploadImage(imagePath);
    // console.log(publicId);

    console.log(req.body);

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
};

exports.deleteProduct = async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);

    res.status(204).json({
      status: 'success',
      data: null,
    });
  } catch (err) {
    console.log(err);
  }
};

exports.updateProduct = async (req, res) => {
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
};
