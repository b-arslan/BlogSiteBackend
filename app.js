const express = require("express");
const multer = require("multer");
const supabase = require("./supabaseClient");
const bcrypt = require("bcrypt");
const { ref, uploadBytes, getDownloadURL } = require("firebase/storage");
const { storage } = require("./firebaseConfig");
const admin = require('./firebaseAdmin');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
app.use(express.json());

// const corsOptions = {
    
// }
app.use(cors());

// Kapak fotoğrafları ve diğer dosyalar için multer'ı ayarla
const multerStorage = multer.memoryStorage(); // Multer için farklı bir isim kullan
const upload = multer({ 
  storage: multerStorage, 
  limits: { fileSize: 100 * 1024 * 1024 } // Limit to 100MB 
});
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 1. API: BlogPosts Table'dan Verileri Al
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

// 2. API: Login - adminusers Table'dan Verileri Kontrol Et
app.post("/api/login", async (req, res) => {
    const { email, password } = req.body;

    // Kullanıcının emailine göre hash'lenmiş şifreyi al
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

    // Kullanıcıdan gelen şifreyi hash ile karşılaştır
    const isMatch = await bcrypt.compare(password, hashedPassword);

    if (!isMatch) {
        res.status(401).json({ success: false, message: "Şifre yanlış" });
        return;
    }

    res.json({ success: true, message: "Başarıyla giriş yapıldı" });
});

// 3. API: Blogları DB'ye Kaydet ve Kapak Fotoğrafını Firebase Storage'a Yükle
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

    // Nodemailer configuration
    const transporter = nodemailer.createTransport({
        host: "smtpout.secureserver.net", // GoDaddy SMTP server
        port: 465,
        secure: true,
        auth: {
            user: process.env.EMAIL, // Your corporate email
            pass: process.env.EMAIL_PASSWORD, // Your email password
        },
    });

    // Email options
    const mailOptions = {
        from: `"${name}" <${email}>`, // Sender's email
        to: process.env.EMAIL, // Your corporate email
        subject: "Web Sitesinden Yeni Email",
        text: `Name: ${name}\n\nEmail: ${email}\n\n\nMessage:\n${message}`,
    };

    try {
        // Send the email
        await transporter.sendMail(mailOptions);
        res.status(200).json({ success: true, message: "Message sent successfully!" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to send message", error: error.message });
    }
});