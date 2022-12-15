const express = require('express');
const { sendContactForm } = require('../controllers/ContactFormController');

const router = express.Router();
router.route('/contact-form').post(sendContactForm);
module.exports = router;
