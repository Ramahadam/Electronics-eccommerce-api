const User = require('../models/userModels');

exports.signup = async (req, res, next) => {
  const newUser = await User.create(req.body);

  res.status(201).json({
    status: 'success',
    data: 'new user',
  });
};

exports.login = (req, res, next) => {
  res.status(200).json({
    status: 'success',
    data: null,
  });
};
