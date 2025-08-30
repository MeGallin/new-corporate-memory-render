import express from 'express';
import { pageHits } from '../controllers/PageHitsController.js';
const router = express.Router();

router.route('/page-hits').get(pageHits);

export default router;
