import express from 'express';
import { confirmEmailLink } from '../controllers/ConfirmationLinkController.js';

const router = express.Router();

router.route('/confirm-email/:token').get(confirmEmailLink);

export default router;
