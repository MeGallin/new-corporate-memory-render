const express = require('express');
const {
  confirmEmailLink,
} = require('../controllers/ConfirmationLinkController');

const router = express.Router();

router.route('/confirm-email/:token').get(confirmEmailLink);

module.exports = router;
