const bcrypt = require("bcryptjs");
const User = require("../models/User");

module.exports = async function ensureAdmin() {
  const name = String(
    process.env.ADMIN_NAME || "Admin"
  ).trim();

  const phone = String(
    process.env.ADMIN_PHONE || ""
  ).trim();

  const email = String(
    process.env.ADMIN_EMAIL || ""
  )
    .trim()
    .toLowerCase();

  const city = String(
    process.env.ADMIN_CITY ||
      "Chittorgarh"
  ).trim();

  const adminPassword = String(
    process.env.ADMIN_PASSWORD || ""
  );

  if (
    !name ||
    !phone ||
    !email ||
    !city ||
    !adminPassword
  ) {
    throw new Error(
      "ADMIN_NAME, ADMIN_PHONE, ADMIN_EMAIL, ADMIN_CITY and ADMIN_PASSWORD are required in .env"
    );
  }

  if (!/^[6-9]\d{9}$/.test(phone)) {
    throw new Error(
      "ADMIN_PHONE must be a valid 10 digit Indian phone number"
    );
  }

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      email
    )
  ) {
    throw new Error(
      "ADMIN_EMAIL must be a valid email address"
    );
  }

  if (adminPassword.length < 8) {
    throw new Error(
      "ADMIN_PASSWORD must contain at least 8 characters"
    );
  }

  const userWithPhone = await User.findOne({
    phone,
  }).select("+password");

  const userWithEmail = await User.findOne({
    email,
  }).select("+password");

  if (
    userWithPhone &&
    userWithEmail &&
    String(userWithPhone._id) !==
      String(userWithEmail._id)
  ) {
    throw new Error(
      "ADMIN_PHONE and ADMIN_EMAIL belong to different users"
    );
  }

  const existingAdmin =
    userWithPhone || userWithEmail;

  if (existingAdmin) {
    existingAdmin.name = name;
    existingAdmin.phone = phone;
    existingAdmin.email = email;
    existingAdmin.city = city;
    existingAdmin.role = "admin";

    if (!existingAdmin.password) {
      existingAdmin.password =
        await bcrypt.hash(
          adminPassword,
          12
        );
    }

    await existingAdmin.save();

    console.log(
      "Existing user updated as admin"
    );

    console.log(
      `Admin email: ${existingAdmin.email}`
    );

    return;
  }

  const hashedPassword =
    await bcrypt.hash(
      adminPassword,
      12
    );

  const admin = await User.create({
    name,
    phone,
    email,
    city,
    password: hashedPassword,
    role: "admin",
  });

  console.log(
    "Default admin created successfully"
  );

  console.log(
    `Admin email: ${admin.email}`
  );
};