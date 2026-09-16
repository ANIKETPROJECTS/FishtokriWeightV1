import { mongoose } from "../index.js";

const masterAdminPasswordResetSchema = new mongoose.Schema(
  {
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const MasterAdminPasswordReset =
  mongoose.models.MasterAdminPasswordReset ||
  mongoose.model("MasterAdminPasswordReset", masterAdminPasswordResetSchema, "master_admin_password_resets");