require("dotenv").config();
const mongoose = require("mongoose");
const Admin = require("../models/admin.model");
const md5 = require("md5");

const URI = process.env.MONGODB_URI || process.env.DEV_MONDODB_URI;

const seedAdmin = async () => {
  try {
    await mongoose.connect(URI);
    console.log("Connected to Database successfully.");

    // Admin details
    const email = "admin@gmail.com";
    const password = "password@123";
    const name = "Super Admin";

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email });

    if (existingAdmin) {
      console.log("Admin already exists.");
    } else {
      // Create a new admin
      const newAdmin = new Admin({
        name,
        email,
        password: md5(password),
      });

      await newAdmin.save();
      console.log("Admin user seeded successfully:");
      console.log(`Email: ${email}`);
      console.log(`Password: ${password}`);
    }
  } catch (error) {
    console.error("Error seeding admin user:", error);
  } finally {
    mongoose.connection.close();
  }
};

seedAdmin();
