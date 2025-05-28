const mongoose = require('mongoose');
const dotenv = require('dotenv');

const app = require('./index');

dotenv.config({ path: `${__dirname}/config.env` });
console.log(process.env);
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
