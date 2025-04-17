const mammoth = require("mammoth");
const { parseDocument, DomUtils } = require("htmlparser2");
const { ref, uploadBytes, getDownloadURL } = require("firebase/storage");
const { storage } = require("../../config/firebase");

const parseWordFileToHtml = async (wordBuffer) => {
  const { value: htmlContent } = await mammoth.convertToHtml({
    buffer: wordBuffer,
    styleMap: [
      "p => p:fresh",
      "h1 => h1:fresh",
      "ul => ul:fresh",
      "ol => ol:fresh",
      "li => li:fresh",
      "strong => strong",
      "em => em"
    ]
  });

  const dom = parseDocument(htmlContent);

  const titleElem = DomUtils.findOne(elem => elem.name === 'h1', dom.children);
  const title = titleElem ? DomUtils.getText(titleElem) : "Başlıksız Blog";
  if (titleElem) DomUtils.removeElement(titleElem);

  // Stil ayarları
  const paragraphs = DomUtils.findAll(elem => elem.name === 'p', dom.children);
  paragraphs.forEach(p => {
    if (DomUtils.getText(p).trim() === '') {
      p.attribs.style = (p.attribs.style || '') + 'min-height:20px;margin-bottom:15px;';
    } else {
      p.attribs.style = (p.attribs.style || '') + 'font-size:18px;line-height:1.8;margin-bottom:15px;';
    }
  });

  const lists = DomUtils.findAll(elem => ['ul', 'ol'].includes(elem.name), dom.children);
  lists.forEach(list => {
    list.attribs.style = (list.attribs.style || '') + 'margin-left: 40px; font-size:18px;line-height:1.8;';
  });

  // Base64 görselleri Firebase'e yükle ve URL'leri güncelle
  const images = DomUtils.findAll(elem => elem.name === 'img', dom.children);
  for (let img of images) {
    const imageBuffer = Buffer.from(img.attribs.src.replace(/^data:image\/\w+;base64,/, ""), 'base64');
    const imageName = `contentImages/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.png`;
    const storageRef = ref(storage, imageName);

    const snapshot = await uploadBytes(storageRef, imageBuffer);
    const imageUrl = await getDownloadURL(snapshot.ref);
    img.attribs.src = imageUrl;
  }

  const updatedHtmlContent = DomUtils.getOuterHTML(dom);
  return { title, html: updatedHtmlContent };
};

module.exports = { parseWordFileToHtml };