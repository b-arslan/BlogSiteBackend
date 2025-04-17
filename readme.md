# Blog Backend

Bu backend Express.js kullanılarak geliştirilmiştir. Supabase ve Firebase entegrasyonları ile blog içeriği yönetimi yapılmaktadır.

## 🧠 Genel Bilgiler
- Tüm endpoint'ler `/api` prefix'i ile başlar.
- Firebase Storage görsel yüklemeleri için kullanılır.
- Supabase, veritabanı işlemleri için kullanılır.

---

## 🔐 Auth

| Method | Endpoint      | Açıklama             |
|--------|---------------|----------------------|
| POST   | `/api/login`  | Admin login işlemi   |

---

## 📝 Blog

| Method | Endpoint                  | Açıklama                                      |
|--------|---------------------------|-----------------------------------------------|
| GET    | `/api/blogposts`          | Tüm blogları listele                          |
| POST   | `/api/blog`               | Blog ekle (kapak görselli)                    |
| POST   | `/api/wordBlog`           | Word belgesinden blog oluştur (zengin içerik) |
| DELETE | `/api/deleteBlog/:id`     | Blog sil                                      |
| POST   | `/api/blogposts/:id/view` | Belirli bir blogun görüntülenme sayısını artır |

---

## 🖼️ Upload

| Method | Endpoint             | Açıklama                      |
|--------|----------------------|-------------------------------|
| POST   | `/api/upload-image`  | İçerik görseli yükle (contentImages) |

---

## 👀 Visitor

| Method | Endpoint         | Açıklama                                      |
|--------|------------------|-----------------------------------------------|
| POST   | `/api/view`      | Ziyaretçi sayacı (her gün için 1 artış)       |
| GET    | `/api/getViews`  | Tüm ziyaretçi kayıtlarını getir               |

---