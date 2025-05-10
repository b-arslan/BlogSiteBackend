const express = require("express");
const router = express.Router();
const {
    getBlogPosts,
    addBlogPost,
    addWordBlog,
    incrementViewCount,
    deleteBlogPost,
} = require("../controllers/blogController");
const upload = require("../middlewares/uploadMiddleware");

router.get("/blogposts", getBlogPosts);
router.post("/blog", upload.fields([{ name: "coverImage" }]), addBlogPost);
router.post(
    "/wordBlog",
    upload.fields([{ name: "coverImage" }, { name: "wordFile" }]),
    addWordBlog
);
router.post("/blogposts/:id/view", incrementViewCount);
router.delete("/deleteBlog/:id", deleteBlogPost);

router.get("/ping", (req, res) => {
    res.status(200).json({ message: "supabase alive" });
});

module.exports = router;