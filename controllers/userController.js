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

// Handler for user to update the details

exports.updateMe = async (req, res, next) => {
  // If the user is posting password throw an error

  if (req.body.password || req.body.passwordConfirm) {
    res.status(400).json({
      status: 'failed',
      message:
        'Please use the /passwordReset endpoint for reseting the password',
    });
  }

  // Filter the request body and allow to update only specifi fields

  const filteredBody = {};
  const allowedValues = ['name'];

  // ["name", "email", "role"]
  Object.keys(req.body).forEach((el) => {
    if (allowedValues.includes(el)) {
      filteredBody[el] = req.body[el];
    }
  });
  console.log(filteredBody);

  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });
  console.log(updatedUser);
  res.status(201).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });

  next();
};
