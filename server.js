const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: `${__dirname}/config.env` });
const app = require('./app');

const port = process.env.PORT || 3000;

const DB = process.env.DB.replaceAll('<PASSWORD>', process.env.PASSWORD);

mongoose
  .connect(DB)
  .then((con) => {
    console.log('Connection established ✅');
  })
  .catch((err) => {
    console.log('Database connection failed', err.message);
    process.exit(1);
  });

app.listen(port, () => {
  console.log(`App is running on port number ${port}`);
});
