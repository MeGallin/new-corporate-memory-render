import express from 'express';
import {
  memories,
  createMemory,
  editMemory,
  deleteMemory,
  deleteMemoryTag,
  deleteMemoryImage,
} from '../controllers/MemoriesController.js';
import { protect } from '../middleWare/authMiddleWare.js';
const router = express.Router();

// POST /api/memories
// GET /api/memories
router.route('/memories').get(protect, memories).post(protect, createMemory);

// PUT /api/memories/:id
// DELETE /api/memories/:id
router
  .route('/memories/:id')
  .put(protect, editMemory)
  .delete(protect, deleteMemory);

// DELETE /api/memories/:id/tag
router.route('/memories/:id/tag').delete(protect, deleteMemoryTag);

// DELETE /api/memories/:id/image
router.route('/memories/:id/image').delete(protect, deleteMemoryImage);

export default router;
