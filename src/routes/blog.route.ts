import express, { Request, Response } from "express";
import {
    getBlogPosts,
    addBlogPost,
    addWordBlog,
    incrementViewCount,
    deleteBlogPost,
} from "../controllers/blog.controller";
import upload from "../middlewares/upload.middleware";

const router = express.Router();

router.get("/blogposts", getBlogPosts);

router.post("/blog", upload.fields([{ name: "coverImage" }]), addBlogPost);

router.post(
    "/wordBlog",
    upload.fields([{ name: "coverImage" }, { name: "wordFile" }]),
    addWordBlog
);

router.post("/blogposts/:id/view", incrementViewCount);
router.delete("/deleteBlog/:id", deleteBlogPost);

router.get("/ping", (req: Request, res: Response) => {
    res.status(200).json({ message: "supabase alive" });
});

export default router;
