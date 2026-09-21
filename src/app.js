import express from "express";

import cors from "cors";

import cookieParser from "cookie-parser";

import helmet from "helmet";

// Rate limiter intentionally disabled during Farm OS development.
// Production me auth/login/payment jaise sensitive routes par targeted
// rate limiting separately add ki jayegi.

import env from "./config/env.js";

import farmRoutes from "./routes/farmRoutes.js";

import shedRoutes from "./routes/shedRoutes.js";

import batchRoutes from "./routes/batchRoutes.js";

import chicksInwardRoutes from "./routes/chicksInwardRoutes.js";

import mortalityRoutes from "./routes/mortalityRoutes.js";

import weightGrowthRoutes from "./routes/weightGrowthRoutes.js";

import eggCollectionRoutes from "./routes/eggCollectionRoutes.js";

import feedInventoryRoutes from "./routes/feedInventoryRoutes.js";

import feedConsumptionRoutes from "./routes/feedConsumptionRoutes.js";

import medicineRoutes from "./routes/medicineRoutes.js";

import vaccinationRoutes from "./routes/vaccinationRoutes.js";

import veterinaryHealthLogRoutes from "./routes/veterinaryHealthLogRoutes.js";

import waterQualityRoutes from "./routes/waterQualityRoutes.js";

import staffAttendanceRoutes from "./routes/staffAttendanceRoutes.js";

import taskRoutes from "./routes/taskRoutes.js";

import payrollRoutes from "./routes/payrollRoutes.js";

import biosecurityVisitorRoutes from "./routes/biosecurityVisitorRoutes.js";

import shedMaintenanceRoutes from "./routes/shedMaintenanceRoutes.js";

import saleRoutes from "./routes/saleRoutes.js";

import farmReportRoutes from "./routes/farmReportRoutes.js";

import farmDashboardRoutes from "./routes/farmDashboardRoutes.js";

import birdStockRoutes from "./routes/birdStockRoutes.js";

import farmExpenseRoutes from "./routes/farmExpenseRoutes.js";

import authRoutes from "./routes/authRoutes.js";

import productRoutes from "./routes/productRoutes.js";

import adminUserRoutes from "./routes/adminUserRoutes.js";

import adminDashboardRoutes from "./routes/adminDashboardRoutes.js";

import refundRoutes from "./routes/refundRoutes.js";

import profileRoutes from "./routes/profileRoutes.js";

import orderRoutes from "./routes/orderRoutes.js";

import paymentRoutes from "./routes/paymentRoutes.js";

import adminPermissionRoutes from "./routes/adminPermissionRoutes.js";

import whatsNewRoutes from "./routes/whatsNewRoutes.js";

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

// Global rate limiter is disabled during development.
// Farm OS loads many API endpoints together, so a global limiter
// can incorrectly return 429 Too Many Requests during normal usage.

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "BR30 Kadaknath Farms API is running",
  });
});

app.use("/api/farms", farmRoutes);

app.use("/api/sheds", shedRoutes);

app.use("/api/batches", batchRoutes);

app.use("/api/chicks-inward", chicksInwardRoutes);

app.use("/api/mortalities", mortalityRoutes);

app.use("/api/weight-growth", weightGrowthRoutes);

app.use("/api/egg-collections", eggCollectionRoutes);

app.use("/api/feed-inventory", feedInventoryRoutes);

app.use("/api/feed-consumption", feedConsumptionRoutes);

app.use("/api/medicine", medicineRoutes);

app.use("/api/vaccinations", vaccinationRoutes);

app.use("/api/veterinary-health", veterinaryHealthLogRoutes);

app.use("/api/water-quality", waterQualityRoutes);

app.use("/api/staff-attendance", staffAttendanceRoutes);

app.use("/api/tasks", taskRoutes);

app.use("/api/payroll", payrollRoutes);

app.use("/api/biosecurity-visitors", biosecurityVisitorRoutes);

app.use("/api/shed-maintenance", shedMaintenanceRoutes);

app.use("/api/sales", saleRoutes);

app.use("/api/farm-reports", farmReportRoutes);

app.use("/api/farm-dashboard", farmDashboardRoutes);

app.use("/api/bird-stock", birdStockRoutes);

app.use("/api/farm-expenses", farmExpenseRoutes);

app.use("/api/auth", authRoutes);

app.use("/api/products", productRoutes);

app.use("/api/admin/users", adminUserRoutes);

app.use("/api/admin/dashboard", adminDashboardRoutes);

app.use("/api/refunds", refundRoutes);

app.use("/api/profile", profileRoutes);

app.use("/api/orders", orderRoutes);

app.use("/api/payments", paymentRoutes);

app.use("/api/admin/permissions", adminPermissionRoutes);

app.use("/api/whats-new", whatsNewRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found",
  });
});

app.use(errorMiddleware);

export default app;
