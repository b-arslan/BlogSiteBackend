const express = require("express");
const multer = require("multer");
const supabase = require("./supabaseClient");
const bcrypt = require("bcrypt");
const { ref, uploadBytes, getDownloadURL } = require("firebase/storage");
const { storage } = require("./firebaseConfig");
const admin = require('./firebaseAdmin');
const cors = require('cors');
const nodemailer = require('nodemailer');
const mailgun = require("mailgun-js");


const app = express();
app.use(express.json());

const corsOptions = {
  origin: ['http://localhost:3000', 'https://www.mehmetaker.com'], // allow localhost for development
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

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

    res.json({ success: true, content: data });
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

    res.json({ success: true, message: "Başarıyla giriş yapıldı" });
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

        res.json({ success: true, message: "Blog başarıyla kaydedildi", data });
    } catch (err) {
        res.status(500).json({ success: false, message: "Blog kaydedilirken hata oluştu", error: err.message });
    }
});


app.post("/api/create-admin", async (req, res) => {
    const { uid } = req.body;

    try {
        await admin.auth().setCustomUserClaims(uid, { admin: true });
        const customToken = await admin.auth().createCustomToken(uid);
        res.json({ success: true, token: customToken });
    } catch (error) {
        res.status(500).json({ success: false, message: "Admin kullanıcı oluşturulurken hata oluştu", error: error.message });
    }
});

const PORT = process.env.PORT || 9001;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
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

// Contact form API route
app.post("/api/contact", async (req, res) => {
    const { name, email, message } = req.body;

    const mg = mailgun({
        apiKey: process.env.MAILGUN_API_KEY,
        domain: process.env.MAILGUN_DOMAIN, 
    });

    const mailOptions = {
        from: `"${name}" <${email}>`,
        to: process.env.EMAIL,
        subject: "New Contact Form Submission",
        text: `Name: ${name}\n\nEmail: ${email}\n\nMessage:\n${message}`,
    };

    try {
        await mg.messages().send(mailOptions);
        res.status(200).json({ success: true, message: "Message sent successfully!" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to send message", error: error.message });
    }
});
