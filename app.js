const express = require("express");
const multer = require("multer");
const supabase = require("./supabaseClient");
const bcrypt = require("bcrypt");
const { ref, uploadBytes, getDownloadURL } = require("firebase/storage");
const { storage } = require("./firebaseConfig");
const admin = require('./firebaseAdmin');
const cors = require('cors');
const mammoth = require("mammoth");
const { parseDocument } = require("htmlparser2");
const { DomUtils } = require("htmlparser2");


const app = express();
app.use(express.json());
// const corsOptions = {
//   origin: ['http://localhost:3000', 'https://www.mehmetaker.com'], // allow localhost for development
//   optionsSuccessStatus: 200
// };
app.use(cors());

// ETag disabled
app.disable('etag');

const multerStorage = multer.memoryStorage();
const upload = multer({ 
  storage: multerStorage, 
  limits: { fileSize: 100 * 1024 * 1024 } // Limit to 100MB 
});
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.get("/api/blogposts", async (req, res) => {
    const { data, error } = await supabase.from("BlogPosts").select("*");

    if (error) {
        res.status(500).json({
            success: false,
            message: "Blog verileri alınırken hata oluştu",
            error: error.message,
        });
        return;
    }
    
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ success: true, content: data });
});

app.post("/api/login", async (req, res) => {
    const { email, password } = req.body;

    const { data, error } = await supabase
        .from("adminusers")
        .select("password")
        .eq("email", email);

    if (error || data.length === 0) {
        res.status(404).json({
            success: false,
            message: "Kullanıcı bulunamadı",
            error: error ? error.message : null,
        });
        return;
    }

    const hashedPassword = data[0].password;

    const isMatch = await bcrypt.compare(password, hashedPassword);

    if (!isMatch) {
        res.status(401).json({ success: false, message: "Şifre yanlış" });
        return;
    }

    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ success: true, message: "Başarıyla giriş yapıldı" });
});

app.post("/api/blog", upload.fields([{ name: 'coverImage' }/*, { name: 'video' }*/]), async (req, res) => {
    const { title, author, content } = req.body;
    const coverImage = req.files['coverImage'] ? req.files['coverImage'][0] : null;
    //const videoFile = req.files['video'] ? req.files['video'][0] : null;

    let coverImageUrl = null;
    //let videoUrl = null;

    if (coverImage) {
        try {
            const storageRef = ref(storage, `coverImages/${coverImage.originalname}`);
            const snapshot = await uploadBytes(storageRef, coverImage.buffer);
            coverImageUrl = await getDownloadURL(snapshot.ref);
        } catch (error) {
            return res.status(500).json({ success: false, message: "Kapak fotoğrafı yüklenemedi", error: error.message });
        }
    }

    //if (videoFile) {
    //    try {
    //        const storageRef = ref(storage, `videos/${videoFile.originalname}`);
    //        const snapshot = await uploadBytes(storageRef, videoFile.buffer);
    //        videoUrl = await getDownloadURL(snapshot.ref);
    //    } catch (error) {
    //        return res.status(500).json({ success: false, message: "Video yüklenemedi", error: error.message });
    //    }
    //}

    try {
        const { data, error } = await supabase.from("BlogPosts").insert([
            {
                title,
                created_by: author,
                content,
                cover_image_url: coverImageUrl,
                //video_url: videoUrl
            },
        ]);

        if (error) {
            return res.status(500).json({ success: false, message: "Blog kaydedilemedi", error: error.message });
        }
        res.setHeader('Cache-Control', 'no-store');
        res.status(200).json({ success: true, message: "Blog başarıyla kaydedildi", data });
    } catch (err) {
        res.status(500).json({ success: false, message: "Blog kaydedilirken hata oluştu", error: err.message });
    }
});


// New route for uploading content images
app.post("/api/upload-image", upload.single("image"), async (req, res) => {
    const image = req.file;

    if (!image) {
        return res.status(400).json({
            success: false,
            message: "No image file provided",
        });
    }

    try {
        const storageRef = ref(storage, `contentImages/${image.originalname}`);
        const snapshot = await uploadBytes(storageRef, image.buffer);
        const imageUrl = await getDownloadURL(snapshot.ref); // Get the URL for the uploaded image

        return res.json({ success: true, url: imageUrl });
    } catch (error) {
        console.error("Firebase Storage Upload Error: ", error);
        return res.status(500).json({
            success: false,
            message: "Image upload failed",
            error: error.message,
        });
    }
});


// New route to handle Word document uploads and processing
app.post("/api/wordBlog", upload.single('wordFile'), async (req, res) => {
    const wordFile = req.file;

    if (!wordFile) {
        return res.status(400).json({
            success: false,
            message: "No Word document provided",
        });
    }

    try {
        // Convert the Word document to HTML using mammoth
        const { value: htmlContent } = await mammoth.convertToHtml({ buffer: wordFile.buffer });

        // Parse HTML content to handle images
        const dom = parseDocument(htmlContent);
        const images = DomUtils.findAll(elem => elem.name === 'img', dom.children);

        // Upload images to Firebase and replace src with Firebase URLs
        for (let img of images) {
            const imageBuffer = Buffer.from(img.attribs.src.replace(/^data:image\/\w+;base64,/, ""), 'base64');
            const imageName = `contentImages/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.png`;
            const storageRef = ref(storage, imageName);

            const snapshot = await uploadBytes(storageRef, imageBuffer);
            const imageUrl = await getDownloadURL(snapshot.ref);

            img.attribs.src = imageUrl; // Replace src with the Firebase URL
        }

        // Get updated HTML with images replaced by Firebase URLs
        const updatedHtmlContent = DomUtils.getOuterHTML(dom);

        // Extract the title (first h1 tag) and the rest of the content
        const titleElem = DomUtils.findOne(elem => elem.name === 'h1', dom.children);
        const title = titleElem ? DomUtils.getText(titleElem) : "Untitled Blog";

        // Store the modified content and title in the database
        const { data, error } = await supabase.from("BlogPosts").insert([
            {
                title,
                content: updatedHtmlContent,
                created_by: "Mehmet Aker",
            },
        ]);

        if (error) {
            return res.status(500).json({ success: false, message: "Blog could not be saved", error: error.message });
        }
        res.setHeader('Cache-Control', 'no-store');
        res.status(200).json({ success: true, message: "Blog successfully created from Word document", data });
    } catch (err) {
        res.status(500).json({ success: false, message: "Error processing Word document", error: err.message });
    }
});

module.exports = app;