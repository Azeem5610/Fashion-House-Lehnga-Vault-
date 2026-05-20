/**
 * Seed Super Admin Script
 * 
 * Usage: node scripts/seedAdmin.js
 * 
 * Creates a superadmin account if one doesn't already exist.
 * Also migrates any existing 'admin' users to 'superadmin' role.
 */

const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

// Load env from backend root
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const User = require("../models/User");

const SUPERADMIN = {
  name: "Super Admin",
  email: process.env.ADMIN_EMAIL || "admin@fashionhouse.com",
  password: process.env.ADMIN_PASSWORD || "Admin@123",
  role: "superadmin",
  phone: "",
  isActive: true,
};

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✓ Connected to MongoDB");

    // Step 1: Migrate existing 'admin' users to 'superadmin'
    const migrated = await User.updateMany(
      { role: "admin" },
      { $set: { role: "superadmin" } }
    );
    if (migrated.modifiedCount > 0) {
      console.log(`✓ Migrated ${migrated.modifiedCount} admin user(s) to superadmin`);
    }

    // Step 2: Check if superadmin already exists
    const existingAdmin = await User.findOne({ role: "superadmin" });
    if (existingAdmin) {
      console.log(`✓ Super Admin already exists: ${existingAdmin.email}`);
    } else {
      // Create new superadmin (password is hashed by pre-save hook)
      const admin = await User.create(SUPERADMIN);
      console.log(`✓ Super Admin created: ${admin.email}`);
    }

    console.log("\n✓ Seed complete!");
    process.exit(0);
  } catch (error) {
    console.error("✗ Seed failed:", error.message);
    process.exit(1);
  }
};

seedAdmin();
