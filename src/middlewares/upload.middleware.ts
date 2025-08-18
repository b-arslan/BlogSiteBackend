import multer from "multer";

const multerStorage = multer.memoryStorage();

const upload = multer({
    storage: multerStorage,
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
});

export default upload;
