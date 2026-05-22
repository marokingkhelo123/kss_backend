/**
 * One-time script to update super admin password
 * Usage: node -r dotenv/config scripts/update-admin-password.js
 *
 * Old: username=admin, password=admin123
 * New: username=admin, password=admin
 */

import mongoose from "mongoose";
import { Admin } from "../src/models/admin.model.js";
import { connectDB } from "../src/db/index.js";

const OLD_USERNAME = "admin";
const OLD_PASSWORD = "admin123";
const NEW_PASSWORD = "admin";

async function updateAdminPassword() {
  try {
    await connectDB();

    const admin = await Admin.findOne({ username: OLD_USERNAME });
    if (!admin) {
      console.error("❌ Admin user with username 'admin' not found.");
      process.exit(1);
    }

    const isOldPasswordCorrect = await admin.isPasswordCorrect(OLD_PASSWORD);
    if (!isOldPasswordCorrect) {
      console.error("❌ Old password is incorrect. Please verify the current password.");
      process.exit(1);
    }

    admin.password = NEW_PASSWORD;
    await admin.save();

    console.log("✅ Super admin password updated successfully!");
    console.log("   Username: admin");
    console.log("   New password: admin");
  } catch (error) {
    console.error("❌ Error updating password:", error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log("Database connection closed.");
    process.exit(0);
  }
}

updateAdminPassword();
