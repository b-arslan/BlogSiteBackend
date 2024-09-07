const express = require("express");
const multer = require("multer");
const supabase = require("./supabaseClient");
const bcrypt = require("bcrypt");
const { ref, uploadBytes, getDownloadURL } = require("firebase/storage");
const { storage } = require("./firebaseConfig");
const admin = require('./firebaseAdmin');

const app = express();
app.use(express.json());

// Kapak fotoğrafları ve diğer dosyalar için multer'ı ayarla
const multerStorage = multer.memoryStorage(); // Multer için farklı bir isim kullan
const upload = multer({ storage: multerStorage });

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
app.post("/api/blog", upload.single("coverImage"), async (req, res) => {
    const { title, author, content } = req.body;
    const coverImage = req.file;

    let coverImageUrl = null;
    if (coverImage) {
        try {
            const storageRef = ref(
                storage,
                `coverImages/${coverImage.originalname}`
            );
            const snapshot = await uploadBytes(storageRef, coverImage.buffer);
            coverImageUrl = await getDownloadURL(snapshot.ref); // Dosya URL'sini al
            console.log("Image uploaded successfully: ", coverImageUrl);
        } catch (error) {
            console.error("Firebase Storage Upload Error: ", error);
            res.status(500).json({
                success: false,
                message: "Kapak fotoğrafı yüklenirken hata oluştu",
                error: error.message,
            });
            return;
        }
    }

    // Blog içeriğini ve kapak fotoğrafının URL'sini veritabanına kaydet
    try {
        const { data, error } = await supabase.from("BlogPosts").insert([
            {
                title,
                created_by: author,
                content: JSON.parse(content), // JSON formatında saklanan content
                cover_image_url: coverImageUrl, // Cover image URL Firebase Storage URL ile
            },
        ]);

        if (error) {
            console.error("Supabase DB Insert Error: ", error);
            res.status(500).json({
                success: false,
                message: "Blog kaydedilirken hata oluştu",
                error: error.message,
            });
            return;
        }

        console.log("Blog saved successfully: ", data);
        res.json({ success: true, message: "Blog başarıyla kaydedildi", data });
    } catch (err) {
        console.error("Exception during blog insert: ", err);
        res.status(500).json({
            success: false,
            message: "Blog kaydedilirken beklenmeyen hata oluştu",
            error: err.message,
        });
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
