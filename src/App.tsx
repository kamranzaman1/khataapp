import React, { useState, useEffect } from "react";
import { Customer, Product, CustomerDetailData, Vendor, Order } from "./types";
import Dashboard from "./components/Dashboard";
import CustomersList from "./components/CustomersList";
import CustomerDetail from "./components/CustomerDetail";
import AddTransaction from "./components/AddTransaction";
import ProductsList from "./components/ProductsList";
import ProfitLossStatement from "./components/ProfitLossStatement";
import VendorsList from "./components/VendorsList";
import BackupControl from "./components/BackupControl";
import AddCashReceivedModal from "./components/AddCashReceivedModal";
import LoansList from "./components/LoansList";
import CustomerPortal from "./components/CustomerPortal";
import OrdersList from "./components/OrdersList";
import { 
  BookOpen, LayoutDashboard, Users, ShoppingCart, Tag, 
  Menu, X, RefreshCw, Layers, TrendingUp, Building2, Key, LogOut, FileSpreadsheet, Coins, Search, ShoppingBag
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

type ActiveView = "dashboard" | "customers" | "customer-detail" | "add-transaction" | "products" | "profit-loss" | "vendors" | "loans" | "orders";

export default function App() {
  const [activeView, setActiveView] = useState<ActiveView>("dashboard");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [allVendorPurchases, setAllVendorPurchases] = useState<any[]>([]);
  const [allPayments, setAllPayments] = useState<any[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [productsActiveTab, setProductsActiveTab] = useState<"catalog" | "inventory" | "ledger">("catalog");
  const [activeCustomerId, setActiveCustomerId] = useState<string | null>(null);
  const [customerDetailData, setCustomerDetailData] = useState<CustomerDetailData | null>(null);

  // Admin authentication states
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem("admin_authenticated") === "true";
  });
  const [isCustomerPortalActive, setIsCustomerPortalActive] = useState<boolean>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("portal") === "true" || params.has("id") || params.has("customer")) {
      return true;
    }
    return localStorage.getItem("customer_portal_active") === "true";
  });
  const [adminPinInput, setAdminPinInput] = useState<string>("");
  const [adminLoginError, setAdminLoginError] = useState<string>("");

  // App loading and refreshing states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [backupOpen, setBackupOpen] = useState(false);
  const [cashReceivedOpen, setCashReceivedOpen] = useState(false);

  // Active product category tab for products list
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminLoginError("");
    const correctPin = localStorage.getItem("admin_custom_pin") || "admin";
    if (adminPinInput === correctPin) {
      setIsAdminAuthenticated(true);
      localStorage.setItem("admin_authenticated", "true");
      setAdminPinInput("");
    } else {
      setAdminLoginError("Incorrect Admin PIN passcode. Please try again.");
    }
  };

  // Global fetch function
  const fetchData = async () => {
    try {
      const [custRes, prodRes, transRes, vpRes, vendRes, payRes, ordersRes] = await Promise.all([
        fetch("/api/customers"),
        fetch("/api/products"),
        fetch("/api/transactions"),
        fetch("/api/vendor-purchases"),
        fetch("/api/vendors"),
        fetch("/api/payments"),
        fetch("/api/orders")
      ]);
      const custData = await custRes.json();
      const prodData = await prodRes.json();
      const transData = await transRes.json();
      const vpData = await vpRes.json();
      const vendData = await vendRes.json();
      const payData = await payRes.json();
      const ordersData = await ordersRes.json();

      setCustomers(Array.isArray(custData) ? custData : []);
      setProducts(Array.isArray(prodData) ? prodData : []);
      setAllTransactions(Array.isArray(transData) ? transData : []);
      setAllVendorPurchases(Array.isArray(vpData) ? vpData : []);
      setVendors(Array.isArray(vendData) ? vendData : []);
      setAllPayments(Array.isArray(payData) ? payData : []);
      setOrders(Array.isArray(ordersData) ? ordersData : []);
    } catch (err) {
      console.error("Error fetching data:", err);
    }
  };

  // Fetch details for specific customer
  const fetchCustomerDetails = async (id: string) => {
    try {
      const res = await fetch(`/api/customers/${id}`);
      if (res.ok) {
        const detail: CustomerDetailData = await res.json();
        setCustomerDetailData(detail);
      }
    } catch (err) {
      console.error("Error fetching customer details:", err);
    }
  };

  // Initialize data
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchData();
      setLoading(false);
    };
    init();
  }, []);

  // Sync specific customer detail if active view is detail
  useEffect(() => {
    if (activeView === "customer-detail" && activeCustomerId) {
      fetchCustomerDetails(activeCustomerId);
    }
  }, [activeView, activeCustomerId]);

  // Handle Manual Refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    if (activeView === "customer-detail" && activeCustomerId) {
      await fetchCustomerDetails(activeCustomerId);
    }
    setRefreshing(false);
  };

  // 1. Add Customer API
  const handleAddCustomer = async (name: string, phone: string, openingBalance?: number, customId?: string, pin?: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: customId, name, phone, openingBalance: openingBalance ?? 0, pin })
      });
      if (res.ok) {
        await fetchData(); // Refresh local dataset
        return true;
      } else {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to add customer. Please try again.");
      }
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  // Update Customer API
  const handleUpdateCustomer = async (id: string, name: string, phone: string, openingBalance?: number, pin?: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/customers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, openingBalance: openingBalance ?? 0, pin })
      });
      if (res.ok) {
        await fetchData(); // Refresh local dataset
        if (activeCustomerId === id) {
          await fetchCustomerDetails(id); // Sync detailed state
        }
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  // Delete Customer API
  const handleDeleteCustomer = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/customers/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        await fetchData(); // Refresh dataset
        if (activeCustomerId === id) {
          setActiveCustomerId(null);
          setActiveView("customers");
        }
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  // Execute Order API
  const handleExecuteOrder = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/orders/${id}/execute`, {
        method: "POST"
      });
      if (res.ok) {
        await fetchData(); // Refresh data to reflect transactions and updated balance
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  // Cancel Order API
  const handleCancelOrder = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/orders/${id}/cancel`, {
        method: "POST"
      });
      if (res.ok) {
        await fetchData(); // Refresh database
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  // 2. Add Product API
  const handleAddProduct = async (name: string, price: number, costPrice?: number, hideInPortal?: boolean): Promise<boolean> => {
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, price, costPrice, hideInPortal })
      });
      if (res.ok) {
        await fetchData(); // Refresh local dataset
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  // Update Product API
  const handleUpdateProduct = async (id: string, name: string, price: number, costPrice?: number, hideInPortal?: boolean): Promise<boolean> => {
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, price, costPrice, hideInPortal })
      });
      if (res.ok) {
        await fetchData(); // Refresh local dataset
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  // 3. Add Transaction (purchase) API
  const handleAddTransaction = async (customer_id: string, product_id: string, quantity: number): Promise<boolean> => {
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_id, product_id, quantity })
      });
      if (res.ok) {
        await fetchData(); // Refresh data
        if (activeCustomerId === customer_id) {
          await fetchCustomerDetails(customer_id); // Sync details
        }
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  // Add Bulk Transactions API
  const handleAddBulkTransactions = async (customer_id: string, items: { product_id: string, quantity: number }[]): Promise<boolean> => {
    try {
      const res = await fetch("/api/transactions/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_id, items })
      });
      if (res.ok) {
        await fetchData(); // Refresh data
        if (activeCustomerId === customer_id) {
          await fetchCustomerDetails(customer_id); // Sync details
        }
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  // 4. Add Payment API
  const handleAddPayment = async (customer_id: string, amount: number, account?: "cash" | "bank"): Promise<boolean> => {
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_id, amount, account })
      });
      if (res.ok) {
        await fetchData(); // Refresh data
        if (activeCustomerId === customer_id) {
          await fetchCustomerDetails(customer_id); // Sync details
        }
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  // Update Payment API
  const handleUpdatePayment = async (id: string, customer_id: string, amount: number, account?: "cash" | "bank"): Promise<boolean> => {
    try {
      const res = await fetch(`/api/payments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, account })
      });
      if (res.ok) {
        await fetchData(); // Refresh global data
        if (activeCustomerId === customer_id) {
          await fetchCustomerDetails(customer_id); // Sync active details
        }
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  // Delete Payment API
  const handleDeletePayment = async (id: string, customer_id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/payments/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        await fetchData(); // Refresh global data
        if (activeCustomerId === customer_id) {
          await fetchCustomerDetails(customer_id); // Sync active details
        }
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const handleSelectCustomer = (id: string) => {
    setActiveCustomerId(id);
    setActiveView("customer-detail");
  };

  // Navigation handlers
  const navigateTo = (view: ActiveView) => {
    setActiveView(view);
    setMobileMenuOpen(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fcfbf9] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-full border-4 border-emerald-100 border-t-emerald-600 animate-spin"></div>
        <p className="font-mono text-stone-500 text-xs font-semibold uppercase tracking-wider animate-pulse">
          Opening Digital Khata Ledger...
        </p>
      </div>
    );
  }

  if (isCustomerPortalActive) {
    return (
      <CustomerPortal 
        onBackToAdminLogin={() => {
          setIsCustomerPortalActive(false);
          localStorage.removeItem("customer_portal_active");
        }}
      />
    );
  }

  if (!isAdminAuthenticated) {
    return (
      <div className="min-h-screen bg-[#fcfbf9] flex items-center justify-center p-6 selection:bg-emerald-100 selection:text-emerald-900">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-white p-8 rounded-3xl border border-stone-200/60 shadow-xl flex flex-col"
        >
          <div className="flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-stone-900 text-white flex items-center justify-center shadow-lg mb-4">
              <BookOpen size={28} />
            </div>
            <h2 className="text-2xl font-black text-stone-950 tracking-tight">Udhar Khata</h2>
            <p className="text-xs text-emerald-600 font-extrabold uppercase tracking-widest mt-0.5">Commercial Ledger System</p>
            <p className="text-stone-500 text-xs mt-3 px-2">
              This system contains protected financial assets and stock ledger details. Please verify your administrator PIN.
            </p>
          </div>

          <form onSubmit={handleLoginSubmit} className="mt-8 space-y-4">
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">
                Admin Passcode / PIN <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                required
                placeholder="••••"
                value={adminPinInput}
                onChange={(e) => setAdminPinInput(e.target.value)}
                className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl outline-none text-stone-950 text-center font-mono text-xl tracking-widest focus:border-stone-550 focus:bg-white transition-all shadow-inner"
              />
            </div>

            {adminLoginError && (
              <p className="text-rose-605 text-xs font-bold text-center mt-2">
                ⚠️ {adminLoginError}
              </p>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-stone-900 hover:bg-stone-800 active:bg-black text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-1.5 cursor-pointer mt-4"
            >
              <Key size={15} />
              <span>Unlock Admin Access</span>
            </button>
          </form>

          <div className="my-5 flex items-center justify-between">
            <span className="h-[1px] bg-stone-100 flex-1"></span>
            <span className="text-[10px] text-stone-400 font-extrabold uppercase tracking-widest px-3">or</span>
            <span className="h-[1px] bg-stone-100 flex-1"></span>
          </div>

          <button
            onClick={() => {
              setIsCustomerPortalActive(true);
              localStorage.setItem("customer_portal_active", "true");
            }}
            className="w-full py-3.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/60 font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-xs flex flex-col items-center justify-center gap-1 cursor-pointer"
          >
            <div className="flex items-center gap-1.5">
              <Search size={14} className="text-emerald-700" />
              <span>Customer Online Khata Check</span>
            </div>
            <span className="text-[10px] text-emerald-600 font-sans tracking-normal font-bold">اپنا کسٹمر کھاتا چیک کریں</span>
          </button>

          <div className="mt-8 pt-6 border-t border-stone-100 text-center">
            <p className="text-xs text-stone-400 font-semibold flex items-center justify-center gap-1">
              <span>🔒 Sandbox default:</span>
              <code className="bg-stone-100 px-1.5 py-0.5 rounded font-bold text-stone-600 font-mono text-[10px]">admin</code>
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  const pendingOrdersCount = orders.filter(o => o.status === "pending").length;

  return (
    <div className="min-h-screen bg-[#fcfbf9] flex flex-col text-stone-900 selection:bg-emerald-100 selection:text-emerald-900">
      
      {/* Visual Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-stone-100 shadow-xs px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigateTo("dashboard")}>
          <div className="w-9 h-9 rounded-xl bg-stone-900 text-white flex items-center justify-center shadow-md">
            <BookOpen size={18} />
          </div>
          <div>
            <h1 className="font-black text-stone-950 tracking-tight text-sm leading-tight leading-none">Udhar Khata</h1>
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest leading-none block mt-0.5">Digital Ledger</span>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          <button
            onClick={() => navigateTo("dashboard")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${activeView === "dashboard" ? "bg-stone-900 text-white" : "text-stone-500 hover:text-stone-900 hover:bg-stone-50"}`}
          >
            <LayoutDashboard size={14} />
            <span>Dashboard</span>
          </button>
          <button
            onClick={() => navigateTo("customers")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${activeView === "customers" || activeView === "customer-detail" ? "bg-stone-900 text-white" : "text-stone-500 hover:text-stone-900 hover:bg-stone-50"}`}
          >
            <Users size={14} />
            <span>Customers</span>
          </button>
          <button
            onClick={() => navigateTo("add-transaction")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${activeView === "add-transaction" ? "bg-stone-900 text-white" : "text-stone-500 hover:text-stone-900 hover:bg-stone-50"}`}
          >
            <ShoppingCart size={14} />
            <span>Standard Entry</span>
          </button>
          <button
            onClick={() => navigateTo("products")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${activeView === "products" ? "bg-stone-900 text-white" : "text-stone-500 hover:text-stone-900 hover:bg-stone-50"}`}
          >
            <Tag size={14} />
            <span>Products Catalog</span>
          </button>
          <button
            onClick={() => navigateTo("profit-loss")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${activeView === "profit-loss" ? "bg-stone-900 text-white" : "text-stone-500 hover:text-stone-900 hover:bg-stone-50"}`}
          >
            <TrendingUp size={14} />
            <span>P&L Statement</span>
          </button>
          <button
            onClick={() => navigateTo("vendors")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${activeView === "vendors" ? "bg-stone-900 text-white" : "text-stone-500 hover:text-stone-900 hover:bg-stone-50"}`}
          >
            <Building2 size={14} />
            <span>Vendors Ledger</span>
          </button>
          <button
            onClick={() => navigateTo("loans")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${activeView === "loans" ? "bg-stone-900 text-white" : "text-stone-500 hover:text-stone-900 hover:bg-stone-50"}`}
            id="nav-loans-desktop"
          >
            <Coins size={14} />
            <span>Loans Account</span>
          </button>
          <button
            onClick={() => navigateTo("orders")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 relative ${activeView === "orders" ? "bg-stone-900 text-white" : "text-stone-500 hover:text-stone-900 hover:bg-stone-50"}`}
            id="nav-orders-desktop"
          >
            <ShoppingBag size={14} />
            <span>Order Bookings</span>
            {pendingOrdersCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center animate-bounce">
                {pendingOrdersCount}
              </span>
            )}
          </button>
        </nav>

        {/* Sync Status Button and Admin Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCashReceivedOpen(true)}
            className="px-3 py-1.5 bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 rounded-xl transition-all flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider cursor-pointer"
            title="Record customer cash receipt"
            id="btn-header-cash-received"
          >
            <Coins size={13} className="text-amber-700" />
            <span>Daily Cash</span>
          </button>

          <button
            onClick={() => setBackupOpen(true)}
            className="px-3 py-1.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider cursor-pointer"
            title="Export Excel or CSV backup"
            id="btn-header-excel-backup"
          >
            <FileSpreadsheet size={13} className="text-emerald-700" />
            <span>Excel Backup</span>
          </button>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-50 rounded-xl transition-all"
            title="Refresh database state"
            id="btn-global-refresh"
          >
            <RefreshCw size={15} className={`${refreshing ? "animate-spin text-emerald-600" : ""}`} />
          </button>

          <div className="h-4 w-[1px] bg-stone-200 mx-1"></div>

          <button
            onClick={() => {
              const newPin = window.prompt("Set a custom Admin PIN Passcode for this browser:");
              if (newPin === null) return;
              if (!newPin.trim()) {
                alert("Passcode pin cannot be blank.");
                return;
              }
              localStorage.setItem("admin_custom_pin", newPin.trim());
              alert("Admin password pin updated successfully!");
            }}
            className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-50 rounded-xl transition-all"
            title="Change Security PIN"
          >
            <Key size={14} />
          </button>

          <button
            onClick={() => {
              if (window.confirm("Do you want to log out of Admin mode?")) {
                setIsAdminAuthenticated(false);
                localStorage.removeItem("admin_authenticated");
              }
            }}
            className="p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
            title="Lock system / Log out"
          >
            <LogOut size={14} />
          </button>

          {/* Mobile Menu Toggle */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
            className="md:hidden p-2 text-stone-600 hover:bg-stone-50 rounded-xl transition"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="md:hidden bg-white border-b border-stone-100 py-4 px-6 flex flex-col gap-2 shadow-lg"
          >
            <button
              onClick={() => navigateTo("dashboard")}
              className={`flex items-center gap-2.5 py-2.5 px-4 rounded-xl text-xs font-bold font-medium ${activeView === "dashboard" ? "bg-stone-900 text-white" : "text-stone-600"}`}
            >
              <LayoutDashboard size={15} />
              <span>Dashboard</span>
            </button>
            <button
              onClick={() => navigateTo("customers")}
              className={`flex items-center gap-2.5 py-2.5 px-4 rounded-xl text-xs font-bold font-medium ${activeView === "customers" || activeView === "customer-detail" ? "bg-stone-900 text-white" : "text-stone-600"}`}
            >
              <Users size={15} />
              <span>Customers List</span>
            </button>
            <button
              onClick={() => navigateTo("add-transaction")}
              className={`flex items-center gap-2.5 py-2.5 px-4 rounded-xl text-xs font-bold font-medium ${activeView === "add-transaction" ? "bg-stone-900 text-white" : "text-stone-600"}`}
            >
              <ShoppingCart size={15} />
              <span>Quick Credit Entry</span>
            </button>
            <button
              onClick={() => navigateTo("products")}
              className={`flex items-center gap-2.5 py-2.5 px-4 rounded-xl text-xs font-bold font-medium ${activeView === "products" ? "bg-stone-900 text-white" : "text-stone-600"}`}
            >
              <Tag size={15} />
              <span>Products Catalog</span>
            </button>
            <button
              onClick={() => navigateTo("profit-loss")}
              className={`flex items-center gap-2.5 py-2.5 px-4 rounded-xl text-xs font-bold font-medium ${activeView === "profit-loss" ? "bg-stone-900 text-white" : "text-stone-600"}`}
            >
              <TrendingUp size={15} />
              <span>P&L Statement</span>
            </button>
            <button
              onClick={() => navigateTo("vendors")}
              className={`flex items-center gap-2.5 py-2.5 px-4 rounded-xl text-xs font-bold font-medium ${activeView === "vendors" ? "bg-stone-900 text-white" : "text-stone-600"}`}
            >
              <Building2 size={15} />
              <span>Vendors Ledger</span>
            </button>
            <button
              onClick={() => navigateTo("loans")}
              className={`flex items-center gap-2.5 py-2.5 px-4 rounded-xl text-xs font-bold font-medium ${activeView === "loans" ? "bg-stone-900 text-white" : "text-stone-600"}`}
              id="nav-loans-mobile"
            >
              <Coins size={15} />
              <span>Loans Account</span>
            </button>
            <button
              onClick={() => navigateTo("orders")}
              className={`flex items-center justify-between py-2.5 px-4 rounded-xl text-xs font-bold font-medium ${activeView === "orders" ? "bg-stone-900 text-white" : "text-stone-600"}`}
              id="nav-orders-mobile"
            >
              <div className="flex items-center gap-2.5">
                <ShoppingBag size={15} />
                <span>Order Bookings</span>
              </div>
              {pendingOrdersCount > 0 && (
                <span className="bg-rose-500 text-white text-[9px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center animate-bounce">
                  {pendingOrdersCount}
                </span>
              )}
            </button>

             <button
              onClick={() => {
                setMobileMenuOpen(false);
                setCashReceivedOpen(true);
              }}
              className="flex items-center gap-2.5 py-2.5 px-4 rounded-xl text-xs font-black text-amber-800 bg-amber-50 border border-amber-100 hover:bg-amber-100 mt-2 cursor-pointer"
            >
              <Coins size={15} className="text-amber-700" />
              <span>💵 DAILY CASH RECEIVED</span>
            </button>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                setBackupOpen(true);
              }}
              className="flex items-center gap-2.5 py-2.5 py-2 px-4 rounded-xl text-xs font-black text-emerald-800 bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 mt-2 cursor-pointer"
            >
              <FileSpreadsheet size={15} className="text-emerald-700" />
              <span>📥 EXCEL BACKUP</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content View with Slide transitions */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeView}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            {activeView === "dashboard" && (
              <Dashboard 
                customers={customers} 
                products={products}
                allTransactions={allTransactions}
                allVendorPurchases={allVendorPurchases}
                vendors={vendors}
                onNavigateToCustomers={() => navigateTo("customers")}
                onNavigateToCustomerDetail={handleSelectCustomer}
                onAddTransaction={() => navigateTo("add-transaction")}
                onNavigateToProducts={(tab) => {
                  if (tab) setProductsActiveTab(tab as any);
                  navigateTo("products");
                }}
                onNavigateToVendors={() => navigateTo("vendors")}
                onOpenBackup={() => setBackupOpen(true)}
                onOpenCashReceived={() => setCashReceivedOpen(true)}
              />
            )}

            {activeView === "customers" && (
              <CustomersList 
                customers={customers} 
                onAddCustomer={handleAddCustomer} 
                onSelectCustomer={handleSelectCustomer}
                onUpdateCustomer={handleUpdateCustomer}
                onDeleteCustomer={handleDeleteCustomer}
                allTransactions={allTransactions}
                allPayments={allPayments}
              />
            )}

            {activeView === "customer-detail" && customerDetailData && (
              <CustomerDetail 
                customer={customerDetailData.customer}
                transactions={customerDetailData.transactions}
                payments={customerDetailData.payments}
                loans={customerDetailData.loans}
                products={products}
                onBack={() => navigateTo("customers")}
                onAddTransaction={handleAddTransaction}
                onAddPayment={handleAddPayment}
                onUpdateCustomer={handleUpdateCustomer}
                onDeleteCustomer={handleDeleteCustomer}
                onUpdatePayment={handleUpdatePayment}
                onDeletePayment={handleDeletePayment}
              />
            )}

            {activeView === "add-transaction" && (
              <AddTransaction 
                customers={customers}
                products={products}
                onAddTransaction={handleAddTransaction}
                onAddBulkTransactions={handleAddBulkTransactions}
                onSuccess={() => navigateTo("dashboard")}
              />
            )}

            {activeView === "products" && (
              <ProductsList 
                products={products} 
                customers={customers}
                onAddProduct={handleAddProduct}
                onUpdateProduct={handleUpdateProduct}
                allTransactions={allTransactions}
                allVendorPurchases={allVendorPurchases}
                activeTab={productsActiveTab}
                setActiveTab={setProductsActiveTab}
                onNavigateToVendors={() => navigateTo("vendors")}
                onNavigateToSales={() => navigateTo("add-transaction")}
                vendors={vendors}
                onRefreshData={fetchData}
              />
            )}

            {activeView === "profit-loss" && (
              <ProfitLossStatement 
                products={products}
                customers={customers}
              />
            )}

            {activeView === "vendors" && (
              <VendorsList 
                products={products}
                onRefreshGlobal={fetchData}
              />
            )}

            {activeView === "loans" && (
              <LoansList 
                onRefreshGlobal={fetchData}
              />
            )}

            {activeView === "orders" && (
              <OrdersList 
                orders={orders}
                onExecuteOrder={handleExecuteOrder}
                onCancelOrder={handleCancelOrder}
                onRefreshOrders={fetchData}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {backupOpen && (
          <BackupControl 
            isOpen={backupOpen}
            onClose={() => setBackupOpen(false)}
            customers={customers}
            products={products}
            vendors={vendors}
            allTransactions={allTransactions}
            allVendorPurchases={allVendorPurchases}
            allPayments={allPayments}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {cashReceivedOpen && (
          <AddCashReceivedModal
            isOpen={cashReceivedOpen}
            onClose={() => setCashReceivedOpen(false)}
            customers={customers}
            onAddPayment={handleAddPayment}
          />
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="py-6 border-t border-stone-100 text-center text-xs text-stone-400 font-medium">
        <p>&copy; {new Date().getFullYear()} Udhar Khata Ledger System. Secure server-side Firestore proxy.</p>
      </footer>
    </div>
  );
}
