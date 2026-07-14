const bcrypt = require("bcryptjs");
const User = require("../models/User");

module.exports = async function ensureAdmin() {
  const phone = String(
    process.env.ADMIN_PHONE || ""
  ).trim();

  const adminPassword =
    process.env.ADMIN_PASSWORD;

  if (!phone || !adminPassword) {
    throw new Error(
      "ADMIN_PHONE and ADMIN_PASSWORD are required in .env"
    );
  }

  const existingAdmin = await User.findOne({
    phone,
  });

  if (existingAdmin) {
    if (existingAdmin.role !== "admin") {
      existingAdmin.role = "admin";
      await existingAdmin.save();
    }

    console.log("Admin already exists");
    return;
  }

  const hashedPassword = await bcrypt.hash(
    adminPassword,
    12
  );

  await User.create({
    name: process.env.ADMIN_NAME || "Admin",
    phone,
    city: "Chittorgarh",
    password: hashedPassword,
    role: "admin",
  });

  console.log("Default admin created");
};