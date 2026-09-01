import nodemailer from 'nodemailer';

export const createMailerTransport = () =>
  nodemailer.createTransport({
    host: process.env.MAILER_HOST,
    port: 587,
    secure: false,
    requireTLS: true,
    auth: {
      user: process.env.MAILER_USER,
      pass: process.env.MAILER_PW,
    },
    tls: {
      minVersion: 'TLSv1.2',
    },
  });

export const buildMailOptions = (options) => ({
  from: process.env.MAILER_FROM,
  to: options.to,
  bcc: process.env.MAILER_BCC,
  subject: options.subject,
  html: options.html,
  disableFileAccess: true,
  disableUrlAccess: true,
});

const sendEmail = async (options) => {
  const transporter = createMailerTransport();
  const mailOptions = buildMailOptions(options);

  return transporter.sendMail(mailOptions);
};

export default sendEmail;
