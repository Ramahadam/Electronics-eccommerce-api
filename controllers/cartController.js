// controllers/cartController.js
const Cart = require('../models/cartModels');
const Product = require('../models/productModels');
const User = require('../models/userModels');
// const Product = require('../models/productModels');

// GET /api/cart
exports.getCart = async (req, res) => {
  try {
    // TODO change the req.user later once you integrate to firebase auth Cart.findOne({ user: req.user.id })

    const cart = await Cart.findOne({ user: req.userId }).populate(
      'items.product'
    );
    if (!cart) return res.status(200).json({ items: [], totalPrice: 0 });
    res.status(200).json({
      status: 'succes',
      data: {
        items: cart.items,
        totalPrice: cart.totalPrice,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get cart' });
  }
};

// POST /api/cart
exports.addToCart = async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;

    let cart = await Cart.findOne({ user: req.userId });

    const product = await Product.findById(productId).select('unitPrice');

    if (!product) {
      res.status(401).json({
        status: 'Failed',
        err: 'No product found',
      });
    }

    if (!cart) {
      cart = await Cart.create({
        user: req.userId,
        items: [
          {
            product: productId,
            quantity,
            unitPrice: Number(product.unitPrice),
          },
        ],
      });
    } else {
      const itemIndex = cart.items.findIndex(
        (item) => item.product.toString() === productId
      );

      if (itemIndex > -1) {
        cart.items[itemIndex].quantity += quantity;
      } else {
        cart.items.push({
          product: productId,
          quantity,
          unitPrice: Number(product.unitPrice),
        });
      }
    }

    cart.totalPrice = await cart.calculateTotalPrice(cart.items);
    const newCart = await cart.save();

    res.status(200).json({
      status: 'succes',
      data: {
        cart: newCart,
      },
    });
  } catch (err) {
    // console.log(err);
    res.status(500).json({
      status: 'error',
      err,
    });
  }
};

// PATCH /api/cart/:itemId
exports.updateCartItem = async (req, res) => {
  try {
    const { quantity } = req.body;
    const { itemId } = req.params;

    // TODO change the req.user later once you integrate to firebase auth Cart.findOne({ user: req.user.id })
    // const tempUserid = '6849d16de314ed642e9feff8';
    // const firebaseUid = req.firebaseUid;

    const cart = await Cart.findOne({ user: req.userId });
    if (!cart) return res.status(404).json({ error: 'Cart not found' });

    const itemIndex = cart.items.findIndex(
      (el) => el.product.toString() === itemId
    );

    if (itemIndex < 0) return res.status(404).json({ error: 'Item not found' });

    cart.items[itemIndex].quantity = quantity;
    cart.totalPrice = await cart.calculateTotalPrice(cart.items);

    await cart.save();

    res.status(200).json({
      status: 'success',
      data: {
        cart,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update cart item' });
  }
};

// DELETE /api/cart/:itemId
exports.removeCartItem = async (req, res) => {
  try {
    // TODO change the req.user later once you integrate to firebase auth Cart.findOne({ user: req.user.id })
    // const tempUserid = '6849d16de314ed642e9feff8';
    // const firebaseUid = req.firebaseUid;

    const { itemId } = req.params;
    const cart = await Cart.findOne({ user: req.userId });
    if (!cart) return res.status(404).json({ error: 'Cart not found' });

    cart.items = cart.items.filter(
      (item) => item.product.toString() !== itemId
    );
    // save the cart with new items
    cart.totalPrice = await cart.calculateTotalPrice(cart.items);
    await cart.save();

    res.status(204).json({
      status: 'succes',
      data: null,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove cart item' });
  }
};
