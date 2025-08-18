import express, { Application } from "express";
import cors from "cors";
import blogRoutes from "./routes/blog.route";
import authRoutes from "./routes/auth.route";
import uploadRoutes from "./routes/upload.route";
import visitorRoutes from "./routes/visitor.route";

const app: Application = express();

// Middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// CORS
const corsOptions = {
    origin: "*",
    optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Disable ETag
app.disable("etag");

// Routes
app.use("/api", blogRoutes);
app.use("/api", authRoutes);
app.use("/api", uploadRoutes);
app.use("/api", visitorRoutes);

export default app;
