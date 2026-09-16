import { useState, useEffect, useCallback } from "react";
import {
  useGetStatsSummary,
  getGetStatsSummaryQueryKey,
  useGetSuperHubs,
  getGetSuperHubsQueryKey,
} from "@workspace/api-client-react";
import {
  Building2, MapPin, Users,
  CheckCircle2, ShoppingBag, Clock,
  XCircle, RefreshCw, Phone, User,
  ArrowRight,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  AreaChart, Area, CartesianGrid,
} from "recharts";

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function getToken() { return localStorage.getItem("fishtokri_token") || ""; }
function getBase() { return import.meta.env.BASE_URL?.replace(/\/$/, "") || ""; }

async function apiFetch(path: string) {
  const res = await fetch(`${getBase()}${path}`, {
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error(res.statusText);
  return res.json();
}

function formatRupees(n: number) {
  return `₹${Number(n || 0).toLocaleString("en-IN")}`;
}
function formatDate(d: any) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

// ─── COLORS ───────────────────────────────────────────────────────────────────
const HUB_COLORS   = ["#1A56DB", "#10B981", "#F59E0B", "#8B5CF6", "#EF4444"];

const ORDER_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; chart: string; icon: any }> = {
  pending:          { label: "Awaiting Action", color: "text-amber-600",  bg: "bg-amber-50 border-amber-200",  chart: "#F59E0B", icon: Clock },
  confirmed:        { label: "Confirmed",       color: "text-blue-600",   bg: "bg-blue-50 border-blue-200",    chart: "#1A56DB", icon: CheckCircle2 },
  out_for_delivery: { label: "Ready for Handover", color: "text-indigo-600", bg: "bg-indigo-50 border-indigo-200", chart: "#6366F1", icon: CheckCircle2 },
  delivered:        { label: "Handed Over",     color: "text-green-600",  bg: "bg-green-50 border-green-200",  chart: "#10B981", icon: CheckCircle2 },
  takeaway:         { label: "Today's Sale",    color: "text-orange-600", bg: "bg-orange-50 border-orange-200", chart: "#F97316", icon: ShoppingBag },
  cancelled:        { label: "Cancelled",       color: "text-red-500",    bg: "bg-red-50 border-red-200",      chart: "#EF4444", icon: XCircle },
};

// ─── CUSTOM TOOLTIP ───────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-100 shadow-xl rounded-xl px-3 py-2.5 text-xs">
        <p className="font-bold text-gray-700 mb-1.5">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} className="flex items-center gap-1.5 font-medium" style={{ color: p.color }}>
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            {p.name}: <span className="text-gray-800 font-bold">{p.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// ─── STAT CARD ────────────────────────────────────────────────────────────────
function StatCard({
  title, value, sub, icon: Icon, iconColor, iconBg, border, badge, badgeColor, loading,
}: {
  title: string; value: string | number; sub: string;
  icon: any; iconColor: string; iconBg: string; border: string;
  badge?: string; badgeColor?: string; loading?: boolean;
}) {
  if (loading) return <Skeleton className="h-[108px] rounded-2xl" />;
  return (
    <div className={`bg-white rounded-2xl border ${border} shadow-sm p-5 flex flex-col gap-3`}>
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        {badge && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeColor ?? "bg-green-50 text-green-600"}`}>
            {badge}
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-extrabold text-[#162B4D] leading-none">{value}</p>
        <p className="text-xs font-semibold text-gray-500 mt-1">{title}</p>
        <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>
      </div>
    </div>
  );
}

// ─── SECTION HEADER ───────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, iconColor, title, action, onAction }: any) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${iconColor}`} />
        <h3 className="text-sm font-bold text-[#162B4D]">{title}</h3>
      </div>
      {action && (
        <button onClick={onAction} className="flex items-center gap-1 text-[11px] font-semibold text-[#1A56DB] hover:text-[#1447B4] bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors">
          {action} <ArrowRight className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useGetStatsSummary(undefined, {
    query: { queryKey: getGetStatsSummaryQueryKey() },
  });
  const { data: superHubsData, isLoading: hubsLoading, refetch: refetchHubs } = useGetSuperHubs(undefined, {
    query: { queryKey: getGetSuperHubsQueryKey() },
  });

  const [orderStats, setOrderStats]           = useState<Record<string, number>>({});
  const [orderSummary, setOrderSummary]       = useState({ todayPosSales: 0, activePreorderSales: 0 });
  const [recentOrders, setRecentOrders]       = useState<any[]>([]);
  const [customers, setCustomers]             = useState<{ total: number }>({ total: 0 });
  const [extraLoading, setExtraLoading]       = useState(true);

  const loadExtra = useCallback(async (silent = false) => {
    if (!silent) setExtraLoading(true);
    try {
      const [oStats, oRecent, cust, vend, dp] = await Promise.allSettled([
        apiFetch("/api/orders/stats"),
        apiFetch("/api/orders?limit=6&sort=createdAt&order=desc"),
        apiFetch("/api/customers?limit=1"),
      ]);
      if (oStats.status === "fulfilled") {
        setOrderStats(oStats.value.stats ?? {});
        setOrderSummary({
          todayPosSales: Number(oStats.value.todayPosSales ?? 0),
          activePreorderSales: Number(oStats.value.activePreorderSales ?? 0),
        });
      }
      if (oRecent.status === "fulfilled")  setRecentOrders(oRecent.value.orders ?? []);
      if (cust.status === "fulfilled")     setCustomers({ total: cust.value.total ?? 0 });
    } finally { setExtraLoading(false); }
  }, []);

  useEffect(() => { loadExtra(); }, [loadExtra]);

  useEffect(() => {
    const id = setInterval(() => { loadExtra(true); refetchStats(); refetchHubs(); }, 5000);
    return () => clearInterval(id);
  }, [loadExtra, refetchStats, refetchHubs]);

  const handleRefresh = () => {
    refetchStats();
    refetchHubs();
    loadExtra();
  };

  const superHubs = superHubsData?.superHubs ?? [];
  const isLoading = statsLoading || hubsLoading;

  // ── Derived order data ───────────────────────────────────────────────────
  const totalOrders    = Object.values(orderStats).reduce((a, b) => a + b, 0);
  const activeOrders   = (orderStats.pending ?? 0) + (orderStats.confirmed ?? 0) + (orderStats.out_for_delivery ?? 0);
  const pendingOrders  = orderStats.pending ?? 0;

  const orderStatusPieData = Object.entries(ORDER_STATUS_CONFIG)
    .map(([key, cfg]) => ({ name: cfg.label, value: orderStats[key] ?? 0, color: cfg.chart }))
    .filter((d) => d.value > 0);

  const orderStatusBarData = Object.entries(ORDER_STATUS_CONFIG).map(([key, cfg]) => ({
    name: cfg.label.replace(" for ", "\nfor "),
    count: orderStats[key] ?? 0,
    color: cfg.chart,
  }));

  // ── Hub bar data ─────────────────────────────────────────────────────────
  const awaitingAction = (orderStats.pending ?? 0) + (orderStats.confirmed ?? 0);
  const itemsHandedOver = (orderStats.delivered ?? 0) + (orderStats.takeaway ?? 0);

  return (
    <div className="space-y-7 max-w-7xl mx-auto">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-[#162B4D]">Dashboard</h2>
          <p className="text-gray-400 text-sm mt-0.5">Overview of your hub operations</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} className="h-8 gap-1.5 text-gray-500">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>

      {/* ── Row 1: Network stats ─────────────────────────────────────────────── */}
      <div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
          <Building2 className="w-3 h-3" /> Network
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
          <StatCard loading={isLoading} title="Total Hubs" value={stats?.totalSubHubs ?? 0} sub={`${stats?.activeSubHubs ?? 0} active`} icon={Building2} iconColor="text-[#1A56DB]" iconBg="bg-blue-50" border="border-blue-100" badge={`${stats?.totalSubHubs ? Math.round((stats.activeSubHubs / stats.totalSubHubs) * 100) : 0}% active`} badgeColor="bg-blue-50 text-blue-600" />
          <StatCard loading={isLoading} title="Master Admin" value={1} sub="active system account" icon={Users} iconColor="text-amber-600" iconBg="bg-amber-50" border="border-amber-100" badge="100% active" badgeColor="bg-amber-50 text-amber-600" />
        </div>
      </div>

      {/* ── Row 2: Order + people stats ──────────────────────────────────────── */}
      <div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
          <ShoppingBag className="w-3 h-3" /> Operations
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard loading={extraLoading} title="Today's POS Sales" value={orderSummary.todayPosSales} sub="completed takeaway sales" icon={ShoppingBag} iconColor="text-orange-600" iconBg="bg-orange-50" border="border-orange-100" badge="FTS sales" badgeColor="bg-orange-50 text-orange-600" />
          <StatCard loading={extraLoading} title="Active Preorders" value={orderSummary.activePreorderSales} sub="future handovers" icon={Clock} iconColor="text-purple-600" iconBg="bg-purple-50" border="border-purple-100" badge="Future" badgeColor="bg-purple-50 text-purple-600" />
          <StatCard loading={extraLoading} title="Awaiting Action" value={awaitingAction} sub="orders needing staff action" icon={Clock} iconColor="text-amber-600" iconBg="bg-amber-50" border="border-amber-100" badge={`${pendingOrders} pending`} badgeColor={pendingOrders > 0 ? "bg-amber-50 text-amber-600" : "bg-gray-50 text-gray-400"} />
          <StatCard loading={extraLoading} title="Total Customers" value={customers.total} sub="registered accounts" icon={User} iconColor="text-sky-600" iconBg="bg-sky-50" border="border-sky-100" badge="Customers" badgeColor="bg-sky-50 text-sky-600" />
        </div>
      </div>

      {/* ── Row 3: Order breakdown + recent orders ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Order status bar chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <SectionHeader icon={ShoppingBag} iconColor="text-orange-500" title="Orders by Status" />
          {extraLoading ? (
            <Skeleton className="h-52 rounded-xl" />
          ) : totalOrders === 0 ? (
            <div className="h-52 flex flex-col items-center justify-center text-gray-300">
              <ShoppingBag className="w-10 h-10 mb-2" />
              <p className="text-sm font-medium">No orders yet</p>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={orderStatusBarData} barSize={28} margin={{ top: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} interval={0} />
                  <YAxis tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Orders" radius={[6, 6, 0, 0]}>
                    {orderStatusBarData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              {/* Mini legend */}
              <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-3">
                {orderStatusPieData.map((d) => (
                  <div key={d.name} className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
                    <span className="text-[10px] text-gray-500">{d.name}: <strong className="text-gray-700">{d.value}</strong></span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Recent orders table */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <SectionHeader icon={Clock} iconColor="text-[#1A56DB]" title="Recent Orders" action="View all" onAction={() => window.location.hash = "#/orders"} />
          {extraLoading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
          ) : recentOrders.length === 0 ? (
            <div className="h-52 flex flex-col items-center justify-center text-gray-300">
              <Clock className="w-10 h-10 mb-2" />
              <p className="text-sm font-medium">No recent orders</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentOrders.map((o) => {
                const cfg = ORDER_STATUS_CONFIG[o.status];
                const Icon = cfg?.icon ?? Clock;
                const total = (o.items ?? []).reduce((s: number, i: any) => s + Number(i.price || 0) * Number(i.quantity || 1), 0);
                return (
                  <div key={String(o._id)} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50/60 transition-colors">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${cfg?.bg ?? "bg-gray-50"}`}>
                      <Icon className={`w-4 h-4 ${cfg?.color ?? "text-gray-400"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-[#162B4D] truncate">{o.customerName}</p>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border flex-shrink-0 ${cfg?.bg ?? "bg-gray-50 border-gray-200"} ${cfg?.color ?? "text-gray-500"}`}>
                          {cfg?.label ?? o.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-gray-400 flex items-center gap-0.5"><Phone className="w-2.5 h-2.5" />{o.phone}</span>
                        <span className="text-[10px] text-gray-400">{o.orderType === "preorder" ? "Preorder" : "Today's Sale"}</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-[#162B4D]">{formatRupees(total)}</p>
                      <p className="text-[10px] text-gray-400">{formatDate(o.createdAt)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Order handover summary + Hub performance ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* POS order summary card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <SectionHeader icon={ShoppingBag} iconColor="text-indigo-500" title="POS Order Summary" />
          <div className="space-y-3">
            {[
              { key: "today-sales", label: "Today's POS Sales", icon: ShoppingBag, color: "text-orange-600", bg: "bg-orange-50", bar: "bg-orange-500", count: orderSummary.todayPosSales },
              { key: "preorders", label: "Active Preorders", icon: Clock, color: "text-purple-600", bg: "bg-purple-50", bar: "bg-purple-500", count: orderSummary.activePreorderSales },
              { key: "awaiting", label: "Awaiting Action", icon: Clock, color: "text-amber-600", bg: "bg-amber-50", bar: "bg-amber-400", count: awaitingAction },
              { key: "handed", label: "Items Handed Over", icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50", bar: "bg-green-500", count: itemsHandedOver },
              { key: "cancelled", label: "Cancelled", icon: XCircle, color: "text-red-500", bg: "bg-red-50", bar: "bg-red-400", count: orderStats.cancelled ?? 0 },
            ].map(({ key, label, icon: Icon, color, bg, bar, count }) => {
              const pct   = totalOrders > 0 ? Math.round((count / totalOrders) * 100) : 0;
              return (
                <div key={key} className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-3.5 h-3.5 ${color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-gray-700">{label}</span>
                      <span className={`text-xs font-bold ${color}`}>{count}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full ${bar} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-400 w-7 text-right">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Hub performance table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <SectionHeader icon={Building2} iconColor="text-[#1A56DB]" title="Hub Performance" />
          {hubsLoading ? (
            <Skeleton className="h-48 rounded-xl" />
          ) : superHubs.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-gray-300">
              <Building2 className="w-10 h-10 mb-2" />
              <p className="text-sm font-medium">No hubs yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {superHubs.map((hub, idx) => {
                return (
                  <div key={hub.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50/60 transition-colors">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-white text-sm" style={{ background: HUB_COLORS[idx % HUB_COLORS.length] }}>
                      {hub.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-[#162B4D] truncate">{hub.name}</p>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-2 flex-shrink-0 ${hub.status === "Active" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"}`}>
                          {hub.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        {hub.location && <span className="text-[10px] text-gray-400 flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{hub.location}</span>}
                        <span className="text-[10px] text-blue-600 font-semibold bg-blue-50 px-1.5 py-0.5 rounded-full">Hub</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
