import { Router, type IRouter } from "express";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import { z } from "zod";
import { HubUser } from "../db/models/hub-user.js";
import { PasswordResetRequest } from "../db/models/password-reset-request.js";
import { MasterAdminSettings } from "../db/models/master-admin-settings.js";
import { MasterAdminPasswordReset } from "../db/models/master-admin-password-reset.js";
import { SubHub } from "../db/models/sub-hub.js";
import { SuperHub } from "../db/models/super-hub.js";
import { requireAuth, requireMasterAdmin, type AuthenticatedRequest } from "../middlewares/auth.js";

const router: IRouter = Router();

const LEGACY_ADMIN_EMAIL = "admin@fishtokri.com";
const LEGACY_ADMIN_PASSWORD = "FishTokri@Admin2024";
const JWT_SECRET = process.env.SESSION_SECRET;

if (!JWT_SECRET) {
  throw new Error("SESSION_SECRET must be set.");
}

const loginSchema = z.object({
  email: z.string().min(1),
  password: z.string().min(1),
  loginRole: z.enum(["master_admin", "super_hub", "sub_hub", "delivery_person"]).optional(),
});

async function getMasterAdminSettings() {
  let settings = await MasterAdminSettings.findOne({ key: "primary" });
  if (!settings) {
    const email = (process.env.MASTER_ADMIN_EMAIL || LEGACY_ADMIN_EMAIL).trim().toLowerCase();
    const password = process.env.MASTER_ADMIN_PASSWORD || LEGACY_ADMIN_PASSWORD;
    settings = await MasterAdminSettings.create({
      key: "primary",
      name: "Master Admin",
      email,
      recoveryEmail: (process.env.MASTER_ADMIN_RECOVERY_EMAIL || email).trim().toLowerCase(),
      passwordHash: await bcrypt.hash(password, 12),
    });
  }
  return settings;
}

function publicSettings(settings: any) {
  return {
    name: settings.name,
    email: settings.email,
    recoveryEmail: settings.recoveryEmail,
    mailConfigured: Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM),
  };
}

async function getPrimaryHub() {
  const hub = await SubHub.findOne({ status: "Active" }).sort({ createdAt: 1 });
  if (!hub) return null;
  const parent = await SuperHub.findById(hub.superHubId);
  return { hub, parent };
}

function hashResetToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function getMailTransport() {
  const host = process.env.SMTP_HOST;
  const from = process.env.SMTP_FROM;
  if (!host || !from) return null;
  const port = Number(process.env.SMTP_PORT || 587);
  return {
    from,
    transporter: nodemailer.createTransport({
      host,
      port,
      secure: String(process.env.SMTP_SECURE || "").toLowerCase() === "true" || port === 465,
      auth: process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    }),
  };
}

function getAppBaseUrl(req: any) {
  return String(process.env.PUBLIC_APP_URL || `${req.protocol}://${req.get("host")}`).replace(/\/$/, "");
}

async function sendMasterAdminResetEmail(req: any, settings: any) {
  const mail = getMailTransport();
  if (!mail) throw new Error("SMTP is not configured. Add SMTP_HOST and SMTP_FROM in Replit Secrets.");

  const token = crypto.randomBytes(32).toString("hex");
  await MasterAdminPasswordReset.deleteMany({
    $or: [{ expiresAt: { $lte: new Date() } }, { usedAt: { $ne: null } }],
  });
  await MasterAdminPasswordReset.create({
    tokenHash: hashResetToken(token),
    expiresAt: new Date(Date.now() + 30 * 60 * 1000),
  });

  const resetUrl = `${getAppBaseUrl(req)}/reset-admin-password?token=${encodeURIComponent(token)}`;
  await mail.transporter.sendMail({
    from: mail.from,
    to: settings.recoveryEmail,
    subject: "FishTokri Master Admin password reset",
    text: [
      `Hello ${settings.name || "Master Admin"},`,
      "",
      "A password reset was requested for your FishTokri Master Admin account.",
      `Reset your password within 30 minutes: ${resetUrl}`,
      "",
      "If you did not request this, you can ignore this email.",
    ].join("\n"),
    html: `<p>Hello ${settings.name || "Master Admin"},</p><p>A password reset was requested for your FishTokri Master Admin account.</p><p><a href="${resetUrl}">Reset your password</a> (valid for 30 minutes)</p><p>If you did not request this, you can ignore this email.</p>`,
  });
}

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "ValidationError", message: "Email and password are required" });
    return;
  }

  const { email, password, loginRole } = parsed.data;

  if (loginRole && loginRole !== "master_admin") {
    res.status(403).json({ error: "Forbidden", message: "Only Master Admin login is available." });
    return;
  }

  if (!loginRole || loginRole === "master_admin") {
    try {
      const settings = await getMasterAdminSettings();
      const validPassword = await bcrypt.compare(password, settings.passwordHash);
      if (email.trim().toLowerCase() !== settings.email || !validPassword) {
        res.status(401).json({ error: "Unauthorized", message: "Invalid email or password" });
        return;
      }
      const admin = { id: "master-admin-1", email: settings.email, name: settings.name, role: "master_admin" };
      const token = jwt.sign({ adminId: admin.id, email: admin.email, role: admin.role }, JWT_SECRET, { expiresIn: "7d" });
      res.json({ token, admin });
    } catch {
      res.status(500).json({ error: "InternalError", message: "Could not load master admin account" });
    }
    return;
  }

  res.status(403).json({ error: "Forbidden", message: "Only Master Admin login is available." });
});

// ─── Master Admin Settings ──────────────────────────────────────────
router.get("/master-admin/settings", requireAuth as any, requireMasterAdmin as any, async (_req, res) => {
  try {
    const settings = await getMasterAdminSettings();
    const primaryHub = await getPrimaryHub();
    res.json({
      settings: {
        ...publicSettings(settings),
        hub: primaryHub
          ? {
              id: String(primaryHub.hub._id),
              name: primaryHub.hub.name,
              location: primaryHub.hub.location || "",
              superHubId: String(primaryHub.hub.superHubId),
              superHubName: primaryHub.parent?.name || "",
            }
          : null,
      },
    });
  } catch {
    res.status(500).json({ error: "InternalError", message: "Could not load settings" });
  }
});

const settingsSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(200),
  recoveryEmail: z.string().trim().email().max(200),
  hubName: z.string().trim().min(1).max(100),
  currentPassword: z.string().min(1).max(200),
});

router.put("/master-admin/settings", requireAuth as any, requireMasterAdmin as any, async (req: AuthenticatedRequest, res) => {
  const parsed = settingsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "ValidationError", message: "Name, login email, recovery email, and current password are required." });
    return;
  }
  try {
    const settings = await getMasterAdminSettings();
    if (!(await bcrypt.compare(parsed.data.currentPassword, settings.passwordHash))) {
      res.status(401).json({ error: "Unauthorized", message: "Current password is incorrect." });
      return;
    }
    settings.name = parsed.data.name;
    settings.email = parsed.data.email.toLowerCase();
    settings.recoveryEmail = parsed.data.recoveryEmail.toLowerCase();
    await settings.save();
    const primaryHub = await getPrimaryHub();
    if (primaryHub) {
      primaryHub.hub.name = parsed.data.hubName;
      await primaryHub.hub.save();
      if (primaryHub.parent) {
        primaryHub.parent.name = parsed.data.hubName;
        await primaryHub.parent.save();
      }
    }
    const admin = { id: "master-admin-1", email: settings.email, name: settings.name, role: "master_admin" };
    const token = jwt.sign({ adminId: admin.id, email: admin.email, role: admin.role }, JWT_SECRET, { expiresIn: "7d" });
    res.json({
      settings: {
        ...publicSettings(settings),
        hub: primaryHub
          ? {
              id: String(primaryHub.hub._id),
              name: primaryHub.hub.name,
              location: primaryHub.hub.location || "",
              superHubId: String(primaryHub.hub.superHubId),
              superHubName: primaryHub.parent?.name || "",
            }
          : null,
      },
      token,
      admin,
    });
  } catch {
    res.status(500).json({ error: "InternalError", message: "Could not save settings" });
  }
});

router.post("/master-admin/send-password-reset", requireAuth as any, requireMasterAdmin as any, async (req, res) => {
  try {
    const settings = await getMasterAdminSettings();
    await sendMasterAdminResetEmail(req, settings);
    res.json({ ok: true, recoveryEmail: settings.recoveryEmail });
  } catch (err: any) {
    const message = err?.message || "Could not send reset email";
    res.status(message.startsWith("SMTP") ? 503 : 500).json({ error: "EmailError", message });
  }
});

const masterResetSchema = z.object({
  token: z.string().min(40).max(200),
  newPassword: z.string().min(8).max(200),
});

router.post("/master-admin/reset-password", async (req, res) => {
  const parsed = masterResetSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "ValidationError", message: "The reset link or new password is invalid." });
    return;
  }
  try {
    const reset = await MasterAdminPasswordReset.findOne({
      tokenHash: hashResetToken(parsed.data.token),
      usedAt: null,
      expiresAt: { $gt: new Date() },
    });
    if (!reset) {
      res.status(400).json({ error: "InvalidToken", message: "This reset link is invalid or has expired." });
      return;
    }
    const settings = await getMasterAdminSettings();
    settings.passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
    await settings.save();
    reset.usedAt = new Date();
    await reset.save();
    await MasterAdminPasswordReset.deleteMany({ _id: { $ne: reset._id } });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "InternalError", message: "Could not reset password" });
  }
});

// ─── Forgot Password ────────────────────────────────────────────────
const forgotSchema = z.object({
  email: z.string().email().max(200),
  note: z.string().max(500).optional(),
});

router.post("/forgot-password", async (req, res) => {
  const parsed = forgotSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "ValidationError", message: "A valid email is required" });
    return;
  }
  const email = parsed.data.email.toLowerCase().trim();
  const note = parsed.data.note?.trim() || "";

  try {
    const masterSettings = await getMasterAdminSettings();
    if (email === masterSettings.email) {
      try {
        await sendMasterAdminResetEmail(req, masterSettings);
      } catch {
        // Keep this response generic so the endpoint does not reveal account state.
      }
      res.json({ ok: true, message: "If the account exists, reset instructions have been sent." });
      return;
    }

    const user = await HubUser.findOne({ email });

    // Always return generic success (no email enumeration), but only create
    // a request when a real user exists.
    if (user) {
      // Avoid duplicating an existing pending request for the same email.
      const existing = await PasswordResetRequest.findOne({ email, status: "pending" });
      if (!existing) {
        await PasswordResetRequest.create({
          email,
          hubUserId: user._id,
          name: user.name || "",
          role: user.role || "",
          note,
          status: "pending",
        });
      } else if (note) {
        existing.note = note;
        await existing.save();
      }
    }

    res.json({ ok: true, message: "If the account exists, your administrator has been notified." });
  } catch {
    res.status(500).json({ error: "InternalError", message: "Could not submit request" });
  }
});

// ─── Master-Admin Password Reset Inbox ─────────────────────────────
router.get("/password-reset-requests", requireAuth as any, requireMasterAdmin as any, async (_req, res) => {
  try {
    const requests = await PasswordResetRequest.find({}).sort({ createdAt: -1 }).limit(200).lean();
    res.json({
      requests: requests.map((r: any) => ({
        id: String(r._id),
        email: r.email,
        name: r.name || "",
        role: r.role || "",
        note: r.note || "",
        status: r.status,
        createdAt: r.createdAt,
        resolvedAt: r.resolvedAt,
        resolvedByEmail: r.resolvedByEmail || "",
      })),
    });
  } catch {
    res.status(500).json({ error: "InternalError", message: "Could not load requests" });
  }
});

const resolveSchema = z.object({
  newPassword: z.string().min(6).max(200),
});

router.post(
  "/password-reset-requests/:id/resolve",
  requireAuth as any,
  requireMasterAdmin as any,
  async (req: AuthenticatedRequest, res) => {
    const parsed = resolveSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "ValidationError", message: "Password must be at least 6 characters" });
      return;
    }
    try {
      const request = await PasswordResetRequest.findById(req.params.id);
      if (!request) {
        res.status(404).json({ error: "NotFound", message: "Request not found" });
        return;
      }
      const user = await HubUser.findOne({ email: request.email });
      if (!user) {
        res.status(404).json({ error: "NotFound", message: "User no longer exists" });
        return;
      }
      user.password = await bcrypt.hash(parsed.data.newPassword, 10);
      await user.save();
      request.status = "resolved";
      request.resolvedAt = new Date();
      request.resolvedByEmail = req.admin?.email || "";
      await request.save();
      res.json({ ok: true });
    } catch {
      res.status(500).json({ error: "InternalError", message: "Could not reset password" });
    }
  }
);

router.post(
  "/password-reset-requests/:id/reject",
  requireAuth as any,
  requireMasterAdmin as any,
  async (req: AuthenticatedRequest, res) => {
    try {
      const request = await PasswordResetRequest.findById(req.params.id);
      if (!request) {
        res.status(404).json({ error: "NotFound", message: "Request not found" });
        return;
      }
      request.status = "rejected";
      request.resolvedAt = new Date();
      request.resolvedByEmail = req.admin?.email || "";
      await request.save();
      res.json({ ok: true });
    } catch {
      res.status(500).json({ error: "InternalError", message: "Could not update request" });
    }
  }
);

router.delete(
  "/password-reset-requests/:id",
  requireAuth as any,
  requireMasterAdmin as any,
  async (req, res) => {
    try {
      await PasswordResetRequest.findByIdAndDelete(req.params.id);
      res.json({ ok: true });
    } catch {
      res.status(500).json({ error: "InternalError", message: "Could not delete request" });
    }
  }
);

export default router;
