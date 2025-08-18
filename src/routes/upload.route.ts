import express from 'express';
import upload from '../middlewares/upload.middleware';
import { uploadImage } from '../controllers/upload.controller';

const router = express.Router();

router.post('/upload-image', upload.single('image'), uploadImage);

export default router;