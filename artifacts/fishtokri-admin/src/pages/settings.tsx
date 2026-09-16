import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, CheckCircle2, KeyRound, Mail, Save, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import PasswordResetInbox from "@/components/password-reset-inbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Settings = {
  name: string;
  email: string;
  recoveryEmail: string;
  mailConfigured: boolean;
};

function getToken() {
  return localStorage.getItem("fishtokri_token") || "";
}

function getBase() {
  return import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
}

async function api(path: string, options: RequestInit = {}) {
  const response = await fetch(`${getBase()}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || "Request failed");
  return data;
}

export default function SettingsPage() {
  const { toast } = useToast();
  const headerSlot = document.getElementById("page-header-slot");
  const [settings, setSettings] = useState<Settings | null>(null);
  const [form, setForm] = useState({ name: "", email: "", recoveryEmail: "", currentPassword: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  useEffect(() => {
    api("/api/auth/master-admin/settings")
      .then((data) => {
        const next = data.settings as Settings;
        setSettings(next);
        setForm((current) => ({
          ...current,
          name: next.name || "",
          email: next.email || "",
          recoveryEmail: next.recoveryEmail || "",
        }));
      })
      .catch((error) => toast({ title: "Could not load settings", description: error.message, variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [toast]);

  const update = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const data = await api("/api/auth/master-admin/settings", {
        method: "PUT",
        body: JSON.stringify(form),
      });
      setSettings(data.settings);
      setForm((current) => ({ ...current, currentPassword: "" }));
      if (data.token) localStorage.setItem("fishtokri_token", data.token);
      if (data.admin) localStorage.setItem("fishtokri_admin", JSON.stringify(data.admin));
      toast({ title: "Settings saved", description: "Your Master Admin details were updated." });
    } catch (error: any) {
      toast({ title: "Could not save settings", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const sendReset = async () => {
    setSendingReset(true);
    try {
      const data = await api("/api/auth/master-admin/send-password-reset", { method: "POST" });
      toast({ title: "Reset email sent", description: `Instructions were sent to ${data.recoveryEmail}.` });
    } catch (error: any) {
      toast({ title: "Could not send reset email", description: error.message, variant: "destructive" });
    } finally {
      setSendingReset(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {headerSlot && createPortal(
        <div className="min-w-0">
          <h1 className="text-sm font-bold text-white leading-tight">Settings</h1>
          <p className="text-[11px] text-white/75 leading-tight hidden sm:block">Manage admin access and recovery</p>
        </div>,
        headerSlot,
      )}

      <div>
        <h2 className="text-2xl font-bold text-[#162B4D]">Master Admin Settings</h2>
        <p className="text-gray-500 text-sm mt-1">Update the login identity and the email address that receives password reset instructions.</p>
      </div>

      {loading ? (
        <div className="rounded-xl border border-gray-100 bg-white p-8 text-sm text-gray-500">Loading settings…</div>
      ) : (
        <>
          <form onSubmit={save} className="rounded-xl border border-gray-100 bg-white shadow-sm p-6 space-y-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1A56DB] flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-[#162B4D]">Admin login details</h3>
                <p className="text-sm text-gray-500">The password is never shown here. Use the reset email section below to change it.</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Admin name</Label>
                <Input value={form.name} onChange={(e) => update("name", e.target.value)} disabled={saving} />
              </div>
              <div className="space-y-1.5">
                <Label>Login email</Label>
                <Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} disabled={saving} />
              </div>
              <div className="space-y-1.5">
                <Label>Reset email</Label>
                <Input type="email" value={form.recoveryEmail} onChange={(e) => update("recoveryEmail", e.target.value)} disabled={saving} />
                <p className="text-xs text-gray-400">Password reset links are sent to this address.</p>
              </div>
              <div className="space-y-1.5">
                <Label>Current password</Label>
                <Input
                  type="password"
                  value={form.currentPassword}
                  onChange={(e) => update("currentPassword", e.target.value)}
                  placeholder="Required to save changes"
                  disabled={saving}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={saving} className="bg-[#1A56DB] hover:bg-[#1447B4]">
                <Save className="w-4 h-4 mr-2" /> {saving ? "Saving…" : "Save settings"}
              </Button>
            </div>
          </form>

          <section className="rounded-xl border border-gray-100 bg-white shadow-sm p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <KeyRound className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-[#162B4D]">Reset Master Admin password</h3>
                <p className="text-sm text-gray-500">Send a one-time password reset link that expires after 30 minutes.</p>
              </div>
            </div>
            <div className={`flex items-start gap-2 rounded-lg p-3 text-sm ${settings?.mailConfigured ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-800"}`}>
              {settings?.mailConfigured ? <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
              <span>
                {settings?.mailConfigured
                  ? <>Email delivery is configured. Reset links will be sent to <strong>{settings.recoveryEmail}</strong>.</>
                  : <>Email delivery is not configured yet. Add SMTP settings in Replit Secrets before sending a reset email.</>}
              </span>
            </div>
            <Button type="button" onClick={sendReset} disabled={sendingReset || !settings?.mailConfigured} variant="outline">
              <Mail className="w-4 h-4 mr-2" /> {sendingReset ? "Sending…" : "Send password reset email"}
            </Button>
          </section>

          <PasswordResetInbox />
        </>
      )}
    </div>
  );
}