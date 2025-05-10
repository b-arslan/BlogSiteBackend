const supabase = require("../../config/supabase");
const bcrypt = require("bcrypt");

const login = async (req, res) => {
    const { email, password } = req.body;

    const { data, error } = await supabase
        .from("adminusers")
        .select("password")
        .eq("email", email);

    if (error || data.length === 0) {
        return res.status(404).json({
            success: false,
            message: "Kullanıcı bulunamadı",
            error: error ? error.message : null,
        });
    }

    const hashedPassword = data[0].password;
    const isMatch = await bcrypt.compare(password, hashedPassword);

    if (!isMatch) {
        return res.status(404).json({
            success: false,
            message: "Şifre yanlış",
        });
    }

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({
        success: true,
        message: "Başarıyla giriş yapıldı",
    });
};

module.exports = { login };