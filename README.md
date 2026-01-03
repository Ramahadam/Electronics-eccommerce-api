# 🛒 E-Commerce REST API

A **production-ready E-Commerce REST API** built with **Node.js, Express, and MongoDB**, designed to power a modern frontend (Next.js) application.

This API uses **Firebase Authentication** for user identity and **JWT** for securing backend routes, following real-world backend architecture and best practices.

---

## 🚀 Features

- 🔐 **Authentication & Authorization**
  - Firebase Authentication (Email /Google provider / OAuth ready)
  - Backend JWT for protected API routes
- 📦 **Product Management**
  - Create, read, update, delete products
  - Product pricing & stock handling
- 🛒 **Shopping Cart**
  - Add/remove items
  - Quantity updates
  - Server-side total price calculation
  - **Price snapshot strategy** (industry best practice)
- ❤️ **Wishlist**
  - Add/remove products from wishlist
- ⭐ **Reviews**
  - Product reviews & ratings
- ☁️ **Cloudinary Integration**
  - Image upload & management
- 🌐 **CORS enabled**
  - Ready for Next.js frontend integration
- 🧾 **Request logging**
  - Morgan enabled in development mode

---

## 🧠 Backend Design Highlights

- Clean **MVC architecture**
- Business logic separated from routing
- **Mongoose models with custom instance methods**
- Defensive coding to prevent common bugs (`NaN`, duplicate cart items)
- Firebase used for identity, backend controls authorization
- Scalable and production-oriented API design

---

## 🛠️ Tech Stack

- Node.js
- Express.js
- MongoDB & Mongoose
- Firebase Authentication
- JWT (Authorization)
- Cloudinary
- Morgan
- CORS
- RESTful API design

---

## 📂 Project Structure

```bash
src/
├── controllers/
├── models/
├── routes/
├── utils/
├── lib/
├── app.js
├── server.js
```

---

## 🔌 API Endpoints

### 🔐 Authentication (Firebase-based)

> ⚠️ Users must authenticate via **Firebase**.  
> The backend verifies Firebase tokens and issues JWTs for protected routes.

---

### 📦 Products

```
GET    /api/v1/products
GET    /api/v1/products/:id
POST   /api/v1/products
PATCH  /api/v1/products/:id
DELETE /api/v1/products/:id
```

---

### 🛒 Cart

```
GET    /api/v1/cart
POST   /api/v1/cart
DELETE /api/v1/cart/:productId
```

---

### ❤️ Wishlist

```
GET    /api/v1/wishlists
POST   /api/v1/wishlists
DELETE /api/v1/wishlists/:productId
```

---

### ⭐ Reviews

```
POST   /api/v1/reviews
GET    /api/v1/reviews/:productId
```

---

## 🔐 Authentication Flow (Important)

1. User authenticates using **Firebase** (frontend)
2. Firebase ID token is sent to backend
3. Backend verifies token using **Firebase Admin SDK**
4. Backend issues its own **JWT**
5. JWT is used to access protected API routes

This approach mirrors **enterprise-grade authentication systems**.

---

## ⚙️ Environment Variables

Create a `.env` file:

```env
NODE_ENV=development
PORT=3001

# Database
DB=mongodb+srv://<USER>:<PASSWORD>@cluster0.mongodb.net/electronics

# JWT
JWT_SECRET=your-strong-secret-key
JWT_EXPIRES_IN=90d

# Firebase Admin SDK
FIREBASE_TYPE=service_account
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY_ID=your_key_id
FIREBASE_PRIVATE_KEY=your_private_key
FIREBASE_CLIENT_EMAIL=your_client_email
FIREBASE_CLIENT_ID=your_client_id
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token

#Optional Cloudinary for image CDN
CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>
```

---

## ▶️ Getting Started

```bash
npm install
npm run dev
```

## 👤 Author

**Mohamed Adam**  
MERN stack Developer  
Focused on scalable, secure web applications
