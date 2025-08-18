import { Request, Response } from "express";
import supabase from "../config/supabase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../config/firebase";
import { parseWordFileToHtml } from "../utils/wordParser";

export const getBlogPosts = async (
    req: Request,
    res: Response
): Promise<Response> => {
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

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ success: true, content: data });
};

export const addBlogPost = async (
    req: Request,
    res: Response
): Promise<Response> => {
    const { title, author, content } = req.body;
    const coverImage = (
        req.files as { [fieldname: string]: Express.Multer.File[] }
    )?.["coverImage"]?.[0];

    let coverImageUrl: string | null = null;

    if (coverImage) {
        try {
            const storageRef = ref(
                storage,
                `coverImages/${coverImage.originalname}`
            );
            const snapshot = await uploadBytes(storageRef, coverImage.buffer);
            coverImageUrl = await getDownloadURL(snapshot.ref);
        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: "Kapak fotoğrafı yüklenemedi",
                error: error.message,
            });
        }
    }

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

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({
        success: true,
        message: "Blog başarıyla kaydedildi",
        data,
    });
};

export const addWordBlog = async (
    req: Request,
    res: Response
): Promise<Response> => {
    const wordFile = (
        req.files as { [fieldname: string]: Express.Multer.File[] }
    )?.["wordFile"]?.[0];
    const coverImage = (
        req.files as { [fieldname: string]: Express.Multer.File[] }
    )?.["coverImage"]?.[0];

    if (!wordFile) {
        return res.status(400).json({
            success: false,
            message: "No Word document provided",
        });
    }

    let coverImageUrl: string | null = null;

    if (coverImage) {
        try {
            const fileName = `coverImages/${Date.now()}_${
                coverImage.originalname
            }`;
            const coverRef = ref(storage, fileName);
            const snapshot = await uploadBytes(coverRef, coverImage.buffer);
            coverImageUrl = await getDownloadURL(snapshot.ref);
        } catch (error: any) {
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
                created_by: "Mehmet Aker",
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
    } catch (err: any) {
        return res.status(500).json({
            success: false,
            message: "Word belgesi işlenirken hata oluştu",
            error: err.message,
        });
    }
};

export const incrementViewCount = async (
    req: Request,
    res: Response
): Promise<Response> => {
    const { id } = req.params;

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

    const currentViewCount = data?.view_count || 0;
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
        message: `Blog görüntüleme sayısı artırıldı. Yeni değer: ${updatedViewCount}`,
    });
};

export const deleteBlogPost = async (
    req: Request,
    res: Response
): Promise<Response> => {
    const { id } = req.params;

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
};
