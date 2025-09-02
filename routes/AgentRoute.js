import express from 'express';
import { protect } from '../middleWare/authMiddleWare.js';
import { agentMemoriesChat } from '../controllers/AgentController.js';

const router = express.Router();

router.post('/agent/memories/chat', protect, agentMemoriesChat);

export default router;

