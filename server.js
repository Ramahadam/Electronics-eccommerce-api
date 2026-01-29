const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: `${__dirname}/config.env` });
const app = require('./app');
const connectDB = require('./config/db');

const port = process.env.PORT || 3000;

connectDB();

app.listen(port, () => {
  console.log(`App is running on port number ${port}`);
});
