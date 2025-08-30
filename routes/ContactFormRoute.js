import express from 'express';
import { sendContactForm } from '../controllers/ContactFormController.js';

const router = express.Router();
router.route('/contact-form').post(sendContactForm);
export default router;
