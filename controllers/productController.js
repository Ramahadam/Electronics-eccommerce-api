const Product = require('../models/productModels');
const { uploadImage } = require('../utils/uploadimages');
const { filterQuery } = require('../utils/filterQuery');
const { isValidImageURL } = require('../utils/helper');

exports.getAllProducts = async (req, res) => {
  try {
    // Refactor the query filter and sort to it's own function
    let { filter, sort } = filterQuery(req.query);

    const products = await Product.find(filter).sort(sort);

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
      message: err.message,
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
    res.status(404).json({
      status: 'failed',
      data: {
        error: err.message,
      },
    });
  }
};

exports.createProduct = async (req, res) => {
  try {
    const { images } = req.body;

    if (!Array.isArray(images) || !images.length) {
      return res.status(400).json({
        status: 'error',
        error: 'Images must not be empty array ',
      });
    }

    const invalidImages = images.filter((url) => !isValidImageURL(url));

    if (invalidImages.length > 0) {
      return res.status(400).json({
        status: 'error',
        error: 'Image URL must be valid URL ',
        invalidImages,
      });
    }

    const newProduct = await Product.create({
      ...req.body,
      images,
    });

    res.status(201).json({
      status: 'success',
      data: {
        product: newProduct,
      },
    });
  } catch (err) {
    return res.status(400).json({
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
    // TODO: You can use the below to upload photose to cloudinary then you have to insert the URL to db
    // const imagePath =
    //   'https://cloudinary-devs.github.io/cld-docs-assets/assets/images/happy_people.jpg';

    // // Upload the image
    // const publicId = await uploadImage(imagePath);
    // console.log(publicId);

    // Just uploading below images to cloudinary for all products later on will get images from client
    // As of now whenever we post new product same images will be uploaded and URLS will be store in DB
    // const images = [
    //   './public/dell-laptop.webp',
    //   './public/dell-laptop2.webp',
    //   './public/dell-laptop4.webp',
    // ];

    // const uploadedImages = await uploadImage(images);
    // console.log(uploadedImages);

    // const newProduct = await Product.insertOne({
    //   ...req.body,
    //   images: uploadedImages,
    // });

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
