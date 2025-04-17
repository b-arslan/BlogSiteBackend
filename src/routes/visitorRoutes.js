const express = require('express');
const router = express.Router();
const { handleVisitorView, getAllViews } = require('../controllers/visitorController');

router.post('/view', handleVisitorView);
router.get('/getViews', getAllViews);

module.exports = router;