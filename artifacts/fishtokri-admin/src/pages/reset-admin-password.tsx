import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { CheckCircle2, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

function getBase() {
  return import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
}

export default function ResetAdminPassword() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const token = useMemo(() => new URLSearchParams(window.location.search).get("token") || "", []);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 8) {
      toast({ title: "Password too short", description: "Use at least 8 characters.", variant: "destructive" });
      return;
    }
    if (password !== confirm) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`${getBase()}/api/auth/master-admin/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.message || "Could not reset password");
      setDone(true);
    } catch (error: any) {
      toast({ title: "Could not reset password", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F6FA] flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white shadow-sm p-7">
        {done ? (
          <div className="text-center space-y-4">
            <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-600" />
            <h1 className="text-xl font-bold text-[#162B4D]">Password updated</h1>
            <p className="text-sm text-gray-500">Your Master Admin password has been changed.</p>
            <Button onClick={() => setLocation("/login")} className="bg-[#1A56DB] hover:bg-[#1447B4]">Go to login</Button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1A56DB] flex items-center justify-center">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#162B4D]">Reset password</h1>
                <p className="text-sm text-gray-500">Create a new Master Admin password.</p>
              </div>
            </div>
            <form onSubmit={submit} className="space-y-4">
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password" disabled={!token || saving} />
              <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirm new password" disabled={!token || saving} />
              <Button type="submit" className="w-full bg-[#1A56DB] hover:bg-[#1447B4]" disabled={!token || saving}>
                {saving ? "Updating…" : "Update password"}
              </Button>
            </form>
            {!token && <p className="text-sm text-red-600 mt-4">This reset link is missing its token.</p>}
            <Link href="/login" className="block text-center text-sm text-gray-500 hover:text-[#1A56DB] mt-5">Back to login</Link>
          </>
        )}
      </div>
    </div>
  );
}