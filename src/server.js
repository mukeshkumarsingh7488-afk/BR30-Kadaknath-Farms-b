import app from "./app.js";
import env from "./config/env.js";
import connectDB from "./config/db.js";

const startServer = async () => {
  try {
    await connectDB();

    app.listen(env.port, () => {
      console.log(`Server running on http://localhost:${env.port}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
};

startServer();
