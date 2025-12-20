const express = require('express');

const router = express.Router();

const authController = require('../controllers/authController');
// const userController = require('../controllers/userController');

// POST / api / auth / sync;
// POST / api / auth / logout(optional);
// POST / api / auth / revoke(admin);
// GET / api / auth / me(optional);

// router.route('/sync').post(authController.syncUser);

//TODO CREATE SYNC ROUTE /api/v1/auth/sync

router.use(authController.protect);

router.route('/sync').post(authController.syncUser);

module.exports = router;
