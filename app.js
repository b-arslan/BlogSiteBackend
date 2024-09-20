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
app.post("/api/wordBlog", upload.fields([{ name: 'coverImage' }, { name: 'wordFile' }]), async (req, res) => {
    const wordFile = req.files['wordFile'] ? req.files['wordFile'][0] : null;
    const coverImage = req.files['coverImage'] ? req.files['coverImage'][0] : null;

    if (!wordFile) {
        return res.status(400).json({
            success: false,
            message: "Word belgesi sağlanmadı",
        });
    }

    let coverImageUrl = null;

    // Kapak fotoğrafı Firebase'e yükle
    if (coverImage) {
        try {
            const coverImageName = `coverImages/${Date.now()}_${coverImage.originalname}`;
            const coverImageRef = ref(storage, coverImageName);
            const snapshot = await uploadBytes(coverImageRef, coverImage.buffer);
            coverImageUrl = await getDownloadURL(snapshot.ref);
        } catch (error) {
            return res.status(500).json({ success: false, message: "Kapak fotoğrafı yüklenemedi", error: error.message });
        }
    }

    try {
        // Mammoth ile Word dosyasını HTML formatına çevir
        const { value: htmlContent } = await mammoth.convertToHtml({ buffer: wordFile.buffer });

        // HTML'yi parse edip görselleri bul
        const dom = parseDocument(htmlContent);
        const images = DomUtils.findAll(elem => elem.name === 'img', dom.children);

        // Görselleri Firebase'e yükleyip, kaynaklarını Firebase URL'leri ile değiştir
        for (let img of images) {
            const imageBuffer = Buffer.from(img.attribs.src.replace(/^data:image\/\w+;base64,/, ""), 'base64');
            const imageName = `contentImages/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.png`;
            const storageRef = ref(storage, imageName);

            const snapshot = await uploadBytes(storageRef, imageBuffer);
            const imageUrl = await getDownloadURL(snapshot.ref);

            img.attribs.src = imageUrl; // Firebase URL ile değiştir
        }

        // Güncellenmiş HTML içeriğini al
        const updatedHtmlContent = DomUtils.getOuterHTML(dom);

        // İlk h1 etiketini başlık olarak al
        const titleElem = DomUtils.findOne(elem => elem.name === 'h1', dom.children);
        const title = titleElem ? DomUtils.getText(titleElem) : "Başlıksız Blog";

        // Supabase'e kaydet
        const { data, error } = await supabase.from("BlogPosts").insert([
            {
                title,
                content: updatedHtmlContent,
                created_by: "Mehmet Aker",
                cover_image_url: coverImageUrl, // Kapak fotoğrafı URL'sini ekle
            },
        ]);

        if (error) {
            return res.status(500).json({ success: false, message: "Blog kaydedilemedi", error: error.message });
        }

        res.status(200).json({ success: true, message: "Word belgesinden blog başarıyla oluşturuldu", data });
    } catch (err) {
        res.status(500).json({ success: false, message: "Word belgesi işlenirken hata oluştu", error: err.message });
    }
});

module.exports = app;