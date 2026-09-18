# BR30 Kadaknath Farms — Backend

Backend API for **BR30 Kadaknath Farms**, a modern e-commerce platform for Kadaknath eggs, chicken, chicks, hatching eggs, breeding pairs, and live birds.

Built with **Node.js, Express, MongoDB, Cloudinary, Brevo/Nodemailer, JWT authentication, and Paytm payment integration**.

---

## 🚀 Features

### Authentication

- User registration
- Email verification with OTP
- Secure login
- JWT-based authentication
- Forgot password
- Password reset with OTP
- Authenticated user session
- Logout support

### User Profile

- Get profile
- Update profile
- Profile image upload
- Cloudinary image storage
- Secure authenticated profile management

### Products

- Create products
- Get all products
- Get single product
- Update products
- Delete products
- Product search
- Product filtering
- Product availability management
- Product image support

### Orders

- Create orders
- Get customer orders
- Get single order
- Order status management
- Order cancellation
- Cancellation reason
- Customer-side cancelled order information
- Order history

### Payments

- Paytm payment integration
- Payment transaction creation
- Payment status verification
- Payment record management

### Admin

- Admin authentication
- Admin dashboard
- User management
- User search and filtering
- User blocking/unblocking
- User role management
- Product management
- Order management
- Order cancellation with reason
- Dashboard statistics

### Security

- JWT authentication
- Password hashing with bcrypt
- Helmet security headers
- CORS configuration
- Express rate limiting
- Request validation
- Protected admin routes
- Centralized error handling

### Cloud Services

- MongoDB for database
- Cloudinary for image storage
- Brevo SMTP for email delivery
- Paytm for payments

---

## 🛠️ Tech Stack

| Technology         | Purpose            |
| ------------------ | ------------------ |
| Node.js            | Runtime            |
| Express.js         | REST API           |
| MongoDB            | Database           |
| Mongoose           | MongoDB ODM        |
| JWT                | Authentication     |
| bcryptjs           | Password hashing   |
| Cloudinary         | Image storage      |
| Brevo SMTP         | Email delivery     |
| Nodemailer         | Email service      |
| Paytm              | Payment gateway    |
| Multer             | File uploads       |
| Helmet             | Security           |
| Express Rate Limit | API protection     |
| Express Validator  | Request validation |

---

## 📁 Project Structure

```text
BR30-Kadaknath-Farms-b/
│
├── src/
│   ├── app.js
│   ├── server.js
│   │
│   ├── config/
│   │   ├── cloudinary.js
│   │   ├── db.js
│   │   └── env.js
│   │
│   ├── controllers/
│   │   ├── adminDashboardController.js
│   │   ├── adminUserController.js
│   │   ├── authController.js
│   │   ├── orderController.js
│   │   ├── paymentController.js
│   │   ├── productController.js
│   │   └── profileController.js
│   │
│   ├── middleware/
│   │   ├── adminMiddleware.js
│   │   ├── adminPanelMiddleware.js
│   │   ├── authMiddleware.js
│   │   ├── errorMiddleware.js
│   │   └── upload.js
│   │
│   ├── models/
│   │   ├── Order.js
│   │   ├── Payment.js
│   │   ├── Product.js
│   │   └── User.js
│   │
│   ├── routes/
│   │   ├── adminDashboardRoutes.js
│   │   ├── adminUserRoutes.js
│   │   ├── authRoutes.js
│   │   ├── orderRoutes.js
│   │   ├── paymentRoutes.js
│   │   ├── productRoutes.js
│   │   └── profileRoutes.js
│   │
│   ├── services/
│   │   ├── emailService.js
│   │   └── paytmService.js
│   │
│   ├── templates/
│   │   ├── emailVerificationOtp.js
│   │   └── passwordResetOtp.js
│   │
│   ├── utils/
│   │   ├── cryptoToken.js
│   │   └── generateOtp.js
│   │
│   └── validators/
│       ├── authValidator.js
│       └── productValidator.js
│
├── uploads/
│   ├── exports/
│   └── temp/
│
├── .env
├── .gitignore
├── package.json
└── README.md
```

---

## ⚙️ Environment Variables

Create a `.env` file in the backend root.

Example structure:

```env
PORT=5000
NODE_ENV=development

MONGO_URI=your_mongodb_connection_string

JWT_SECRET=your_jwt_secret

FRONTEND_URL=http://localhost:5173

BREVO_EMAIL=your_email
BREVO_SMTP_KEY=your_brevo_smtp_key
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587

CLOUD_NAME=your_cloudinary_cloud_name
CLOUD_API_KEY=your_cloudinary_api_key
CLOUD_API_SECRET=your_cloudinary_api_secret

PAYTM_MID=your_paytm_merchant_id
PAYTM_MERCHANT_KEY=your_paytm_merchant_key
PAYTM_WEBSITE=DEFAULT
PAYTM_ENV=production
```

**Never commit `.env` to GitHub.**

---

## 📦 Installation

Clone or download the backend project and open the backend directory:

```bash
cd BR30-Kadaknath-Farms-b
```

Install dependencies:

```bash
npm install
```

Create the `.env` file and configure the required environment variables.

---

## ▶️ Run Locally

### Development

```bash
npm run dev
```

### Production

```bash
npm start
```

The local API runs on:

```text
http://localhost:5000
```

Health check:

```text
http://localhost:5000/api/health
```

Expected response:

```json
{
  "success": true,
  "message": "BR30 Kadaknath Farms API is running"
}
```

---

## 🌐 Production

The backend is deployed as a Node.js service.

Production API base:

```text
https://br30-kadaknath-farms-b.onrender.com/api
```

Health check:

```text
https://br30-kadaknath-farms-b.onrender.com/api/health
```

The production frontend URL is configured through the backend `FRONTEND_URL` environment variable.

---

## 🔐 Authentication Flow

The authentication system uses JWT-based authentication.

Typical flow:

```text
Register
   ↓
Email Verification OTP
   ↓
Verify Email
   ↓
Login
   ↓
JWT Access Token
   ↓
Authenticated API Requests
```

Protected requests use:

```text
Authorization: Bearer <access-token>
```

---

## 👤 User Roles

The backend supports role-based access control.

Typical roles include:

```text
user
admin
```

Admin-only operations are protected through dedicated middleware.

---

## 🛡️ API Security

The backend includes multiple security layers:

- JWT authentication
- Password hashing
- Admin authorization
- Helmet
- CORS
- Rate limiting
- Request validation
- Protected routes
- Centralized error handling
- Environment-based secrets

Sensitive credentials must always remain outside the source code.

---

## 📡 API Route Groups

The API is organized into the following route groups:

```text
/api/auth
/api/products
/api/admin/users
/api/admin/dashboard
/api/profile
/api/orders
/api/payments
```

Health endpoint:

```text
/api/health
```

---

## 🧪 API Health Check

Use the following endpoint to verify that the API is running:

```text
GET /api/health
```

Response:

```json
{
  "success": true,
  "message": "BR30 Kadaknath Farms API is running"
}
```

---

## 🖼️ Image Storage

Product and profile images can be handled through **Cloudinary**.

Uploaded images are stored remotely rather than relying on local server storage for permanent production storage.

Temporary upload files are kept inside:

```text
uploads/temp/
```

Export files are kept inside:

```text
uploads/exports/
```

These runtime directories are excluded from Git tracking.

---

## 💳 Payment Integration

The backend includes Paytm payment integration for processing and verifying transactions.

Payment flow:

```text
Create Order
     ↓
Create Payment Transaction
     ↓
Customer Payment
     ↓
Payment Verification
     ↓
Update Payment / Order Status
```

Payment credentials must only be configured through environment variables.

---

## 📧 Email Service

Email functionality is integrated using Brevo SMTP with Nodemailer.

The backend supports transactional emails such as:

- Email verification OTP
- Password reset OTP
- Account-related notifications

SMTP credentials must be stored only in environment variables.

---

## 🗄️ Database

MongoDB is used as the primary database.

Main models:

```text
User
Product
Order
Payment
```

Mongoose is used for schema definitions and database operations.

---

## 🔄 Production Architecture

```text
                 ┌──────────────────────┐
                 │   BR30 Kadaknath     │
                 │       Farms          │
                 │      Frontend        │
                 │       Vercel         │
                 └──────────┬───────────┘
                            │
                            │ REST API
                            ▼
                 ┌──────────────────────┐
                 │      Express API     │
                 │       Render         │
                 └──────────┬───────────┘
                            │
             ┌──────────────┼──────────────┐
             │              │              │
             ▼              ▼              ▼
        MongoDB        Cloudinary       Brevo
        Database       Image Storage     Email
                            │
                            ▼
                         Paytm
                        Payments
```

---

## 🚀 Deployment

The backend can be deployed to a Node.js-compatible hosting platform.

Production deployment requires:

1. Push backend source code to the repository.
2. Configure environment variables on the hosting platform.
3. Set the build command:

```bash
npm install
```

4. Set the start command:

```bash
npm start
```

5. Configure the production frontend URL in:

```env
FRONTEND_URL=https://your-frontend-domain.com
```

6. Deploy the service.
7. Verify:

```text
/api/health
```

---

## 📜 Available Scripts

```bash
npm run dev
```

Starts the development server using Nodemon.

```bash
npm start
```

Starts the production server.

---

## 🔒 Git & Secrets

The following files/directories should not be committed:

```text
node_modules/
.env
uploads/temp/*
uploads/exports/*
```

Keep all API keys, database credentials, JWT secrets, payment credentials, SMTP credentials, and Cloudinary secrets private.

---

## 📌 Project Status

**Backend:** Production deployed and operational.

**Frontend:** Connected to the production API.

**Database:** MongoDB connected.

**Authentication:** Implemented.

**Products:** Implemented.

**Orders:** Implemented.

**Payments:** Implemented.

**Admin Management:** Implemented.

**Cloudinary:** Integrated.

**Email Service:** Integrated.

---

## 🏢 Project

**BR30 Kadaknath Farms**

A digital platform for Kadaknath poultry products, farm orders, customer management, and online payments.

Built by **BR30 Group**.
