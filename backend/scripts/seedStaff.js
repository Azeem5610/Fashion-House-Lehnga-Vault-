/**
 * Seed Staff Accounts Script
 * Usage: node scripts/seedStaff.js
 * Creates one test account for each non-customer role.
 */

const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const User = require("../models/User");

const STAFF = [
  { name: "Inventory Manager", email: "inventory@fashionhouse.com", password: "Staff@123", role: "inventoryManager" },
  { name: "Production Manager", email: "production@fashionhouse.com", password: "Staff@123", role: "productionManager" },
  { name: "Tailor", email: "tailor@fashionhouse.com", password: "Staff@123", role: "tailor" },
];

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✓ Connected to MongoDB");

  for (const staff of STAFF) {
    const exists = await User.findOne({ email: staff.email });
    if (exists) {
      console.log(`  skipped (already exists): ${staff.email}`);
    } else {
      await User.create({ ...staff, isActive: true });
      console.log(`✓ Created ${staff.role}: ${staff.email}`);
    }
  }

  console.log("\nAll staff accounts use password: Staff@123");
  process.exit(0);
};

seed().catch((e) => { console.error(e.message); process.exit(1); });
