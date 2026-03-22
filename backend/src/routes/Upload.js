import express from 'express';
import multer from 'multer';
import { storage } from '../config/cloudinary.js';
import authMiddleware from '../middlewares/AuthMid.js';

const router = express.Router();
const upload = multer({ storage });

router.post('/', authMiddleware, upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    
    res.status(200).json({
      success: true,
      data: {
        url: req.file.path,
        public_id: req.file.filename
      }
    });
  } catch (error) {
    console.error('Upload Error:', error);
    res.status(500).json({
      success: false,
      message: 'Upload failed',
      error: error.message
    });
  }
});

export default router;
