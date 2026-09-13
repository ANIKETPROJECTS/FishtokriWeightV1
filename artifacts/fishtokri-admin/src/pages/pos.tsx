import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Banknote,
  Check,
  ChevronRight,
  CreditCard,
  Fish,
  Loader2,
  Minus,
  Plus,
  RefreshCw,
  Search,
  ShoppingBasket,
  Smartphone,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { apiFetch, formatRupees } from "@/lib/api";

type Product = {
  _id: string;
  name: string;
  category?: string | { _id?: string; name?: string };
  price: number;
  unit?: string;
  quantity: number;
  imageUrl?: string;
  status?: string;
  isArchived?: boolean;
};

type Category = { _id: string; name: string };
type Hub = { id: string; name: string };
type CartLine = Product & { cartQuantity: number };
type PaymentMode = "cash" | "upi" | "card";
type PricingBasis = {
  isWeightBased: boolean;
  basisGrams: number;
  label: string;
};

const coral = "#F05B4E";
const ink = "#162B4D";

function getCategoryId(product: Product) {
  if (typeof product.category === "object") return String(product.category?._id || "");
  return String(product.category || "");
}

function getCategoryName(product: Product, categories: Category[]) {
  if (typeof product.category === "object" && product.category?.name) return product.category.name;
  return categories.find((category) => String(category._id) === getCategoryId(product))?.name || String(product.category || "Fresh catch");
}

function getPricingBasis(unit?: string): PricingBasis {
  const normalized = String(unit || "").trim().toLowerCase();
  if (normalized.includes("kg")) return { isWeightBased: true, basisGrams: 1000, label: "kg" };
  const gramMatch = normalized.match(/(\d+(?:\.\d+)?)\s*g/);
  if (gramMatch) return { isWeightBased: true, basisGrams: Number(gramMatch[1]), label: `${gramMatch[1]}g` };
  return { isWeightBased: false, basisGrams: 1, label: normalized || "unit" };
}

function formatWeight(weightInKg: number) {
  const grams = Math.round((Number(weightInKg) || 0) * 1000);
  if (grams < 1000) return `${grams} g`;
  return `${formatQty(weightInKg)} kg`;
}

function productRateLabel(product: Product) {
  const basis = getPricingBasis(product.unit);
  return basis.isWeightBased ? `${formatRupees(Number(product.price) || 0)} / ${basis.label}` : `${formatRupees(Number(product.price) || 0)} / ${basis.label}`;
}

function lineTotal(line: CartLine) {
  const basis = getPricingBasis(line.unit);
  const price = Number(line.price) || 0;
  const quantity = Number(line.cartQuantity) || 0;
  return basis.isWeightBased ? price * quantity * (1000 / basis.basisGrams) : price * quantity;
}

function effectiveRatePerKg(line: CartLine) {
  const basis = getPricingBasis(line.unit);
  return basis.isWeightBased ? (Number(line.price) || 0) * (1000 / basis.basisGrams) : Number(line.price) || 0;
}

function productMatchesCategory(product: Product, selectedCategory: string, categories: Category[]) {
  if (selectedCategory === "all") return true;
  const selected = categories.find((category) => String(category._id) === selectedCategory);
  if (!selected) return false;
  const productCategory = getCategoryId(product).trim().toLowerCase();
  return productCategory === selectedCategory.trim().toLowerCase()
    || productCategory === selected.name.trim().toLowerCase()
    || getCategoryName(product, categories).trim().toLowerCase() === selected.name.trim().toLowerCase();
}

function formatQty(value: number) {
  return Number(value).toLocaleString("en-IN", { maximumFractionDigits: 3 });
}

function stockLabel(product: Product) {
  const basis = getPricingBasis(product.unit);
  return basis.isWeightBased
    ? `${formatWeight(Number(product.quantity) || 0)} available`
    : `${formatQty(Number(product.quantity) || 0)} ${product.unit || "units"} available`;
}

function PageSkeleton() {
  return (
    <div className="space-y-5 animate-pulse" data-testid="loading-pos">
      <div className="h-24 rounded-2xl bg-[#F3EDE7]" />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className="h-[620px] rounded-2xl bg-[#F3EDE7]" />
        <div className="h-[620px] rounded-2xl bg-[#F3EDE7]" />
      </div>
    </div>
  );
}

function EmptyProducts({ search, onClear }: { search: string; onClear: () => void }) {
  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#D8D1CA] bg-[#FFFCF9] px-6 text-center" data-testid="empty-pos-products">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFF0ED] text-[#D94A3D]">
        <Fish className="h-7 w-7" />
      </div>
      <h3 className="text-base font-semibold text-[#162B4D]">No catch matches that search</h3>
      <p className="mt-1 max-w-xs text-sm leading-6 text-[#68758A]">Try another fish name or switch back to all categories.</p>
      {search && (
        <button type="button" onClick={onClear} className="mt-4 rounded-lg px-3 py-2 text-sm font-semibold text-[#D94A3D] hover:bg-[#FFF0ED]" data-testid="button-clear-product-search">
          Clear search
        </button>
      )}
    </div>
  );
}

function PaymentButton({
  mode,
  selected,
  onSelect,
  icon: Icon,
  label,
}: {
  mode: PaymentMode;
  selected: boolean;
  onSelect: (mode: PaymentMode) => void;
  icon: typeof Banknote;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(mode)}
      className={`flex min-h-[68px] flex-1 flex-col items-center justify-center gap-1 rounded-xl border text-xs font-semibold transition-all active:scale-[0.98] ${
        selected ? "border-[#F05B4E] bg-[#FFF0ED] text-[#C94338] shadow-[0_0_0_2px_rgba(240,91,78,0.10)]" : "border-[#E3DDD6] bg-white text-[#647084] hover:border-[#F2ACA5] hover:bg-[#FFFCFA]"
      }`}
      data-testid={`button-payment-${mode}`}
      aria-pressed={selected}
    >
      <Icon className={`h-5 w-5 ${selected ? "text-[#F05B4E]" : "text-[#718096]"}`} />
      {label}
    </button>
  );
}

export default function POS() {
  const [hub, setHub] = useState<Hub | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("cash");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successReference, setSuccessReference] = useState("");

  const loadMenu = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const hubResponse = await apiFetch("/api/sub-hubs");
      const hubs = Array.isArray(hubResponse?.subHubs) ? hubResponse.subHubs : [];
      if (!hubs.length) throw new Error("No hub is available for this POS.");
      const firstHub = hubs[0];
      const [productResponse, categoryResponse] = await Promise.all([
        apiFetch(`/api/sub-hubs/${firstHub.id}/menu/products`),
        apiFetch(`/api/sub-hubs/${firstHub.id}/menu/categories`),
      ]);
      setHub({ id: String(firstHub.id), name: String(firstHub.name || "Thane Hub") });
      setProducts(Array.isArray(productResponse?.products) ? productResponse.products : []);
      setCategories(Array.isArray(categoryResponse?.categories) ? categoryResponse.categories : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the POS menu.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMenu();
  }, [loadMenu]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter((product) => {
      const active = product.status !== "unavailable" && !product.isArchived;
      const categoryMatch = productMatchesCategory(product, selectedCategory, categories);
      const searchMatch = !query || product.name.toLowerCase().includes(query) || getCategoryName(product, categories).toLowerCase().includes(query);
      return active && categoryMatch && searchMatch;
    });
  }, [categories, products, search, selectedCategory]);

  const subtotal = useMemo(
    () => cart.reduce((sum, line) => sum + lineTotal(line), 0),
    [cart],
  );

  const addProduct = (product: Product) => {
    const available = Number(product.quantity) || 0;
    if (available <= 0) return;
    setSubmitError("");
    setCart((current) => {
      const found = current.find((line) => line._id === product._id);
      if (found) {
        const step = getPricingBasis(product.unit).isWeightBased ? 0.05 : 1;
        return current.map((line) => line._id === product._id
          ? { ...line, cartQuantity: Math.min(available, line.cartQuantity + step) }
          : line);
      }
      const initialQuantity = getPricingBasis(product.unit).isWeightBased ? Math.min(0, available) : Math.min(1, available);
      return [...current, { ...product, cartQuantity: initialQuantity }];
    });
  };

  const updateQuantity = (id: string, nextValue: string) => {
    const line = cart.find((item) => item._id === id);
    if (!line) return;
    const parsed = Number(nextValue);
    if (!Number.isFinite(parsed)) return;
    const next = Math.min(Math.max(parsed, 0), Number(line.quantity) || 0);
    setCart((current) => current.map((item) => item._id === id ? { ...item, cartQuantity: next } : item));
  };

  const shiftQuantity = (line: CartLine, amount: number) => {
    const step = getPricingBasis(line.unit).isWeightBased ? 0.05 : 1;
    updateQuantity(line._id, String(Math.min(Number(line.quantity) || 0, Math.max(0, line.cartQuantity + amount * step))));
  };

  const submitSale = async () => {
    if (!hub || !customerName.trim() || cart.length === 0 || subtotal <= 0) return;
    setSubmitting(true);
    setSubmitError("");
    setSuccessReference("");
    try {
      const result = await apiFetch("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          customerName: customerName.trim(),
          phone: phone.trim(),
          items: cart.filter((line) => Number(line.cartQuantity) > 0).map((line) => ({
            productId: line._id,
            name: line.name,
            price: effectiveRatePerKg(line),
            quantity: Number(line.cartQuantity),
            unit: getPricingBasis(line.unit).isWeightBased ? "per kg" : (line.unit || ""),
          })),
          deliveryType: "takeaway",
          subHubId: hub.id,
          subHubName: hub.name,
          status: "takeaway",
          paymentStatus: "paid",
          paymentMode,
          paidAmount: subtotal,
          subtotal,
          discount: 0,
          total: subtotal,
          orderType: "normal",
        }),
      });
      const order = result?.order || result;
      setSuccessReference(String(order?.orderNumber || order?.orderId || order?._id || order?.id || "Sale recorded"));
      setCart([]);
      setCustomerName("");
      setPhone("");
      setPaymentMode("cash");
      void loadMenu();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Sale could not be completed. Check the stock and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <PageSkeleton />;

  if (error) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center" data-testid="error-pos">
        <div className="max-w-md rounded-2xl border border-[#F3C7C1] bg-[#FFF6F4] p-7 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-[#D94A3D]" />
          <h2 className="mt-3 text-lg font-semibold text-[#162B4D]">POS is not ready</h2>
          <p className="mt-2 text-sm leading-6 text-[#68758A]">{error}</p>
          <button type="button" onClick={() => void loadMenu()} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#162B4D] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#203B64]" data-testid="button-retry-pos">
            <RefreshCw className="h-4 w-4" /> Try again
          </button>
        </div>
      </div>
    );
  }

  const canSubmit = Boolean(hub && customerName.trim() && cart.length && subtotal > 0 && !submitting);

  return (
    <div className="min-h-full bg-[#FAF7F3] pb-3" data-testid="page-pos">
      <div className="mx-auto max-w-[1500px]">
        {successReference && (
          <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-[#BFE3CC] bg-[#F0FAF3] px-4 py-2.5 text-sm text-[#26734A]" role="status" data-testid="status-sale-success">
            <div className="flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#2B8A57] text-white"><Check className="h-4 w-4" /></span><span>Sale completed. Reference <strong>{successReference}</strong></span></div>
            <button type="button" onClick={() => setSuccessReference("")} className="rounded p-1 hover:bg-[#DDF1E4]" aria-label="Dismiss sale confirmation" data-testid="button-dismiss-sale-success"><X className="h-4 w-4" /></button>
          </div>
        )}

        <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="min-w-0 rounded-2xl border border-[#E9E0D8] bg-white p-3 shadow-[0_4px_18px_rgba(22,43,77,0.04)] sm:p-4" data-testid="section-menu">
            <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-base font-bold text-[#162B4D]">Today&apos;s menu</h2>
                <p className="mt-0.5 text-xs text-[#8B95A5]">{filteredProducts.length} available {filteredProducts.length === 1 ? "item" : "items"}</p>
              </div>
              <label className="relative block w-full lg:max-w-[270px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A0A9B7]" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search fish or category" className="h-10 w-full rounded-lg border border-[#E4DED7] bg-[#FFFCFA] pl-9 pr-3 text-sm text-[#162B4D] outline-none transition-colors placeholder:text-[#A6ADB8] focus:border-[#F05B4E] focus:ring-2 focus:ring-[#F05B4E]/10" data-testid="input-search-products" />
              </label>
            </div>

            <div className="mb-3 flex gap-2 overflow-x-auto pb-1" data-testid="list-product-categories">
              <button type="button" onClick={() => setSelectedCategory("all")} className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${selectedCategory === "all" ? "bg-[#162B4D] text-white" : "bg-[#F7F4F0] text-[#68758A] hover:bg-[#EEE9E3]"}`} data-testid="button-category-all">All catch</button>
              {categories.map((category) => (
                <button key={category._id} type="button" onClick={() => setSelectedCategory(String(category._id))} className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${selectedCategory === String(category._id) ? "bg-[#162B4D] text-white" : "bg-[#F7F4F0] text-[#68758A] hover:bg-[#EEE9E3]"}`} data-testid={`button-category-${category._id}`}>
                  {category.name}
                </button>
              ))}
            </div>

            {filteredProducts.length === 0 ? <EmptyProducts search={search} onClear={() => { setSearch(""); setSelectedCategory("all"); }} /> : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5" data-testid="grid-products">
                {filteredProducts.map((product) => {
                  const inCart = cart.find((line) => line._id === product._id);
                  const outOfStock = Number(product.quantity) <= 0;
                  return (
                    <button
                      type="button"
                      key={product._id}
                      onClick={() => addProduct(product)}
                      disabled={outOfStock}
                      className={`group relative overflow-hidden rounded-xl border bg-[#FFFCFA] text-left transition-all ${outOfStock ? "cursor-not-allowed border-[#E8E2DB] opacity-55" : "border-[#E8E2DB] hover:-translate-y-0.5 hover:border-[#F1A59D] hover:shadow-[0_8px_18px_rgba(240,91,78,0.10)] active:translate-y-0"} ${inCart ? "ring-2 ring-[#F05B4E]/30" : ""}`}
                      data-testid={`card-product-${product._id}`}
                    >
                      <div className="relative aspect-[1.5] overflow-hidden bg-[#F4EFEA]">
                        {product.imageUrl ? <img src={product.imageUrl} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" data-testid={`img-product-${product._id}`} /> : <div className="flex h-full items-center justify-center text-[#B3AAA0]"><Fish className="h-8 w-8" /></div>}
                        {inCart && <span className="absolute right-2 top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-[#F05B4E] px-1.5 text-[11px] font-bold text-white" data-testid={`badge-cart-product-${product._id}`}>{getPricingBasis(product.unit).isWeightBased ? formatWeight(inCart.cartQuantity) : formatQty(inCart.cartQuantity)}</span>}
                      </div>
                      <div className="p-3">
                        <p className="truncate text-sm font-semibold text-[#162B4D]">{product.name}</p>
                        <p className="mt-1 truncate text-[10px] font-medium uppercase tracking-wide text-[#9A8F84]">{getCategoryName(product, categories)}</p>
                        <div className="mt-3 flex items-end justify-between gap-1">
                          <div><p className="text-sm font-bold text-[#D94A3D]">{productRateLabel(product)}</p><p className="text-[10px] text-[#8B95A5]">rate basis</p></div>
                          <span className={`text-[10px] font-semibold ${outOfStock ? "text-[#B34A43]" : "text-[#6E7C70]"}`}>{outOfStock ? "Out of stock" : stockLabel(product)}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

           <aside className="sticky top-2 rounded-2xl border border-[#D7E0EE] bg-[#F8FAFD] shadow-[0_6px_24px_rgba(22,43,77,0.08)]" data-testid="section-sale">
             <div className="border-b border-[#E4EAF2] px-4 py-3">
              <div className="flex items-center justify-between"><div><h2 className="text-base font-bold text-[#162B4D]">Current sale</h2><p className="mt-0.5 text-xs text-[#7B8799]">{cart.length ? `${cart.length} line item${cart.length === 1 ? "" : "s"}` : "Add fish to begin"}</p></div><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#E8EEF8] text-[#364F9F]"><ShoppingBasket className="h-4 w-4" /></div></div>
            </div>

             <div className="max-h-[280px] overflow-y-auto px-4 py-2">
              {cart.length === 0 ? (
                 <div className="flex min-h-[112px] flex-col items-center justify-center text-center" data-testid="empty-pos-cart"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E9EEF7] text-[#70809A]"><Fish className="h-4 w-4" /></div><p className="mt-2 text-sm font-semibold text-[#51617A]">Your basket is empty</p><p className="mt-1 text-xs text-[#8A95A5]">Tap a menu item to add it here.</p></div>
              ) : cart.map((line) => {
                const basis = getPricingBasis(line.unit);
                const amount = lineTotal(line);
                return (
                <div key={line._id} className="border-b border-[#E8EDF3] py-3 last:border-0" data-testid={`row-cart-${line._id}`}>
                  <div className="flex items-start gap-2"><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-[#162B4D]">{line.name}</p><p className="mt-0.5 text-[11px] text-[#8A95A5]">{productRateLabel(line)}</p></div><p className="text-sm font-bold text-[#162B4D]">{formatRupees(amount)}</p><button type="button" onClick={() => setCart((current) => current.filter((item) => item._id !== line._id))} className="rounded p-1 text-[#A1AAB7] hover:bg-[#FFF0ED] hover:text-[#D94A3D]" aria-label={`Remove ${line.name}`} data-testid={`button-remove-cart-${line._id}`}><Trash2 className="h-3.5 w-3.5" /></button></div>
                  <div className="mt-2 flex items-center justify-between"><span className="text-[10px] font-semibold uppercase tracking-wide text-[#9A8F84]">{basis.isWeightBased ? "Weight from scale" : "Quantity"}</span><div className="flex items-center gap-1.5"><button type="button" onClick={() => shiftQuantity(line, -1)} className="flex h-7 w-7 items-center justify-center rounded-md border border-[#D8E0EA] bg-white text-[#52627A] hover:border-[#F1A59D] hover:text-[#D94A3D]" aria-label={`Decrease ${line.name}`} data-testid={`button-decrease-cart-${line._id}`}><Minus className="h-3 w-3" /></button><input type="number" min="0" max={line.quantity} step={basis.isWeightBased ? "0.001" : "1"} value={line.cartQuantity} onChange={(event) => updateQuantity(line._id, event.target.value)} className="h-7 w-[78px] rounded-md border border-[#D8E0EA] bg-white px-2 text-center text-xs font-bold text-[#162B4D] outline-none focus:border-[#F05B4E]" aria-label={`${basis.isWeightBased ? "Weight in kilograms" : "Quantity"} for ${line.name}`} data-testid={`input-quantity-${line._id}`} /><button type="button" onClick={() => shiftQuantity(line, 1)} disabled={line.cartQuantity >= Number(line.quantity)} className="flex h-7 w-7 items-center justify-center rounded-md border border-[#D8E0EA] bg-white text-[#52627A] hover:border-[#F1A59D] hover:text-[#D94A3D] disabled:cursor-not-allowed disabled:opacity-40" aria-label={`Increase ${line.name}`} data-testid={`button-increase-cart-${line._id}`}><Plus className="h-3 w-3" /></button><span className="w-8 text-[10px] text-[#7E8998]">{basis.isWeightBased ? "kg" : line.unit || "unit"}</span></div></div>
                  {basis.isWeightBased && <p className="mt-1 text-[10px] text-[#7E8998]">{line.cartQuantity > 0 ? `${formatWeight(line.cartQuantity)} · ${formatRupees(amount)}` : "Waiting for weight from scale"}</p>}
                </div>
                );
              })}
            </div>

             <div className="border-t border-[#E4EAF2] px-4 py-3">
               <div className="mb-3 space-y-1.5 text-sm"><div className="flex justify-between text-[#718096]"><span>Subtotal</span><span className="font-semibold text-[#3B4B63]" data-testid="text-pos-subtotal">{formatRupees(subtotal)}</span></div><div className="flex justify-between text-[#718096]"><span>Discount</span><span className="font-semibold text-[#3B4B63]">₹0.00</span></div><div className="flex items-end justify-between border-t border-dashed border-[#D8E0EA] pt-2"><span className="text-xs font-bold uppercase tracking-[0.14em] text-[#51617A]">Total due</span><span className="text-xl font-bold tracking-tight text-[#162B4D]" data-testid="text-pos-total">{formatRupees(subtotal)}</span></div></div>

              <div className="space-y-2">
                <div><label htmlFor="pos-customer-name" className="mb-1.5 block text-xs font-bold text-[#51617A]">Customer name <span className="text-[#D94A3D]">*</span></label><div className="relative"><UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98A4B4]" /><input id="pos-customer-name" value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Enter customer name" className="h-10 w-full rounded-lg border border-[#D8E0EA] bg-white pl-9 pr-3 text-sm text-[#162B4D] outline-none placeholder:text-[#A4AFBC] focus:border-[#F05B4E] focus:ring-2 focus:ring-[#F05B4E]/10" data-testid="input-customer-name" /></div></div>
                <div><label htmlFor="pos-customer-phone" className="mb-1.5 block text-xs font-bold text-[#51617A]">Phone <span className="font-normal text-[#A0A9B7]">optional</span></label><input id="pos-customer-phone" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="10-digit mobile number" inputMode="tel" className="h-10 w-full rounded-lg border border-[#D8E0EA] bg-white px-3 text-sm text-[#162B4D] outline-none placeholder:text-[#A4AFBC] focus:border-[#F05B4E] focus:ring-2 focus:ring-[#F05B4E]/10" data-testid="input-customer-phone" /></div>
                <div><p className="mb-1.5 text-xs font-bold text-[#51617A]">Payment method</p><div className="flex gap-2"><PaymentButton mode="cash" selected={paymentMode === "cash"} onSelect={setPaymentMode} icon={Banknote} label="Cash" /><PaymentButton mode="upi" selected={paymentMode === "upi"} onSelect={setPaymentMode} icon={Smartphone} label="UPI" /><PaymentButton mode="card" selected={paymentMode === "card"} onSelect={setPaymentMode} icon={CreditCard} label="Card" /></div></div>
              </div>

              {submitError && <div className="mt-3 flex gap-2 rounded-lg border border-[#F2C2BC] bg-[#FFF4F2] px-3 py-2.5 text-xs leading-5 text-[#B8443B]" role="alert" data-testid="status-sale-error"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> <span>{submitError}</span></div>}
              <button type="button" onClick={() => void submitSale()} disabled={!canSubmit} className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#F05B4E] text-sm font-bold text-white shadow-[0_6px_12px_rgba(240,91,78,0.22)] transition-all hover:bg-[#D94A3D] active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-[#D7DDE5] disabled:text-[#8A95A5] disabled:shadow-none" data-testid="button-complete-sale">
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Completing sale</> : <>Complete takeaway sale <ChevronRight className="h-4 w-4" /></>}
              </button>
              {cart.length > 0 && !customerName.trim() && <p className="mt-2 text-center text-[11px] text-[#A25952]" data-testid="text-name-required">Customer name is required to complete the sale.</p>}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}