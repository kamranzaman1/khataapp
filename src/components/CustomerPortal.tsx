import React, { useState, useEffect } from "react";
import { 
  BookOpen, Search, User, Phone, Calendar, ArrowLeft, 
  ShoppingCart, DollarSign, Printer, Coins, CheckCircle2, 
  Clock, X, Plus, Minus, ClipboardList, Key, ShoppingBag, ShieldAlert, Check
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Product, Order } from "../types";

interface CustomerPortalProps {
  onBackToAdminLogin: () => void;
}

export default function CustomerPortal({ onBackToAdminLogin }: CustomerPortalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [warningMessage, setWarningMessage] = useState("");
  
  // Authenticated states
  const [customer, setCustomer] = useState<any | null>(null);
  const [customerDetail, setCustomerDetail] = useState<any | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  
  // Navigation inside logged-in portal
  const [activeTab, setActiveTab] = useState<"statement" | "new-order" | "orders">("statement");

  // New Order states
  const [orderSearch, setOrderSearch] = useState("");
  const [selectedQuantities, setSelectedQuantities] = useState<{ [productId: string]: number }>({});
  const [orderNotes, setOrderNotes] = useState("");
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);

  // Auto-fill query parameter if present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const idParam = params.get("id") || params.get("customer");
    if (idParam) {
      setSearchQuery(idParam.trim());
    }
  }, []);

  // Fetch statement, products, and order history upon successful authentication
  const fetchPortalData = async (customerId: string) => {
    try {
      const [ledgerRes, productsRes, ordersRes] = await Promise.all([
        fetch(`/api/public/customer-ledger?query=${encodeURIComponent(customerId)}`),
        fetch("/api/products"),
        fetch(`/api/public/customer-orders?customer_id=${encodeURIComponent(customerId)}`)
      ]);

      if (ledgerRes.ok) {
        const ledgerData = await ledgerRes.json();
        setCustomerDetail(ledgerData);
      }
      if (productsRes.ok) {
        const productsData = await productsRes.json();
        setProducts(Array.isArray(productsData) ? productsData : []);
      }
      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        setOrders(Array.isArray(ordersData) ? ordersData : []);
      }
    } catch (err) {
      console.error("Error fetching portal data:", err);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setError("Please enter your unique ID or phone number.");
      return;
    }

    setLoading(true);
    setError("");
    setWarningMessage("");

    try {
      const res = await fetch("/api/public/customer-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery.trim(), pin: pin.trim() })
      });

      if (res.ok) {
        const data = await res.json();
        setCustomer(data.customer);
        if (data.warning === "no-pin") {
          setWarningMessage("No PIN password is set for your account. Ask the admin to configure a login PIN for secure access.");
        }
        await fetchPortalData(data.customer.id);
      } else {
        const errData = await res.json();
        setError(errData.error || "Incorrect login details or account not found.");
      }
    } catch (err: any) {
      setError("Server connection failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Compile chronological statement timeline
  const getCombinedTimeline = () => {
    if (!customerDetail) return [];
    const timeline: any[] = [];

    if (Array.isArray(customerDetail.transactions)) {
      customerDetail.transactions.forEach((t: any) => {
        timeline.push({
          id: t.id,
          type: "purchase",
          description: `Bought ${t.quantity} × ${t.product_name}`,
          amount: t.total_amount,
          date: t.date,
          rawItem: t
        });
      });
    }

    if (Array.isArray(customerDetail.payments)) {
      customerDetail.payments.forEach((p: any) => {
        timeline.push({
          id: p.id,
          type: "payment",
          description: `Payment Cleared (${p.account === "bank" ? "Bank Transfer" : "Cash Received"})`,
          amount: p.amount,
          date: p.date,
          rawItem: p
        });
      });
    }

    return timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const timeline = getCombinedTimeline();
  const lastPayment = customerDetail?.payments?.[0] || null;

  // Handle direct print
  const handlePrint = () => {
    window.print();
  };

  // Adjust quantity in booking cart
  const adjustQuantity = (productId: string, change: number) => {
    setSelectedQuantities(prev => {
      const current = prev[productId] || 0;
      const next = current + change;
      if (next <= 0) {
        const updated = { ...prev };
        delete updated[productId];
        return updated;
      }
      return { ...prev, [productId]: next };
    });
  };

  // Submit self-service order booking
  const handleBookOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;

    const itemsToSubmit = Object.entries(selectedQuantities).map(([productId, qty]) => {
      const product = products.find(p => p.id === productId);
      return {
        product_id: productId,
        product_name: product?.name || "Unknown Item",
        quantity: qty,
        price: product?.price || 0
      };
    });

    if (itemsToSubmit.length === 0) {
      alert("Please select at least one item with quantity.");
      return;
    }

    setOrderLoading(true);
    setOrderSuccess(null);

    try {
      const res = await fetch("/api/public/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: customer.id,
          items: itemsToSubmit,
          notes: orderNotes
        })
      });

      if (res.ok) {
        setSelectedQuantities({});
        setOrderNotes("");
        setOrderSuccess("Your order request has been submitted successfully! The admin has been notified. (آرڈر درج ہو گیا ہے)");
        await fetchPortalData(customer.id); // Reload data including orders history
        setTimeout(() => setOrderSuccess(null), 5000);
        setActiveTab("orders");
      } else {
        alert("Failed to submit order booking. Please try again.");
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong while booking the order.");
    } finally {
      setOrderLoading(false);
    }
  };

  // Calculate booking subtotal
  const getOrderTotalAmount = () => {
    return Object.entries(selectedQuantities).reduce<number>((acc, [prodId, val]) => {
      const qty = val as number;
      const prod = products.find(p => p.id === prodId);
      return acc + (prod?.price || 0) * qty;
    }, 0);
  };

  const bookingTotal = getOrderTotalAmount();

  // Filter product catalog in form
  const filteredProducts = products.filter(p => 
    !p.hideInPortal && p.name.toLowerCase().includes(orderSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#fcfbf9] flex flex-col items-center justify-center p-4 selection:bg-emerald-100 selection:text-emerald-900 font-sans print:bg-white print:p-0">
      
      <AnimatePresence mode="wait">
        {!customer ? (
          // --- SECURE LOGIN / CODE ENTRY FORM ---
          <motion.div 
            key="login-form"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="w-full max-w-md bg-white p-8 rounded-3xl border border-stone-200/60 shadow-xl flex flex-col print:hidden"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md mb-4 animate-pulse">
                <BookOpen size={28} />
              </div>
              <h2 className="text-2xl font-black text-stone-900 tracking-tight">Customer Portal</h2>
              <span className="text-sm font-bold text-emerald-600 block mt-0.5">کسٹمر آن لائن پورٹل</span>
              <p className="text-stone-500 text-xs mt-3 px-4">
                Enter your unique customer credentials to access your ledger, check outstanding balance, or book new orders.
              </p>
              <p className="text-stone-400 text-[11px] mt-1 font-semibold">
                اپنا کسٹمر لاگ ان کوڈ اور پن درج کریں
              </p>
            </div>

            <form onSubmit={handleLogin} className="mt-8 space-y-4">
              <div>
                <label className="block text-[11px] font-black text-stone-500 uppercase tracking-wider mb-1.5 flex justify-between">
                  <span>Unique Code / Phone</span>
                  <span className="text-emerald-600 font-bold font-sans">لاگ ان کوڈ / فون نمبر</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-stone-400 pointer-events-none">
                    <User size={16} />
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ASIF-001 or Phone"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl outline-none text-stone-900 font-mono text-sm font-bold placeholder:text-stone-300 focus:border-emerald-500 focus:bg-white transition-all shadow-inner"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black text-stone-500 uppercase tracking-wider mb-1.5 flex justify-between">
                  <span>PIN Password (Passcode)</span>
                  <span className="text-emerald-600 font-bold font-sans">لاگ ان پن کوڈ</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-stone-400 pointer-events-none">
                    <Key size={16} />
                  </span>
                  <input
                    type="password"
                    placeholder="e.g. 1234 (If configured)"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl outline-none text-stone-900 font-mono text-sm font-bold placeholder:text-stone-300 focus:border-emerald-500 focus:bg-white transition-all shadow-inner"
                  />
                </div>
              </div>

              {error && (
                <div className="bg-rose-50 border border-rose-100 text-rose-700 p-3.5 rounded-xl text-xs font-bold text-center">
                  ⚠️ {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:bg-stone-300 text-white font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>
                ) : (
                  <>
                    <Key size={14} />
                    <span>Secure Sign In / پورٹل کھولیں</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-stone-100 text-center">
              <button
                onClick={onBackToAdminLogin}
                className="text-xs text-stone-500 hover:text-stone-900 font-bold uppercase tracking-wider flex items-center justify-center gap-1 mx-auto cursor-pointer transition"
              >
                <ArrowLeft size={12} />
                <span>Admin Login Dashboard / ایڈمن لاگ ان</span>
              </button>
            </div>
          </motion.div>
        ) : (
          // --- FULL CUSTOMER INTEGRATED INTERACTIVE PORTAL ---
          <motion.div 
            key="portal-area"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="w-full max-w-2xl bg-white rounded-3xl border border-stone-200 shadow-xl p-5 md:p-8 space-y-6 print:border-none print:shadow-none print:p-0"
          >
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-stone-100 pb-4 gap-4 print:border-b-2 print:border-stone-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider">
                    Portal Active (آن لائن پورٹل)
                  </span>
                  <span className="text-xs text-stone-400 font-mono font-bold">ID: {customer.id}</span>
                </div>
                <h1 className="text-2xl font-black text-stone-950 mt-1">{customer.name}</h1>
                <p className="text-xs text-stone-400 font-mono mt-1 flex items-center gap-1.5 font-bold">
                  <Phone size={11} /> {customer.phone || "(No Phone registered)"}
                </p>
              </div>

              <div className="flex items-center gap-2 print:hidden">
                <button
                  onClick={handlePrint}
                  className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer size={13} />
                  <span>Print</span>
                </button>
                <button
                  onClick={() => {
                    setCustomer(null);
                    setCustomerDetail(null);
                    setPin("");
                  }}
                  className="px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft size={13} />
                  <span>Exit / لاگ آؤٹ</span>
                </button>
              </div>
            </div>

            {/* Warning Message Banner */}
            {warningMessage && (
              <div className="bg-amber-50 border border-amber-100 text-amber-800 px-4 py-3 rounded-2xl flex items-start gap-2.5 text-xs font-medium print:hidden">
                <ShieldAlert size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-extrabold text-stone-900">Security Warning (سیکیورٹی انتباہ)</p>
                  <p className="text-amber-700/90 mt-0.5">{warningMessage}</p>
                </div>
              </div>
            )}

            {/* Quick Balance Widgets */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-stone-50 border border-stone-150 p-5 rounded-2xl flex flex-col justify-between relative overflow-hidden print:border-2 print:border-stone-200">
                <div>
                  <span className="text-[10px] font-extrabold text-stone-400 uppercase tracking-widest block">
                    Outstanding Balance (بقایا رقم)
                  </span>
                  <h3 className={`text-2xl font-black mt-2 leading-none ${customerDetail?.customer?.balance > 0 ? "text-rose-600" : "text-emerald-700"}`}>
                    {customerDetail ? Math.round(customerDetail.customer.balance).toLocaleString() : "..."} SAR
                  </h3>
                </div>
                <p className="text-[11px] text-stone-500 mt-4">
                  {customerDetail?.customer?.balance > 0 
                    ? "Remaining outstanding amount you owe to this store." 
                    : "Outstanding balance is fully cleared. Thank you!"}
                </p>
              </div>

              <div className="bg-emerald-50/50 border border-emerald-100 p-5 rounded-2xl flex flex-col justify-between relative overflow-hidden print:border-2 print:border-stone-200">
                <div>
                  <span className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-widest block">
                    Last Payment Received (آخری ادائیگی)
                  </span>
                  <h3 className="text-2xl font-black mt-2 text-emerald-800 leading-none">
                    {lastPayment ? `${Math.round(lastPayment.amount).toLocaleString()} SAR` : "N/A"}
                  </h3>
                </div>
                <p className="text-[11px] text-stone-500 mt-4 font-semibold text-emerald-800/80 uppercase tracking-wider text-[9px]">
                  {lastPayment ? `Cleared on: ${new Date(lastPayment.date).toLocaleDateString()}` : "No payment record yet."}
                </p>
              </div>
            </div>

            {/* Dynamic Dashboard Tab switcher */}
            <div className="border-b border-stone-100 pb-0 flex gap-1 print:hidden">
              <button
                onClick={() => setActiveTab("statement")}
                className={`px-4 py-2 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${activeTab === "statement" ? "border-emerald-600 text-emerald-700" : "border-transparent text-stone-400 hover:text-stone-900"}`}
              >
                <ClipboardList size={14} />
                <span>My Ledger (کھاتا)</span>
              </button>
              <button
                onClick={() => setActiveTab("new-order")}
                className={`px-4 py-2 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${activeTab === "new-order" ? "border-emerald-600 text-emerald-700" : "border-transparent text-stone-400 hover:text-stone-900"}`}
              >
                <ShoppingCart size={14} />
                <span>Place Order (نیا آرڈر)</span>
              </button>
              <button
                onClick={() => setActiveTab("orders")}
                className={`px-4 py-2 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${activeTab === "orders" ? "border-emerald-600 text-emerald-700" : "border-transparent text-stone-400 hover:text-stone-900"}`}
              >
                <ShoppingBag size={14} />
                <span>Order Status ({orders.length})</span>
              </button>
            </div>

            {orderSuccess && (
              <div className="bg-emerald-50 text-emerald-800 border border-emerald-100 text-xs font-bold p-4 rounded-2xl flex items-center gap-2 animate-bounce">
                <CheckCircle2 size={16} />
                <span>{orderSuccess}</span>
              </div>
            )}

            {/* TAB PANEL RENDERING */}
            <div className="min-h-[250px]">
              {/* TAB 1: LEDGER TIMELINE */}
              {activeTab === "statement" && (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-stone-500 uppercase tracking-widest pb-1 border-b border-stone-50 flex justify-between items-center">
                    <span>Statement Timeline Feed</span>
                    <span className="font-mono text-stone-400">{timeline.length} transactions</span>
                  </h3>

                  {timeline.length === 0 ? (
                    <div className="py-16 text-center text-stone-400 text-xs">
                      <p className="font-bold">No registered transactions found.</p>
                      <p className="mt-1 text-stone-300">Your credit purchases and payments will appear here.</p>
                    </div>
                  ) : (
                    <div className="space-y-3.5 max-h-[400px] overflow-y-auto pr-1">
                      {timeline.map((item: any, idx: number) => {
                        const isPurchase = item.type === "purchase";
                        return (
                          <div 
                            key={item.id || idx} 
                            className="flex gap-3.5 items-start justify-between border-b border-stone-50 pb-3 hover:bg-stone-50/20 px-1 rounded-xl transition"
                          >
                            <div className="flex gap-3 items-start">
                              <div className={`p-2 rounded-xl mt-0.5 flex-shrink-0 ${
                                isPurchase ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-700"
                              }`}>
                                {isPurchase ? <ShoppingCart size={13} /> : <DollarSign size={13} />}
                              </div>
                              <div>
                                <p className="font-bold text-stone-900 text-sm">{item.description}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[10px] text-stone-400 font-semibold flex items-center gap-1 font-mono">
                                    <Calendar size={10} />
                                    {new Date(item.date).toLocaleString()}
                                  </span>
                                  {isPurchase && (
                                    <span className="text-[10px] text-stone-400 bg-stone-100 px-1.5 py-0.2 rounded font-semibold font-mono">
                                      {Math.round(item.rawItem.price)} SAR / rate
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <span className={`font-black text-sm block ${isPurchase ? "text-rose-600" : "text-emerald-700"}`}>
                                {isPurchase ? "+" : "-"} {Math.round(item.amount).toLocaleString()} SAR
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: BOOK NEW ORDER FORM */}
              {activeTab === "new-order" && (
                <form onSubmit={handleBookOrderSubmit} className="space-y-4">
                  <div className="bg-stone-50 p-4.5 rounded-2xl border border-stone-100 space-y-3.5">
                    <div className="flex justify-between items-center">
                      <h3 className="font-extrabold text-stone-900 text-sm">🛒 Book Items (آرڈر درج کریں)</h3>
                      <span className="text-xs font-bold text-stone-400 font-mono">
                        {Object.values(selectedQuantities).reduce<number>((a, b) => a + (b as number), 0)} items selected
                      </span>
                    </div>

                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-stone-400 pointer-events-none">
                        <Search size={14} />
                      </span>
                      <input
                        type="text"
                        placeholder="Search product catalog..."
                        value={orderSearch}
                        onChange={(e) => setOrderSearch(e.target.value)}
                        className="w-full pl-8.5 pr-4 py-2 bg-white border border-stone-200 rounded-xl outline-none text-xs font-semibold text-stone-900"
                      />
                    </div>

                    {/* Catalog List */}
                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {filteredProducts.length === 0 ? (
                        <p className="text-xs text-stone-400 py-8 text-center">No products matching description.</p>
                      ) : (
                        filteredProducts.map(product => {
                          const qty = selectedQuantities[product.id] || 0;
                          return (
                            <div key={product.id} className="bg-white px-3.5 py-2.5 rounded-xl border border-stone-200/70 flex items-center justify-between hover:border-stone-300 transition-colors">
                              <div>
                                <h4 className="font-bold text-stone-900 text-sm">{product.name}</h4>
                                <span className="text-xs text-emerald-600 font-bold font-mono">{product.price} SAR</span>
                              </div>

                              <div className="flex items-center gap-2.5">
                                {qty > 0 ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => adjustQuantity(product.id, -1)}
                                      className="w-7 h-7 bg-stone-100 hover:bg-stone-200 rounded-lg flex items-center justify-center text-stone-700 transition"
                                    >
                                      <Minus size={12} />
                                    </button>
                                    <span className="font-black text-stone-900 text-sm w-5 text-center font-mono">{qty}</span>
                                    <button
                                      type="button"
                                      onClick={() => adjustQuantity(product.id, 1)}
                                      className="w-7 h-7 bg-stone-100 hover:bg-stone-200 rounded-lg flex items-center justify-center text-stone-700 transition"
                                    >
                                      <Plus size={12} />
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => adjustQuantity(product.id, 1)}
                                    className="px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-bold transition-all"
                                  >
                                    Add
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Booking Summary notes */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-black text-stone-500 uppercase tracking-wider">
                      Add Order Notes / Instructions (آرڈر نوٹ)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Enter details like preferred delivery time, address, or items details..."
                      value={orderNotes}
                      onChange={(e) => setOrderNotes(e.target.value)}
                      className="w-full px-4 py-3 bg-stone-50 border border-stone-200 focus:border-stone-400 rounded-xl outline-none text-stone-900 text-xs font-medium resize-none transition-colors"
                    />
                  </div>

                  {/* Submit bar */}
                  <div className="flex justify-between items-center pt-3 border-t border-stone-100">
                    <div>
                      <span className="text-[10px] text-stone-400 font-extrabold uppercase">Order Grand Total</span>
                      <p className="text-xl font-black text-emerald-700 font-mono">{Math.round(bookingTotal).toLocaleString()} SAR</p>
                    </div>

                    <button
                      type="submit"
                      disabled={orderLoading || bookingTotal === 0}
                      className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-stone-200 disabled:text-stone-400 text-white font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                    >
                      {orderLoading ? (
                        "Submitting Booking..."
                      ) : (
                        <>
                          <ShoppingCart size={13} />
                          <span>Submit Order Booking / آرڈر بک کریں</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 3: SELF-SERVICE ORDER HISTORY STATUS */}
              {activeTab === "orders" && (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-stone-500 uppercase tracking-widest pb-1 border-b border-stone-50 flex justify-between items-center">
                    <span>Order Bookings History</span>
                    <span className="font-mono text-stone-400">{orders.length} bookings</span>
                  </h3>

                  {orders.length === 0 ? (
                    <div className="py-16 text-center text-stone-400 text-xs">
                      <p className="font-bold">No order bookings registered yet.</p>
                      <p className="mt-1 text-stone-300">Once you book an order, its real-time processing status will display here.</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                      {orders.map((ord) => (
                        <div key={ord.id} className="bg-stone-50/50 p-4 rounded-2xl border border-stone-150 space-y-3.5">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-[10px] text-stone-400 font-mono block">Order ID: {ord.id.slice(0, 8)}...</span>
                              <span className="text-[10px] text-stone-400 font-semibold block mt-0.5">
                                Date: {new Date(ord.date).toLocaleString()}
                              </span>
                            </div>

                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              ord.status === "pending" 
                                ? "bg-amber-50 text-amber-700 border border-amber-100" 
                                : ord.status === "executed" 
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-100 animate-pulse" 
                                  : "bg-stone-100 text-stone-500 border border-stone-200"
                            }`}>
                              {ord.status === "pending" && <Clock size={10} />}
                              {ord.status === "executed" && <Check size={10} />}
                              {ord.status === "pending" ? "Pending / زیر غور" : ord.status === "executed" ? "Added to Khata / کھاتے میں شامل" : "Cancelled / منسوخ"}
                            </span>
                          </div>

                          <div className="border-t border-b border-stone-150/60 py-2.5 space-y-1">
                            {ord.items.map((item, i) => (
                              <div key={i} className="flex justify-between text-xs font-semibold text-stone-800">
                                <span>{item.quantity} × {item.product_name}</span>
                                <span className="font-mono">{Math.round(item.total_amount)} SAR</span>
                              </div>
                            ))}
                          </div>

                          {ord.notes && (
                            <p className="text-[10px] text-stone-500 italic font-semibold">
                              Note: "{ord.notes}"
                            </p>
                          )}

                          <div className="flex justify-between items-center pt-0.5">
                            <span className="text-[10px] font-bold text-stone-400">Grand Total:</span>
                            <span className="text-sm font-black text-emerald-800 font-mono">{Math.round(ord.total_amount)} SAR</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Print Footer / Terms */}
            <div className="pt-6 border-t border-stone-100 flex flex-col md:flex-row md:items-center justify-between text-[11px] text-stone-400 gap-3 leading-relaxed print:mt-16">
              <p>For any queries or customized ledger corrections, kindly contact Udhar Khata Ledger Merchant.</p>
              <span className="font-mono text-[9px] uppercase font-bold tracking-widest text-stone-300">
                PORTAL SESSION • {new Date().toLocaleDateString()}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
