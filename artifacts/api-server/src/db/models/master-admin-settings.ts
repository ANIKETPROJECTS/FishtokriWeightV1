import { mongoose } from "../index.js";

const masterAdminSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, required: true, default: "primary" },
    name: { type: String, required: true, default: "Master Admin" },
    email: { type: String, required: true, lowercase: true, trim: true },
    recoveryEmail: { type: String, required: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
  },
  { timestamps: true }
);

export const MasterAdminSettings =
  mongoose.models.MasterAdminSettings ||
  mongoose.model("MasterAdminSettings", masterAdminSettingsSchema, "master_admin_settings");