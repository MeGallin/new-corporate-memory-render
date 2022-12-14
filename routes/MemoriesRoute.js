const express = require('express');
const router = express.Router();
const {
  memories,
  createMemory,
  editMemory,
  deleteMemory,
  deleteMemoryTag,
  deleteMemoryImage,
} = require('../controllers/MemoriesController');
const { protect } = require('../middleWare/authMiddleWare');

router.route('/memories').get(protect, memories);
router.route('/create-memory').post(protect, createMemory);
router.route('/edit-memory/:id').put(protect, editMemory);
router.route('/delete-memory/:id').delete(protect, deleteMemory);
router.route('/delete-memory-tag/:id').delete(protect, deleteMemoryTag);
router.route('/delete-memory-image/:id').delete(protect, deleteMemoryImage);

module.exports = router;
