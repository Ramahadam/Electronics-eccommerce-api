// const express = require('express');

// const router = express.Router();

// const authController = require('../controllers/authController');
// const userController = require('../controllers/userController');

// // Singup route
// // router.route('/signup').post(authController.signup);

// // Login route
// // router.route('/login').post(authController.login);

// // Forgot password
// router.route('/forgotpassword').post(authController.forgotPassword);

// // Reset password
// router.route('/resetpassword/:token').post(authController.resetPassword);

// // Update password
// router
//   .route('/updatePassword')
//   .post(authController.protect, authController.updatePassword);

// // Route to let the user update the details

// router.route('/updateMe').post(authController.protect, userController.updateMe);

// // Get all users / Create user
// router.route('/').get(userController.getUsers).post(userController.createUser);

// router
//   .route('/:id')
//   .get(userController.getUser)
//   .patch(userController.updateUser)
//   .delete(userController.deleteUser);

//TODO CREATE SYNC ROUTE /api/v1/auth/sync

// module.exports = router;
