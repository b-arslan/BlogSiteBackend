const supabase = require('../../config/supabase');
const { ref, uploadBytes, getDownloadURL } = require('firebase/storage');
const { storage } = require('../../config/firebase');
const { parseWordFileToHtml } = require('../utils/wordParser');

const getBlogPosts = async (req, res) => {
    const { data, error } = await supabase
        .from("BlogPosts")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        return res.status(500).json({
            success: false,
            message: "Blog verileri alınırken hata oluştu",
            error: error.message,
        });
    }

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ success: true, content: data });
};

const addBlogPost = async (req, res) => {
    const { title, author, content } = req.body;
    const coverImage = req.files['coverImage'] ? req.files['coverImage'][0] : null;
  
    let coverImageUrl = null;
  
    if (coverImage) {
      try {
        const storageRef = ref(storage, `coverImages/${coverImage.originalname}`);
        const snapshot = await uploadBytes(storageRef, coverImage.buffer);
        coverImageUrl = await getDownloadURL(snapshot.ref);
      } catch (error) {
        return res.status(500).json({
          success: false,
          message: "Kapak fotoğrafı yüklenemedi",
          error: error.message,
        });
      }
    }
  
    try {
      const { data, error } = await supabase.from("BlogPosts").insert([
        {
          title,
          created_by: author,
          content,
          cover_image_url: coverImageUrl,
        },
      ]);
  
      if (error) {
        return res.status(500).json({
          success: false,
          message: "Blog kaydedilemedi",
          error: error.message,
        });
      }
  
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({
        success: true,
        message: "Blog başarıyla kaydedildi",
        data,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Blog kaydedilirken hata oluştu",
        error: err.message,
      });
    }
};
  
const addWordBlog = async (req, res) => {
    const wordFile = req.files['wordFile'] ? req.files['wordFile'][0] : null;
    const coverImage = req.files['coverImage'] ? req.files['coverImage'][0] : null;
  
    if (!wordFile) {
      return res.status(400).json({ success: false, message: "No Word document provided" });
    }
  
    let coverImageUrl = null;
  
    if (coverImage) {
      try {
        const coverImageName = `coverImages/${Date.now()}_${coverImage.originalname}`;
        const coverImageRef = ref(storage, coverImageName);
        const snapshot = await uploadBytes(coverImageRef, coverImage.buffer);
        coverImageUrl = await getDownloadURL(snapshot.ref);
      } catch (error) {
        return res.status(500).json({
          success: false,
          message: "Kapak fotoğrafı yüklenemedi",
          error: error.message,
        });
      }
    }
  
    try {
      const { title, html } = await parseWordFileToHtml(wordFile.buffer);
  
      const { data, error } = await supabase.from("BlogPosts").insert([
        {
          title,
          content: html,
          created_by: "Mehmet Aker", // İleride kullanıcı giriş sistemiyle değiştirilebilir
          cover_image_url: coverImageUrl,
        },
      ]);
  
      if (error) {
        return res.status(500).json({
          success: false,
          message: "Blog kaydedilemedi",
          error: error.message,
        });
      }
  
      return res.status(200).json({
        success: true,
        message: "Word belgesinden blog başarıyla oluşturuldu",
        data,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Word belgesi işlenirken hata oluştu",
        error: err.message,
      });
    }
};

const incrementViewCount = async (req, res) => {
    const { id } = req.params;

    try {
        const { data, error: selectError } = await supabase
            .from("BlogPosts")
            .select("view_count")
            .eq("id", id)
            .single();

        if (selectError) {
            return res.status(404).json({
                success: false,
                message: "Blog bulunamadı",
                error: selectError.message,
            });
        }

        const currentViewCount = data.view_count || 0;
        const updatedViewCount = currentViewCount + 1;

        const { error: updateError } = await supabase
            .from("BlogPosts")
            .update({ view_count: updatedViewCount })
            .eq("id", id);

        if (updateError) {
            return res.status(500).json({
                success: false,
                message: "Görüntüleme sayısı artırılamadı",
                error: updateError.message,
            });
        }

        return res.status(200).json({
            success: true,
            message: `Blog görüntüleme sayısı başarıyla artırıldı. Yeni görüntüleme sayısı: ${updatedViewCount}`,
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: "Görüntüleme sayısı artırılırken bir hata oluştu",
            error: err.message,
        });
    }
};

const deleteBlogPost = async (req, res) => {
    const { id } = req.params;
  
    try {
      const { data, error } = await supabase
        .from("BlogPosts")
        .delete()
        .eq("id", id);
  
      if (error) {
        return res.status(500).json({
          success: false,
          message: "Blog silinirken hata oluştu",
          error: error.message,
        });
      }
  
      return res.status(200).json({
        success: true,
        message: "Blog başarıyla silindi",
        deleted: data,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Sunucu hatası oluştu",
        error: err.message,
      });
    }
};
  
module.exports = { getBlogPosts, addBlogPost, addWordBlog, incrementViewCount, deleteBlogPost };