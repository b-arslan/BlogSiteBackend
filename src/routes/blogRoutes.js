const express = require('express');
const router = express.Router();
const { getBlogPosts, addBlogPost, addWordBlog, incrementViewCount, deleteBlogPost } = require('../controllers/blogController');
const upload = require('../middlewares/uploadMiddleware');

router.get('/blogposts', getBlogPosts);
router.post('/blog', upload.fields([{ name: 'coverImage' }]), addBlogPost);
router.post('/wordBlog', upload.fields([{ name: 'coverImage' }, { name: 'wordFile' }]), addWordBlog);
router.post('/blogposts/:id/view', incrementViewCount);
router.delete('/deleteBlog/:id', deleteBlogPost);

module.exports = router;