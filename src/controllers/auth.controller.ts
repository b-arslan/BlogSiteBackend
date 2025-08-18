import { Request, Response } from "express";
import supabase from "../config/supabase";
import bcrypt from "bcrypt";

export const login = async (req: Request, res: Response): Promise<Response> => {
    const { email, password }: { email: string; password: string } = req.body;

    const { data, error } = await supabase
        .from("adminusers")
        .select("password")
        .eq("email", email);

    if (error || !data || data.length === 0) {
        return res.status(404).json({
            success: false,
            message: "Kullanıcı bulunamadı",
            error: error ? error.message : null,
        });
    }

    const hashedPassword: string = data[0].password;
    const isMatch: boolean = await bcrypt.compare(password, hashedPassword);

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
