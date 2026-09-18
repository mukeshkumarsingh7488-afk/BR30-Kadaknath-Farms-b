import express from "express";

import cors from "cors";

import cookieParser from "cookie-parser";

import helmet from "helmet";

import rateLimit from "express-rate-limit";

import env from "./config/env.js";

import authRoutes from "./routes/authRoutes.js";

import productRoutes from "./routes/productRoutes.js";
import adminUserRoutes from "./routes/adminUserRoutes.js";
import adminDashboardRoutes from "./routes/adminDashboardRoutes.js";

import profileRoutes from "./routes/profileRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";

import errorMiddleware from "./middleware/errorMiddleware.js";

const app = express();

app.disable("x-powered-by");

app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);

app.use(
  cors({
    origin: env.frontendUrl,
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));

app.use(express.urlencoded({ extended: true, limit: "1mb" }));

app.use(cookieParser());

const globalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(globalRateLimit);

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "BR30 Kadaknath Farms API is running",
  });
});

app.use("/api/auth", authRoutes);

app.use("/api/products", productRoutes);
app.use("/api/admin/users", adminUserRoutes);
app.use("/api/admin/dashboard", adminDashboardRoutes);

app.use("/api/profile", profileRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found",
  });
});

app.use(errorMiddleware);

export default app;
