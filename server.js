require("dotenv").config();

const dns = require("node:dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const hpp = require("hpp");
const rateLimit = require("express-rate-limit");

const ensureAdmin = require(
  "./utils/ensureAdmin"
);
const trustedOrigin = require(
  "./middleware/trustedOrigin"
);

const app = express();

app.disable("x-powered-by");

app.set("trust proxy", 1);

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
  })
);

app.use(
  cors({
    origin:
      process.env.FRONTEND_URL ||
      "http://localhost:5173",
    credentials: true,
    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ],
  })
);

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 200,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.use(express.json({ limit: "200kb" }));

app.use(
  express.urlencoded({
    extended: true,
    limit: "200kb",
  })
);

app.use(cookieParser());
app.use(mongoSanitize());
app.use(hpp());
app.use(trustedOrigin);

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
  });
});

app.use(
  "/api/auth",
  require("./routes/authRoutes")
);

app.use(
  "/api/cars",
  require("./routes/carRoutes")
);

app.use(
  "/api/bookings",
  require("./routes/bookingRoutes")
);

app.use(
  "/api/settings",
  require("./routes/settingsRoutes")
);

app.use((req, res) => {
  res.status(404).json({
    message: "API route not found",
  });
});

app.use((error, req, res, next) => {
  console.error(error);

  if (error.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      message:
        "Image size must not exceed 5 MB",
    });
  }

  if (
    error.message?.includes(
      "Only JPG, PNG and WEBP"
    )
  ) {
    return res.status(400).json({
      message: error.message,
    });
  }

  res.status(error.status || 500).json({
    message:
      process.env.NODE_ENV === "production"
        ? "Something went wrong"
        : error.message || "Server error",
  });
});

async function connectDB() {
  try {
    await mongoose.connect(
      process.env.MONGO_URI,
      {
        serverSelectionTimeoutMS: 15000,
      }
    );

    console.log("MongoDB connected");

    await ensureAdmin();

    const port = process.env.PORT || 5000;

    app.listen(port, "0.0.0.0", () => {
      console.log(
        `Server running on ${port}`
      );
    });
  } catch (error) {
    console.error(
      "MongoDB error:",
      error.message
    );

    process.exit(1);
  }
}

connectDB();