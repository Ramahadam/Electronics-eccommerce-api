const User = require('../models/userModels');

exports.getUsers = async (req, res, next) => {
  const users = await User.find();

  try {
    res.status(200).json({
      status: 'success',
      data: {
        users,
      },
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      err,
    });
  }
};

exports.getUser = (req, res, next) => {
  const user = {};
  try {
    res.status(200).json({
      status: 'success',
      data: {
        user,
      },
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      err,
    });
  }
};

exports.createUser = (req, res, next) => {
  const user = {};
  try {
    res.status(201).json({
      status: 'success',
      data: {
        user,
      },
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      err,
    });
  }
};

exports.updateUser = (req, res, next) => {
  const user = {};
  try {
    res.status(200).json({
      status: 'success',
      data: {
        user,
      },
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      err,
    });
  }
};

exports.deleteUser = (req, res, next) => {
  const user = {};
  try {
    res.status(200).json({
      status: 'success',
      data: null,
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      err,
    });
  }
};
