const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: `${__dirname}/config.env` });
const app = require('./app');

const port = process.env.PORT || 3000;

const DB = process.env.DB.replaceAll('<PASSWORD>', process.env.PASSWORD);

mongoose.connect(DB).then((con) => {
  console.log('Connection established ✅');
  console.log('Connected to database:', mongoose.connection.name); // ADD THIS LINE
  console.log('Host:', mongoose.connection.host); // ADD THIS LINE
});

app.listen(port, () => {
  console.log(`App is running on port number ${port}`);
});
