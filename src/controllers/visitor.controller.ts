import { Request, Response } from "express";
import supabase from "../config/supabase";

export const handleVisitorView = async (
    req: Request,
    res: Response
): Promise<Response> => {
    const { visitor }: { visitor: string } = req.body;

    try {
        const { data: existingVisitor, error: visitorError } = await supabase
            .from("Visitors")
            .select("*")
            .eq("visitor_id", visitor)
            .single();
        if (visitorError && visitorError.code !== "PGRST116") {
            throw visitorError;
        }

        const currentTime = new Date();

        if (existingVisitor) {
            const lastVisitTime = new Date(existingVisitor.visit_time);
            const timeDifference =
                (currentTime.getTime() - lastVisitTime.getTime()) /
                (1000 * 60 * 60 * 24); // gün

            if (timeDifference > 1) {
                const { error: updateError } = await supabase
                    .from("Visitors")
                    .update({
                        view: existingVisitor.view + 1,
                        visit_time: currentTime,
                    })
                    .eq("visitor_id", visitor);

                if (updateError) {
                    throw updateError;
                }
            }
        } else {
            const { error: insertError } = await supabase
                .from("Visitors")
                .insert([
                    {
                        visitor_id: visitor,
                        visit_time: currentTime,
                        view: 1,
                    },
                ]);

            if (insertError) {
                throw insertError;
            }
        }

        res.setHeader("Cache-Control", "no-store");
        return res.status(200).json({ message: "Operation successful" });
    } catch (error: any) {
        console.error("Error processing view:", error);
        res.setHeader("Cache-Control", "no-store");
        return res
            .status(500)
            .json({ message: "Internal server error", error: error.message });
    }
};

export const getAllViews = async (
    req: Request,
    res: Response
): Promise<Response> => {
    try {
        const { data, error } = await supabase.from("Visitors").select("*");

        if (error) {
            return res.status(500).json({
                success: false,
                message: "Görüntülenme verileri alınırken hata oluştu",
                error: error.message,
            });
        }

        res.setHeader("Cache-Control", "no-store");
        return res.status(200).json({ success: true, content: data });
    } catch (err: any) {
        return res.status(500).json({
            success: false,
            message: "Sunucu hatası oluştu",
            error: err.message,
        });
    }
};
