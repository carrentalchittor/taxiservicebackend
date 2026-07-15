const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");
const { Resend } = require("resend");

const User = require("../models/User");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");

const resend = new Resend(
  process.env.RESEND_API_KEY
);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message:
      "Too many attempts. Please try again after 15 minutes.",
  },
});

function cleanText(value) {
  return String(value || "").trim();
}

function hashOtp(otp) {
  return crypto
    .createHash("sha256")
    .update(String(otp))
    .digest("hex");
}

function setAuthCookie(res, token) {
  res.cookie("authToken", token, {
    httpOnly: true,
    secure:
      process.env.NODE_ENV === "production",
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
      const email = cleanText(
        req.body.email
      ).toLowerCase();
      const city = cleanText(req.body.city);
      const password = String(
        req.body.password || ""
      );

      if (
        !name ||
        !phone ||
        !email ||
        !city ||
        !password
      ) {
        return res.status(400).json({
          message: "All fields are required",
        });
      }

      if (
        name.length < 2 ||
        name.length > 60
      ) {
        return res.status(400).json({
          message:
            "Name must be between 2 and 60 characters",
        });
      }

      if (
        city.length < 2 ||
        city.length > 80
      ) {
        return res.status(400).json({
          message:
            "City must be between 2 and 80 characters",
        });
      }

      if (!/^[6-9]\d{9}$/.test(phone)) {
        return res.status(400).json({
          message:
            "Enter a valid 10 digit phone number",
        });
      }

      if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
          email
        )
      ) {
        return res.status(400).json({
          message:
            "Enter a valid email address",
        });
      }

      if (password.length < 8) {
        return res.status(400).json({
          message:
            "Password must contain at least 8 characters",
        });
      }

      const existingUser =
        await User.findOne({
          $or: [{ phone }, { email }],
        });

      if (existingUser) {
        return res.status(400).json({
          message:
            existingUser.phone === phone
              ? "Phone number is already registered"
              : "Email address is already registered",
        });
      }

      const hashedPassword =
        await bcrypt.hash(password, 12);

      const user = await User.create({
        name,
        phone,
        email,
        city,
        password: hashedPassword,
      });

      return res.status(201).json({
        message: "Registration successful",
        user: {
          id: user._id,
          name: user.name,
          phone: user.phone,
          email: user.email,
          city: user.city,
          role: user.role,
        },
      });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(400).json({
          message:
            "Phone number or email is already registered",
        });
      }

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
      const phone = cleanText(
        req.body.phone
      );

      const password = String(
        req.body.password || ""
      );

      if (!phone || !password) {
        return res.status(400).json({
          message:
            "Phone number and password are required",
        });
      }

      if (!/^[6-9]\d{9}$/.test(phone)) {
        return res.status(400).json({
          message:
            "Enter a valid 10 digit phone number",
        });
      }

      const user = await User.findOne({
        phone,
      }).select("+password");

      if (!user) {
        return res.status(400).json({
          message:
            "Invalid phone or password",
        });
      }

      const validPassword =
        await bcrypt.compare(
          password,
          user.password
        );

      if (!validPassword) {
        return res.status(400).json({
          message:
            "Invalid phone or password",
        });
      }

      if (!process.env.JWT_SECRET) {
        throw new Error(
          "JWT_SECRET is not configured"
        );
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

      return res.json({
        token,
        user: {
          id: user._id,
          name: user.name,
          phone: user.phone,
          email: user.email,
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
   FORGOT PASSWORD
========================= */

router.post(
  "/forgot-password",
  authLimiter,
  async (req, res, next) => {
    try {
      const email = cleanText(
        req.body.email
      ).toLowerCase();

      if (!email) {
        return res.status(400).json({
          message:
            "Email address is required",
        });
      }

      if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
          email
        )
      ) {
        return res.status(400).json({
          message:
            "Enter a valid email address",
        });
      }

      const user = await User.findOne({
        email,
      }).select(
        "+resetOtp +resetOtpExpires"
      );

      if (!user) {
        return res.status(404).json({
          message:
            "No account found with this email address",
        });
      }

      if (
        !process.env.RESEND_API_KEY
      ) {
        throw new Error(
          "RESEND_API_KEY is not configured"
        );
      }

      const otp = String(
        Math.floor(
          100000 +
            Math.random() * 900000
        )
      );

      user.resetOtp = hashOtp(otp);

      user.resetOtpExpires = new Date(
        Date.now() + 10 * 60 * 1000
      );

      await user.save();

      const {
        data,
        error,
      } = await resend.emails.send({
        from:
          process.env.EMAIL_FROM ||
          "Car Rental Chittorgarh <onboarding@resend.dev>",

        to: [user.email],

        subject:
          "Password Reset OTP",

        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px">
            <h2>Car Rental Chittorgarh</h2>

            <p>Hello ${user.name},</p>

            <p>
              Use the OTP below to reset your password:
            </p>

            <div
              style="
                font-size:32px;
                font-weight:bold;
                letter-spacing:8px;
                padding:18px;
                background:#f2f2f2;
                text-align:center;
                border-radius:8px;
                margin:20px 0;
              "
            >
              ${otp}
            </div>

            <p>
              This OTP is valid for 10 minutes.
            </p>

            <p>
              If you did not request this password reset,
              you can ignore this email.
            </p>
          </div>
        `,
      });

      if (error) {
        user.resetOtp = undefined;
        user.resetOtpExpires =
          undefined;

        await user.save();

        console.error(
          "Resend error:",
          error
        );

        return res.status(500).json({
          message:
            "Unable to send OTP email. Please try again.",
        });
      }

      console.log(
        "Reset OTP email sent:",
        data?.id
      );

      return res.json({
        message:
          "OTP has been sent to your registered email.",
      });
    } catch (error) {
      next(error);
    }
  }
);

/* =========================
   RESET PASSWORD
========================= */

router.post(
  "/reset-password",
  authLimiter,
  async (req, res, next) => {
    try {
      const email = cleanText(
        req.body.email
      ).toLowerCase();

      const otp = cleanText(
        req.body.otp
      );

      const newPassword = String(
        req.body.newPassword || ""
      );

      if (
        !email ||
        !otp ||
        !newPassword
      ) {
        return res.status(400).json({
          message:
            "Email, OTP and new password are required",
        });
      }

      if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
          email
        )
      ) {
        return res.status(400).json({
          message:
            "Enter a valid email address",
        });
      }

      if (!/^\d{6}$/.test(otp)) {
        return res.status(400).json({
          message:
            "OTP must contain 6 digits",
        });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({
          message:
            "Password must contain at least 8 characters",
        });
      }

      const user = await User.findOne({
        email,
      }).select(
        "+password +resetOtp +resetOtpExpires"
      );

      if (
        !user ||
        !user.resetOtp ||
        !user.resetOtpExpires
      ) {
        return res.status(400).json({
          message:
            "Invalid or expired password reset request",
        });
      }

      if (
        user.resetOtpExpires.getTime() <
        Date.now()
      ) {
        user.resetOtp = undefined;
        user.resetOtpExpires =
          undefined;

        await user.save();

        return res.status(400).json({
          message:
            "OTP has expired. Request a new OTP.",
        });
      }

      const enteredOtpHash =
        hashOtp(otp);

      if (
        enteredOtpHash !==
        user.resetOtp
      ) {
        return res.status(400).json({
          message: "Invalid OTP",
        });
      }

      user.password =
        await bcrypt.hash(
          newPassword,
          12
        );

      user.resetOtp = undefined;
      user.resetOtpExpires =
        undefined;

      await user.save();

      return res.json({
        message:
          "Password reset successful. Please login.",
      });
    } catch (error) {
      next(error);
    }
  }
);

/* =========================
   LOGOUT
========================= */

router.post(
  "/logout",
  (req, res) => {
    res.clearCookie(
      "authToken",
      {
        httpOnly: true,
        secure:
          process.env.NODE_ENV ===
          "production",
        sameSite:
          process.env.NODE_ENV ===
          "production"
            ? "none"
            : "lax",
        path: "/",
      }
    );

    return res.json({
      message:
        "Logged out successfully",
    });
  }
);

/* =========================
   CURRENT USER
========================= */

router.get(
  "/me",
  auth,
  async (req, res, next) => {
    try {
      const user =
        await User.findById(
          req.user.id
        );

      if (!user) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      return res.json({
        user: {
          id: user._id,
          name: user.name,
          phone: user.phone,
          email: user.email,
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
      const users =
        await User.find({
          role: "user",
        })
          .select(
            "name phone email city role createdAt"
          )
          .sort({
            createdAt: -1,
          });

      return res.json(users);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;