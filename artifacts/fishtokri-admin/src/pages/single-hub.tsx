import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "wouter";
import { Building2, CheckCircle2, Package, RefreshCw, Settings2, Warehouse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

function getToken() {
  return localStorage.getItem("fishtokri_token") ?? "";
}

async function apiFetch(path: string, options: RequestInit = {}) {
  const base = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
  const res = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message ?? "Request failed");
  return data;
}

type Hub = {
  id: string;
  name: string;
  location?: string;
  status?: string;
  dbName?: string;
};

export default function SingleHub() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [hub, setHub] = useState<Hub | null>(null);
  const [loading, setLoading] = useState(true);
  const [settingUp, setSettingUp] = useState(false);

  const loadHub = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/api/sub-hubs");
      const hubs: Hub[] = data.subHubs ?? [];
      const selected = hubs.find((item) => item.name.toLowerCase().includes("thane")) ?? hubs[0] ?? null;
      setHub(selected);
    } catch (err: any) {
      toast({ title: "Failed to load Thane Hub", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadHub();
  }, [loadHub]);

  async function setupThaneHub() {
    setSettingUp(true);
    try {
      const superHubs = await apiFetch("/api/super-hubs");
      const existingParent = (superHubs.superHubs ?? []).find((item: Hub) =>
        item.name.toLowerCase().includes("thane"),
      );
      const parent = existingParent ?? (
        await apiFetch("/api/super-hubs", {
          method: "POST",
          body: JSON.stringify({ name: "Thane Hub", location: "Thane", status: "Active" }),
        })
      ).superHub;

      await apiFetch(`/api/super-hubs/${parent.id}/sub-hubs`, {
        method: "POST",
        body: JSON.stringify({ name: "Thane Hub", location: "Thane", status: "Active" }),
      });
      toast({ title: "Thane Hub is ready" });
      await loadHub();
    } catch (err: any) {
      toast({ title: "Could not set up Thane Hub", description: err.message, variant: "destructive" });
    } finally {
      setSettingUp(false);
    }
  }

  const headerSlot = document.getElementById("page-header-slot");
  const header = (
    <div className="flex items-center justify-between w-full min-w-0">
      <div className="min-w-0">
        <p className="text-sm font-bold text-[#162B4D] leading-tight">Thane Hub</p>
        <p className="text-[11px] text-gray-400 leading-tight hidden sm:block">Products and operations for this hub.</p>
      </div>
      {hub && (
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
          <CheckCircle2 className="w-4 h-4" />
          Active
        </div>
      )}
    </div>
  );

  return (
    <>
      {headerSlot && createPortal(header, headerSlot)}
      <div className="max-w-4xl space-y-5">
        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-14 text-center">
            <RefreshCw className="w-8 h-8 text-[#1A56DB] animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold text-[#162B4D]">Loading Thane Hub...</p>
          </div>
        ) : hub ? (
          <>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center">
                    <Warehouse className="w-7 h-7 text-[#1A56DB]" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-[#162B4D]">{hub.name}</h2>
                    <p className="text-sm text-gray-500">{hub.location || "Thane"} · Single operating hub</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Building2 className="w-4 h-4 text-[#1A56DB]" />
                  Hub operations
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button
                onClick={() => navigate(`/sub-hub-menu/${hub.id}`)}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-left hover:border-[#1A56DB]/40 transition-colors"
              >
                <Package className="w-6 h-6 text-[#1A56DB] mb-3" />
                <p className="font-bold text-[#162B4D]">Manage Products</p>
                <p className="text-sm text-gray-500 mt-1">Add and edit the products sold by Thane Hub.</p>
              </button>
              <button
                onClick={() => navigate("/inventory/products")}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-left hover:border-[#1A56DB]/40 transition-colors"
              >
                <Warehouse className="w-6 h-6 text-[#1A56DB] mb-3" />
                <p className="font-bold text-[#162B4D]">View Inventory</p>
                <p className="text-sm text-gray-500 mt-1">See current products, stock, batches, and expiry.</p>
              </button>
              <button
                onClick={() => navigate("/inventory/adjustment")}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-left hover:border-[#1A56DB]/40 transition-colors"
              >
                <Settings2 className="w-6 h-6 text-emerald-600 mb-3" />
                <p className="font-bold text-[#162B4D]">Stock Adjustments</p>
                <p className="text-sm text-gray-500 mt-1">Record cleaned weight and update usable stock.</p>
              </button>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
            <Warehouse className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <h2 className="text-base font-bold text-[#162B4D]">Set up Thane Hub</h2>
            <p className="text-sm text-gray-500 max-w-md mx-auto mt-2">
              This workspace is configured for one operating hub. Create the Thane Hub context to start adding products and managing inventory.
            </p>
            <Button onClick={setupThaneHub} disabled={settingUp} className="mt-5 bg-[#1A56DB] hover:bg-[#1447B4]">
              {settingUp ? "Setting up..." : "Set up Thane Hub"}
            </Button>
          </div>
        )}
      </div>
    </>
  );
}