import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "wouter";
import { Clock, Package, RefreshCw, Settings2, ShoppingBag, TrendingUp, Warehouse } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

type DailySales = { date: string; sales: number; orders: number };

function getToken() {
  return localStorage.getItem("fishtokri_token") || "";
}

function getBase() {
  return import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
}

async function apiFetch(path: string) {
  const res = await fetch(`${getBase()}${path}`, {
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error(res.statusText);
  return res.json();
}

function formatRupees(value: number) {
  return `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  color,
  background,
  loading,
}: {
  title: string;
  value: string | number;
  description: string;
  icon: typeof ShoppingBag;
  color: string;
  background: string;
  loading: boolean;
}) {
  if (loading) return <Skeleton className="h-32 rounded-2xl" />;

  return (
    <div className="flex min-h-32 items-start gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${background}`}>
        <Icon className={`h-5 w-5 ${color}`} />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-extrabold leading-tight text-[#162B4D]">{value}</p>
        <p className="mt-1 text-sm font-semibold text-gray-600">{title}</p>
        <p className="mt-0.5 text-xs text-gray-400">{description}</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [, navigate] = useLocation();
  const [loading, setLoading] = useState(true);
  const [orderStats, setOrderStats] = useState<Record<string, number>>({});
  const [todayPosOrders, setTodayPosOrders] = useState(0);
  const [todayPosSales, setTodayPosSales] = useState(0);
  const [activePreorders, setActivePreorders] = useState(0);
  const [weeklyPosSales, setWeeklyPosSales] = useState<DailySales[]>([]);
  const [operatingHub, setOperatingHub] = useState<any | null>(null);

  const loadDashboard = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [ordersResult, hubsResult] = await Promise.allSettled([
        apiFetch("/api/orders/stats"),
        apiFetch("/api/sub-hubs"),
      ]);

      if (ordersResult.status === "fulfilled") {
        const orders = ordersResult.value;
        setOrderStats(orders.stats ?? {});
        setTodayPosOrders(Number(orders.todayPosSales ?? 0));
        setTodayPosSales(Number(orders.todayPosSalesAmount ?? 0));
        setActivePreorders(Number(orders.activePreorderSales ?? 0));
        setWeeklyPosSales(Array.isArray(orders.weeklyPosSales) ? orders.weeklyPosSales : []);
      }

      if (hubsResult.status === "fulfilled") {
        const subHubs = hubsResult.value.subHubs ?? [];
        setOperatingHub(
          subHubs.find((hub: any) => String(hub.name ?? "").toLowerCase().includes("thane")) ??
          subHubs[0] ??
          null,
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    const interval = setInterval(() => void loadDashboard(true), 30000);
    return () => clearInterval(interval);
  }, [loadDashboard]);

  const handleRefresh = () => void loadDashboard();
  const awaitingAction = Number(orderStats.pending ?? 0) + Number(orderStats.confirmed ?? 0);
  const chartSales = weeklyPosSales.map((day) => ({
    ...day,
    label: new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      timeZone: "Asia/Kolkata",
    }).format(new Date(`${day.date}T00:00:00+05:30`)),
  }));
  const hasWeeklySales = weeklyPosSales.some((day) => day.sales > 0);
  const headerSlot = document.getElementById("page-header-slot");

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      {headerSlot && createPortal(
        <div className="flex w-full min-w-0 items-center justify-between">
          <div className="min-w-0">
            <h1 className="text-sm font-bold leading-tight text-white">Dashboard</h1>
            <p className="hidden text-[11px] leading-tight text-white/75 sm:block">Today at a glance</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="h-8 flex-shrink-0 gap-1.5 border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>,
        headerSlot,
      )}

      <section>
        <div className="mb-3 flex items-center gap-1.5">
          <Warehouse className="h-3.5 w-3.5 text-[#1A56DB]" />
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500">Quick access</h2>
        </div>

        {loading && !operatingHub ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-36 rounded-2xl" />
            ))}
          </div>
        ) : operatingHub ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <button
              onClick={() => navigate(`/sub-hub-menu/${operatingHub.id}`)}
              className="rounded-2xl border border-gray-100 bg-white p-5 text-left shadow-sm transition-colors hover:border-[#1A56DB]/40"
            >
              <Package className="mb-3 h-6 w-6 text-[#1A56DB]" />
              <p className="font-bold text-[#162B4D]">Manage Products</p>
              <p className="mt-1 text-sm text-gray-500">Add products, prices, and availability.</p>
            </button>
            <button
              onClick={() => navigate("/inventory/products")}
              className="rounded-2xl border border-gray-100 bg-white p-5 text-left shadow-sm transition-colors hover:border-[#1A56DB]/40"
            >
              <Warehouse className="mb-3 h-6 w-6 text-[#1A56DB]" />
              <p className="font-bold text-[#162B4D]">View Inventory</p>
              <p className="mt-1 text-sm text-gray-500">Check current stock, batches, and expiry.</p>
            </button>
            <button
              onClick={() => navigate("/inventory/adjustment")}
              className="rounded-2xl border border-gray-100 bg-white p-5 text-left shadow-sm transition-colors hover:border-emerald-400"
            >
              <Settings2 className="mb-3 h-6 w-6 text-emerald-600" />
              <p className="font-bold text-[#162B4D]">Stock Adjustments</p>
              <p className="mt-1 text-sm text-gray-500">Receive, reduce, or correct stock.</p>
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-center">
            <p className="text-sm font-semibold text-[#162B4D]">No operating hub configured</p>
            <p className="mt-1 text-xs text-gray-500">Quick links will appear when a hub is available.</p>
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center gap-1.5">
          <ShoppingBag className="h-3.5 w-3.5 text-orange-500" />
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500">Today at a glance</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            loading={loading}
            title="Today's POS Sales"
            value={formatRupees(todayPosSales)}
            description="Total value of completed POS orders"
            icon={ShoppingBag}
            color="text-orange-600"
            background="bg-orange-50"
          />
          <StatCard
            loading={loading}
            title="Completed POS Orders"
            value={todayPosOrders}
            description="Today's takeaway orders"
            icon={Package}
            color="text-blue-600"
            background="bg-blue-50"
          />
          <StatCard
            loading={loading}
            title="Awaiting Action"
            value={awaitingAction}
            description="Pending or confirmed orders"
            icon={Clock}
            color="text-amber-600"
            background="bg-amber-50"
          />
          <StatCard
            loading={loading}
            title="Active Preorders"
            value={activePreorders}
            description="Scheduled for future pickup"
            icon={Clock}
            color="text-purple-600"
            background="bg-purple-50"
          />
        </div>
      </section>

      <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50">
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#162B4D]">Weekly POS Sales</h2>
            <p className="mt-0.5 text-xs text-gray-500">Completed POS sales by day · last 7 days</p>
          </div>
        </div>
        {loading ? (
          <Skeleton className="h-56 rounded-xl" />
        ) : hasWeeklySales ? (
          <div className="h-56 w-full" role="img" aria-label="Bar chart of completed POS sales for the last seven days">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartSales} margin={{ top: 6, right: 12, bottom: 0, left: 4 }}>
                <CartesianGrid vertical={false} stroke="#E8EDF5" strokeDasharray="3 3" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#6B7280", fontSize: 11 }} />
                <YAxis
                  width={58}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#6B7280", fontSize: 11 }}
                  tickFormatter={(value: number) => `₹${Number(value).toLocaleString("en-IN")}`}
                />
                <Tooltip
                  cursor={{ fill: "#F3F6FB" }}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.date ?? ""}
                  formatter={(value: number, _name: string, item: any) => [
                    `${formatRupees(Number(value))} · ${item?.payload?.orders ?? 0} orders`,
                    "Sales",
                  ]}
                  contentStyle={{ borderRadius: 12, borderColor: "#E8EDF5", fontSize: 12 }}
                />
                <Bar dataKey="sales" name="Sales" fill="#1A56DB" radius={[6, 6, 0, 0]} maxBarSize={42} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-40 items-center justify-center rounded-xl bg-gray-50 px-4 text-center text-sm text-gray-500">
            No completed POS sales recorded in the last 7 days.
          </div>
        )}
      </section>
    </div>
  );
}
