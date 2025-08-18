import { Request } from "express";
import multer from "multer";

export interface MulterRequest extends Request {
    files?: {
        [fieldname: string]: Express.Multer.File[];
    };
}
