const express = require('express');
const router = express.Router();
const upload = require('../middlewares/uploadMiddleware');
const { uploadImage } = require('../controllers/uploadController');

router.post('/upload-image', upload.single("image"), uploadImage);

module.exports = router;