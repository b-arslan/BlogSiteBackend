import express from "express";
import {
    handleVisitorView,
    getAllViews,
} from "../controllers/visitor.controller";

const router = express.Router();

router.post("/view", handleVisitorView);
router.get("/getViews", getAllViews);

export default router;
