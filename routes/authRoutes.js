const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");

const User = require("../models/User");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message:
      "Too many login attempts. Please try again later.",
  },
});

function cleanText(value) {
  return String(value || "").trim();
}

function setAuthCookie(res, token) {
  res.cookie("authToken", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite:
      process.env.NODE_ENV === "production"
        ? "none"
        : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

/* =========================
   REGISTER
========================= */

router.post(
  "/register",
  authLimiter,
  async (req, res, next) => {
    try {
      const name = cleanText(req.body.name);
      const phone = cleanText(req.body.phone);
      const city = cleanText(req.body.city);
      const password = String(
        req.body.password || ""
      );

      if (!name || !phone || !city || !password) {
        return res.status(400).json({
          message: "All fields are required",
        });
      }

      if (!/^[6-9]\d{9}$/.test(phone)) {
        return res.status(400).json({
          message:
            "Enter a valid 10 digit phone number",
        });
      }

      if (password.length < 8) {
        return res.status(400).json({
          message:
            "Password must contain at least 8 characters",
        });
      }

      const existingUser = await User.findOne({
        phone,
      });

      if (existingUser) {
        return res.status(400).json({
          message:
            "Phone number already registered",
        });
      }

      const hashedPassword = await bcrypt.hash(
        password,
        12
      );

      const user = await User.create({
        name,
        phone,
        city,
        password: hashedPassword,
      });

      res.status(201).json({
        message: "Registration successful",
        user: {
          id: user._id,
          name: user.name,
          phone: user.phone,
          city: user.city,
          role: user.role,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/* =========================
   LOGIN
========================= */

router.post(
  "/login",
  authLimiter,
  async (req, res, next) => {
    try {
      const phone = cleanText(req.body.phone);
      const password = String(
        req.body.password || ""
      );

      const user = await User.findOne({
        phone,
      }).select("+password");

      if (!user) {
        return res.status(400).json({
          message: "Invalid phone or password",
        });
      }

      const validPassword = await bcrypt.compare(
        password,
        user.password
      );

      if (!validPassword) {
        return res.status(400).json({
          message: "Invalid phone or password",
        });
      }

      const token = jwt.sign(
        {
          id: user._id,
          role: user.role,
        },
        process.env.JWT_SECRET,
        {
          expiresIn: "7d",
        }
      );

      setAuthCookie(res, token);

      res.json({
        token,
        user: {
          id: user._id,
          name: user.name,
          phone: user.phone,
          city: user.city,
          role: user.role,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/* =========================
   LOGOUT
========================= */

router.post("/logout", (req, res) => {
  res.clearCookie("authToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite:
      process.env.NODE_ENV === "production"
        ? "none"
        : "lax",
    path: "/",
  });

  res.json({
    message: "Logged out successfully",
  });
});

/* =========================
   CURRENT USER
========================= */

router.get(
  "/me",
  auth,
  async (req, res, next) => {
    try {
      const user = await User.findById(
        req.user.id
      );

      if (!user) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      res.json({
        user: {
          id: user._id,
          name: user.name,
          phone: user.phone,
          city: user.city,
          role: user.role,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/* =========================
   ADMIN USERS LIST
========================= */

router.get(
  "/users",
  auth,
  admin,
  async (req, res, next) => {
    try {
      const users = await User.find({
        role: "user",
      })
        .select("name phone city createdAt")
        .sort({ createdAt: -1 });

      res.json(users);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;