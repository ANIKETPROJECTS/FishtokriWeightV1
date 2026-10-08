import { mongoose } from "../index.js";

const invoiceHeaderSchema = new mongoose.Schema(
  {
    companyName: { type: String, trim: true, default: "FISHTOKRI (ATHA FOODS Pvt Ltd)" },
    address: { type: String, trim: true, default: "Thane" },
    phone: { type: String, trim: true, default: "9220200100" },
    gstNumber: { type: String, trim: true, default: "27AAOCA7628P1ZT" },
    fssaiNumber: { type: String, trim: true, default: "21521066000481" },
  },
  { _id: false },
);

const masterAdminSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, required: true, default: "primary" },
    name: { type: String, required: true, default: "Master Admin" },
    email: { type: String, required: true, lowercase: true, trim: true },
    recoveryEmail: { type: String, required: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    invoiceHeader: { type: invoiceHeaderSchema, default: () => ({}) },
    weighingMode: { type: String, enum: ["manual", "automated"], default: "manual" },
  },
  { timestamps: true }
);

export const MasterAdminSettings =
  mongoose.models.MasterAdminSettings ||
  mongoose.model("MasterAdminSettings", masterAdminSettingsSchema, "master_admin_settings");