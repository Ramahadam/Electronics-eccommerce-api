const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: `${__dirname}/config.env` });
const app = require('./app');

const port = process.env.PORT || 3001;

const DB = process.env.DB.replaceAll('<PASSWORD>', process.env.PASSWORD);
// console.log(DB);

mongoose
  .connect(DB, {
    useNewUrlParser: true,
  })
  .then((con) => {
    console.log('Connection established ✅');
  });

app.listen(port, () => {
  console.log(`App is running on port number ${port}`);
});
