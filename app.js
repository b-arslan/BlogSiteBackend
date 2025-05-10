const express = require("express");
const cors = require("cors");
const app = express();
const blogRoutes = require("./src/routes/blogRoutes");
const authRoutes = require("./src/routes/authRoutes");
const uploadRoutes = require("./src/routes/uploadRoutes");
const visitorRoutes = require("./src/routes/visitorRoutes");

// Middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// CORS
const corsOptions = {
    origin: "*",
    optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// ETag
app.disable("etag");

// Routes
app.use("/api", blogRoutes);
app.use("/api", authRoutes);
app.use("/api", uploadRoutes);
app.use("/api", visitorRoutes);

module.exports = app;