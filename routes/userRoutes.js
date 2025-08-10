const express = require('express');

const router = express.Router();

const authController = require('../controllers/authController');
const userController = require('../controllers/userController');

// Singup route
router.route('/signup').post(authController.signup);

// Login route
router.route('/login').post(authController.login);

// Forgot password
router.route('/forgotpassword').post(authController.forgotPassword);

// Reset password
router.route('/resetpassword/:token').post(authController.resetPassword);

// Get all users / Create user
router.route('/').get(userController.getUsers).post(userController.createUser);

router
  .route('/:id')
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;
