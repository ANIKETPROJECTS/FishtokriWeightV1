import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Eye, EyeOff, Save, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEFAULT_INVOICE_HEADER, type InvoiceHeaderSettings } from "@/lib/invoice-header";

type WeighingMode = "manual" | "automated";

type Settings = {
  name: string;
  email: string;
  hub: { id: string; name: string; location: string; superHubName: string } | null;
  invoiceHeader: InvoiceHeaderSettings;
  weighingMode: WeighingMode;
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

function PasswordInput({
  value,
  onChange,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input
        type={visible ? "text" : "password"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="pr-10"
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-[#1A56DB]"
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const { toast } = useToast();
  const headerSlot = document.getElementById("page-header-slot");
  const [settings, setSettings] = useState<Settings | null>(null);
  const [form, setForm] = useState({
    hubName: "",
    name: "",
    email: "",
    currentPassword: "",
    newPassword: "",
    invoiceHeader: { ...DEFAULT_INVOICE_HEADER },
    weighingMode: "manual" as WeighingMode,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api("/api/auth/master-admin/settings")
      .then((data) => {
        const next = data.settings as Settings;
        setSettings(next);
        setForm((current) => ({
          ...current,
          hubName: next.hub?.name || "",
          name: next.name || "",
          email: next.email || "",
          invoiceHeader: { ...DEFAULT_INVOICE_HEADER, ...(next.invoiceHeader || {}) },
          weighingMode: next.weighingMode === "automated" ? "automated" : "manual",
        }));
      })
      .catch((error) => toast({ title: "Could not load Hub Settings", description: error.message, variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [toast]);

  const update = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const updateWeighingMode = (weighingMode: WeighingMode) => {
    setForm((current) => ({ ...current, weighingMode }));
  };

  const updateInvoiceHeader = (field: keyof InvoiceHeaderSettings, value: string) => {
    setForm((current) => ({
      ...current,
      invoiceHeader: { ...current.invoiceHeader, [field]: value },
    }));
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
      setForm((current) => ({ ...current, currentPassword: "", newPassword: "" }));
      if (data.token) localStorage.setItem("fishtokri_token", data.token);
      if (data.admin) localStorage.setItem("fishtokri_admin", JSON.stringify(data.admin));
      toast({ title: "Hub Settings saved", description: "Your hub and login details were updated." });
    } catch (error: any) {
      toast({ title: "Could not save Hub Settings", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {headerSlot && createPortal(
        <div className="min-w-0">
          <h1 className="text-sm font-bold text-white leading-tight">Hub Settings</h1>
          <p className="text-[11px] text-white/75 leading-tight hidden sm:block">Hub identity, POS weighing and access</p>
        </div>,
        headerSlot,
      )}

      <div>
        <h2 className="text-2xl font-bold text-[#162B4D]">Hub Settings</h2>
        <p className="text-gray-500 text-sm mt-1">Manage hub identity, POS weighing, invoice details and admin access.</p>
      </div>

      {loading ? (
        <div className="rounded-xl border border-gray-100 bg-white p-8 text-sm text-gray-500">Loading Hub Settings…</div>
      ) : (
        <form onSubmit={save} className="rounded-xl border border-gray-100 bg-white shadow-sm p-6 space-y-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1A56DB] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-[#162B4D]">Hub identity and login details</h3>
              <p className="text-sm text-gray-500">Enter your current password to save. The stored password is protected and cannot be displayed; use the new-password field to change it.</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Hub name</Label>
              <Input value={form.hubName} onChange={(e) => update("hubName", e.target.value)} disabled={saving} />
              <p className="text-xs text-gray-400">Updates the active hub label without changing its stored data.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Admin name</Label>
              <Input value={form.name} onChange={(e) => update("name", e.target.value)} disabled={saving} />
            </div>
            <div className="space-y-1.5">
              <Label>Login email</Label>
              <Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} disabled={saving} />
            </div>
            <div className="space-y-1.5">
              <Label>Current password</Label>
              <PasswordInput
                value={form.currentPassword}
                onChange={(value) => update("currentPassword", value)}
                placeholder="Enter current password"
                disabled={saving}
              />
            </div>
            <div className="space-y-1.5">
              <Label>New password</Label>
              <PasswordInput
                value={form.newPassword}
                onChange={(value) => update("newPassword", value)}
                placeholder="Leave blank to keep it unchanged"
                disabled={saving}
              />
              <p className="text-xs text-gray-400">Use at least 8 characters. The eye icon only reveals what you typed.</p>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-5">
            <fieldset>
              <legend className="font-semibold text-[#162B4D]">POS weighing mode</legend>
              <p className="mt-1 text-sm text-gray-500">Choose how the POS handles products sold by weight.</p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${form.weighingMode === "manual" ? "border-[#1A56DB] bg-blue-50" : "border-gray-200 bg-white hover:border-[#1A56DB]/50"}`}>
                  <input
                    type="radio"
                    name="weighingMode"
                    value="manual"
                    checked={form.weighingMode === "manual"}
                    onChange={() => updateWeighingMode("manual")}
                    disabled={saving}
                    className="mt-1 accent-[#1A56DB]"
                    data-testid="radio-weighing-mode-manual"
                  />
                  <span>
                    <span className="block font-semibold text-[#162B4D]">Manual weight entry</span>
                    <span className="mt-1 block text-sm text-gray-600">Show the POS weighing panel with kilogram and gram inputs.</span>
                  </span>
                </label>
                <label className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${form.weighingMode === "automated" ? "border-[#1A56DB] bg-blue-50" : "border-gray-200 bg-white hover:border-[#1A56DB]/50"}`}>
                  <input
                    type="radio"
                    name="weighingMode"
                    value="automated"
                    checked={form.weighingMode === "automated"}
                    onChange={() => updateWeighingMode("automated")}
                    disabled={saving}
                    className="mt-1 accent-[#1A56DB]"
                    data-testid="radio-weighing-mode-automated"
                  />
                  <span>
                    <span className="block font-semibold text-[#162B4D]">Automated machine</span>
                    <span className="mt-1 block text-sm text-gray-600">Hide manual weight inputs. The POS will show a connect-machine notice; machine integration is not active yet.</span>
                  </span>
                </label>
              </div>
            </fieldset>
          </div>

          <div className="border-t border-gray-100 pt-5 space-y-4">
            <div>
              <h3 className="font-semibold text-[#162B4D]">Invoice header details</h3>
              <p className="text-sm text-gray-500 mt-1">These details appear on the invoice preview and printed customer invoice. The contact number is also used in the invoice footer.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Business / company name</Label>
                <Input value={form.invoiceHeader.companyName} onChange={(e) => updateInvoiceHeader("companyName", e.target.value)} disabled={saving} required />
              </div>
              <div className="space-y-1.5">
                <Label>Address</Label>
                <Input value={form.invoiceHeader.address} onChange={(e) => updateInvoiceHeader("address", e.target.value)} disabled={saving} />
              </div>
              <div className="space-y-1.5">
                <Label>Contact number</Label>
                <Input value={form.invoiceHeader.phone} onChange={(e) => updateInvoiceHeader("phone", e.target.value)} disabled={saving} />
              </div>
              <div className="space-y-1.5">
                <Label>GST number</Label>
                <Input value={form.invoiceHeader.gstNumber} onChange={(e) => updateInvoiceHeader("gstNumber", e.target.value)} disabled={saving} />
              </div>
              <div className="space-y-1.5">
                <Label>FSSAI number</Label>
                <Input value={form.invoiceHeader.fssaiNumber} onChange={(e) => updateInvoiceHeader("fssaiNumber", e.target.value)} disabled={saving} />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={saving} className="bg-[#1A56DB] hover:bg-[#1447B4]">
              <Save className="w-4 h-4 mr-2" /> {saving ? "Saving…" : "Save Hub Settings"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}