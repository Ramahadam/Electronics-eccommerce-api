const nodemailer = require('nodemailer');

const sendEmil = async (options) => {
  // 01) Create a transporter for SMTP
  const transporter = nodemailer.createTransport({
    host: 'sandbox.smtp.mailtrap.io',
    port: 2525,
    secure: false, // upgrade later with STARTTLS
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  // 02) Send email
  const mailOptions = {
    from: '"ecommerece-electronics" <electronics@test.io>',
    to: options.email,
    subject: options.subject,
    text: 'plain text body',
    html: `<p>${options.message}</p>`,
  };

  // 03) Send the actual email with nodemailr
  await transporter.sendMail(mailOptions);
};

module.exports = sendEmil;
