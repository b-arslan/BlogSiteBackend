# Blog Backend

This backend is developed using Express.js and manages blog content with Supabase and Firebase integrations.

## 🧠 General Information
- Firebase Storage is used for image uploads.
- Supabase is used for database operations.

---

## 🔐 Authentication

| Method | Endpoint      | Açıklama             |
|--------|---------------|----------------------|
| POST   | `/api/login`  | Admin login          |

---

## 📝 Blog Management

| Method | Endpoint                  | Açıklama                                               |
|--------|---------------------------|--------------------------------------------------------|
| GET    | `/api/blogposts`          | Retrieve all blog posts                                |
| POST   | `/api/blog`               | Create a blog post (with cover image)                  |
| POST   | `/api/wordBlog`           | Create a blog post from a Word document (rich content) |
| DELETE | `/api/deleteBlog/:id`     | Delete a blog post                                     |
| POST   | `/api/blogposts/:id/view` | Increment the view count of a specific blog post       |

---

## 🖼️ Image Upload

| Method | Endpoint             | Açıklama                      |
|--------|----------------------|-------------------------------|
| POST   | `/api/upload-image`  | Upload content image          |

---

## 👀 Visitor Analytics

| Method | Endpoint         | Açıklama                                      |
|--------|------------------|-----------------------------------------------|
| POST   | `/api/view`      | Increment daily unique visitor count          |
| GET    | `/api/getViews`  | Retrieve all visitor logs                     |

---