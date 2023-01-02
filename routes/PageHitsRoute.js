const express = require('express');
const router = express.Router();
const { pageHits } = require('../controllers/PageHitsController');

router.route('/').get(pageHits);

module.exports = router;
