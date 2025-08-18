import mammoth from "mammoth";
import { parseDocument, DomUtils } from "htmlparser2";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../config/firebase";
import { Element } from "domhandler";

export const parseWordFileToHtml = async (
    wordBuffer: Buffer
): Promise<{ title: string; html: string }> => {
    const { value: htmlContent } = await mammoth.convertToHtml(
        { buffer: wordBuffer },
        {
            styleMap: [
                "p => p:fresh",
                "h1 => h1:fresh",
                "ul => ul:fresh",
                "ol => ol:fresh",
                "li => li:fresh",
                "strong => strong",
                "em => em",
            ],
        }
    );

    const dom = parseDocument(htmlContent);

    const titleElem = DomUtils.findOne(
        (elem): elem is Element => elem.type === "tag" && elem.name === "h1",
        dom.children
    );

    const title = titleElem ? DomUtils.getText(titleElem) : "Başlıksız Blog";

    if (titleElem) {
        DomUtils.removeElement(titleElem);
    }

    const paragraphs = DomUtils.findAll(
        (elem): elem is Element => elem.type === "tag" && elem.name === "p",
        dom.children
    );

    paragraphs.forEach((p) => {
        const text = DomUtils.getText(p).trim();
        const defaultStyle =
            text === ""
                ? "min-height:20px;margin-bottom:15px;"
                : "font-size:18px;line-height:1.8;margin-bottom:15px;";
        p.attribs = {
            ...p.attribs,
            style: (p.attribs?.style || "") + defaultStyle,
        };
    });

    const lists = DomUtils.findAll(
        (elem): elem is Element =>
            elem.type === "tag" && ["ul", "ol"].includes(elem.name),
        dom.children
    );

    lists.forEach((list) => {
        list.attribs = {
            ...list.attribs,
            style:
                (list.attribs?.style || "") +
                "margin-left: 40px; font-size:18px;line-height:1.8;",
        };
    });

    const images = DomUtils.findAll(
        (elem): elem is Element => elem.type === "tag" && elem.name === "img",
        dom.children
    );

    for (const img of images) {
        if (!img.attribs?.src?.startsWith("data:image")) continue;

        const imageBuffer = Buffer.from(
            img.attribs.src.replace(/^data:image\/\w+;base64,/, ""),
            "base64"
        );

        const imageName = `contentImages/${Date.now()}_${Math.random()
            .toString(36)
            .substring(2, 9)}.png`;

        const storageRef = ref(storage, imageName);
        const snapshot = await uploadBytes(storageRef, imageBuffer);
        const imageUrl = await getDownloadURL(snapshot.ref);

        img.attribs.src = imageUrl;
    }

    const updatedHtmlContent = DomUtils.getOuterHTML(dom);
    return { title, html: updatedHtmlContent };
};
