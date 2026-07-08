import React, { useState, useEffect, useMemo } from "react";
import { Customer, Product, Vendor } from "../types";
import { Users, DollarSign, ArrowUpRight, ArrowDownLeft, AlertCircle, Layers, Building2, Calendar, ArrowLeft, Clock, FileSpreadsheet, Coins, Landmark, Settings } from "lucide-react";
import { motion } from "motion/react";
import EditOpeningBalancesModal from "./EditOpeningBalancesModal";

interface DashboardProps {
  customers: Customer[];
  products: Product[];
  allTransactions: any[];
  allVendorPurchases: any[];
  vendors?: Vendor[];
  onNavigateToCustomers: () => void;
  onNavigateToCustomerDetail: (id: string) => void;
  onAddTransaction: () => void;
  onNavigateToProducts: (tab?: string) => void;
  onNavigateToVendors?: () => void;
  onOpenBackup?: () => void;
  onOpenCashReceived?: () => void;
}

export default function Dashboard({ 
  customers, 
  products = [],
  allTransactions = [],
  allVendorPurchases = [],
  vendors = [],
  onNavigateToCustomers, 
  onNavigateToCustomerDetail,
  onAddTransaction,
  onNavigateToProducts,
  onNavigateToVendors,
  onOpenBackup,
  onOpenCashReceived
}: DashboardProps) {
  // Local toggle states for Rozana / Daily Sales Log
  const [showDailySales, setShowDailySales] = useState(false);
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const [dailyStartDate, setDailyStartDate] = useState("");
  const [dailyEndDate, setDailyEndDate] = useState("");
  const [isOpeningBalancesModalOpen, setIsOpeningBalancesModalOpen] = useState(false);

  // Account balances states
  const [paymentsList, setPaymentsList] = useState<any[]>([]);
  const [vendorPaymentsList, setVendorPaymentsList] = useState<any[]>([]);
  const [expensesList, setExpensesList] = useState<any[]>([]);
  const [loanTransactionsList, setLoanTransactionsList] = useState<any[]>([]);
  const [loanPartnersList, setLoanPartnersList] = useState<any[]>([]);
  const [settings, setSettings] = useState<{ bankOpeningBalance: number; cashOpeningBalance: number }>({
    bankOpeningBalance: 0,
    cashOpeningBalance: 0
  });
  const [balancesLoading, setBalancesLoading] = useState(true);

  // Fetch balances
  useEffect(() => {
    const fetchBalances = async () => {
      try {
        const [payRes, vendPayRes, expRes, loanTxRes, loanPartnersRes, settingsRes] = await Promise.all([
          fetch("/api/payments"),
          fetch("/api/vendor-payments"),
          fetch("/api/expenses"),
          fetch("/api/loans/transactions"),
          fetch("/api/loans/partners"),
          fetch("/api/settings")
        ]);
        if (payRes.ok && vendPayRes.ok && expRes.ok && loanTxRes.ok && loanPartnersRes.ok) {
          const pays = await payRes.json();
          const vendPays = await vendPayRes.json();
          const exps = await expRes.json();
          const loanTxs = await loanTxRes.json();
          const loanPartners = await loanPartnersRes.json();
          let setts = { bankOpeningBalance: 0, cashOpeningBalance: 0 };
          if (settingsRes && settingsRes.ok) {
            setts = await settingsRes.json();
          }
          setPaymentsList(pays);
          setVendorPaymentsList(vendPays);
          setExpensesList(exps);
          setLoanTransactionsList(loanTxs);
          setLoanPartnersList(loanPartners);
          setSettings(setts);
        }
      } catch (err) {
        console.error("Error loading dashboard accounts:", err);
      } finally {
        setBalancesLoading(false);
      }
    };
    fetchBalances();
  }, []);

  const handleSaveOpeningBalances = async (bankOpening: number, cashOpening: number) => {
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bankOpeningBalance: bankOpening, cashOpeningBalance: cashOpening })
      });
      if (res.ok) {
        const data = await res.json();
        setSettings({
          bankOpeningBalance: data.bankOpeningBalance || 0,
          cashOpeningBalance: data.cashOpeningBalance || 0
        });
        return true;
      }
    } catch (err) {
      console.error("Error saving opening balances:", err);
    }
    return false;
  };

  const pettyCashBalance = useMemo(() => {
    let balance = settings.cashOpeningBalance || 0;
    // 1. Customer payments
    paymentsList.forEach(p => {
      if (!p.account || p.account === "cash") {
        balance += (p.amount || 0);
      }
    });
    // 2. Vendor payments
    vendorPaymentsList.forEach(p => {
      if (!p.account || p.account === "cash") {
        balance -= (p.amount || 0);
      }
    });
    // 3. Expenses
    expensesList.forEach(e => {
      if (!e.account || e.account === "cash") {
        balance -= (e.amount || 0);
      }
    });
    // 4. Loan transactions
    loanTransactionsList.forEach(t => {
      if (t.account === "cash") {
        if (t.type === "given") balance -= (t.amount || 0);
        else if (t.type === "taken") balance += (t.amount || 0);
        else if (t.type === "repayment_sent") balance -= (t.amount || 0);
        else if (t.type === "repayment_received") balance += (t.amount || 0);
      }
    });
    return balance;
  }, [paymentsList, vendorPaymentsList, expensesList, loanTransactionsList, settings]);

  const bankBalance = useMemo(() => {
    let balance = settings.bankOpeningBalance || 0;
    // 1. Customer payments
    paymentsList.forEach(p => {
      if (p.account === "bank") {
        balance += (p.amount || 0);
      }
    });
    // 2. Vendor payments
    vendorPaymentsList.forEach(p => {
      if (p.account === "bank") {
        balance -= (p.amount || 0);
      }
    });
    // 3. Expenses
    expensesList.forEach(e => {
      if (e.account === "bank") {
        balance -= (e.amount || 0);
      }
    });
    // 4. Loan transactions
    loanTransactionsList.forEach(t => {
      if (t.account === "bank") {
        if (t.type === "given") balance -= (t.amount || 0);
        else if (t.type === "taken") balance += (t.amount || 0);
        else if (t.type === "repayment_sent") balance -= (t.amount || 0);
        else if (t.type === "repayment_received") balance += (t.amount || 0);
      }
    });
    return balance;
  }, [paymentsList, vendorPaymentsList, expensesList, loanTransactionsList, settings]);

  const totalLoansOwedByUs = useMemo(() => {
    return loanPartnersList.reduce((sum, p) => p.balance < 0 ? sum + Math.abs(p.balance) : sum, 0);
  }, [loanPartnersList]);

  const totalLoansOwedToUs = useMemo(() => {
    return loanPartnersList.reduce((sum, p) => p.balance > 0 ? sum + p.balance : sum, 0);
  }, [loanPartnersList]);

  // Calculations
  const totalCustomers = customers.length;
  const totalOutstanding = customers.reduce((acc, c) => acc + (c.balance || 0), 0);
  const totalPayables = vendors.reduce((acc, v) => acc + (v.balance || 0), 0);
  
  // Calculate Live Store Inventory
  const productStock = products.reduce((acc, p) => {
    const inQty = allVendorPurchases
      .filter(item => item.product_id === p.id)
      .reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    const outQty = allTransactions
      .filter(item => item.product_id === p.id)
      .reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    acc[p.id] = inQty - outQty;
    return acc;
  }, {} as Record<string, number>);

  const totalInStoreQuantity = Object.values(productStock).reduce((sum, qty) => sum + (qty > 0 ? qty : 0), 0);
  const totalUniqueProductsInStock = products.filter(p => (productStock[p.id] || 0) > 0).length;

  // Customers with positive balance (money they owe us)
  const debtors = customers
    .filter(c => c.balance > 0)
    .sort((a, b) => b.balance - a.balance);

  // Customers with negative balance (prepaid/deposit/we owe them)
  const prepaid = customers
    .filter(c => c.balance < 0);

  // Helper to fetch customer name
  const getCustomerName = (id: string) => {
    const cust = customers.find(c => c.id === id);
    return cust ? cust.name : "Walking Customer";
  };

  // Helper to fetch vendor name
  const getVendorName = (id: string) => {
    const v = vendors.find(vend => vend.id === id);
    return v ? v.name : "Unknown Supplier";
  };

  // Helper to format timestamp
  const formatTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    } catch (e) {
      return "--:--";
    }
  };

  // Group Sales Transactions Day-by-Day (filtered by optional date range)
  const filteredTransactions = allTransactions.filter(t => {
    if (!t.date) return false;
    const dateStr = t.date.split("T")[0]; // "YYYY-MM-DD"
    if (dailyStartDate && dateStr < dailyStartDate) return false;
    if (dailyEndDate && dateStr > dailyEndDate) return false;
    return true;
  });

  const dailyGroups: Record<string, any[]> = {};
  filteredTransactions.forEach(t => {
    if (!t.date) return;
    const dateKey = t.date.split("T")[0]; // "YYYY-MM-DD"
    if (!dailyGroups[dateKey]) {
      dailyGroups[dateKey] = [];
    }
    dailyGroups[dateKey].push(t);
  });

  const sortedDates = Object.keys(dailyGroups).sort((a, b) => b.localeCompare(a));
  const dailyReports = sortedDates.map(dateKey => {
    const transList = dailyGroups[dateKey];
    const totalSales = transList.reduce((sum, t) => sum + (t.total_amount || 0), 0);
    const totalQty = transList.reduce((sum, t) => sum + (t.quantity || 0), 0);
    
    // Day Name
    const dObj = new Date(dateKey + "T12:00:00");
    const formattedDate = dObj.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });

    return {
      dateKey,
      formattedDate,
      totalSales,
      totalQty,
      transactions: transList
    };
  });

  // Set default selected day if not set and there is data
  const activeDayKey = selectedDayKey || (dailyReports.length > 0 ? dailyReports[0].dateKey : null);
  const activeDayReport = dailyReports.find(r => r.dateKey === activeDayKey);

  if (showDailySales) {
    return (
      <div className="space-y-6">
        {/* Back header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-stone-200 animate-fadeIn">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setShowDailySales(false);
                setSelectedDayKey(null);
              }}
              className="p-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl transition cursor-pointer flex items-center justify-center border border-stone-200/40"
              title="Back to Summary"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="text-2xl font-black text-stone-950 tracking-tight">Daily Sales Log (Rozana Sale)</h1>
              <p className="text-stone-500 text-xs">Analyze credit sales transactions recorded day-by-day.</p>
            </div>
          </div>
          <div className="px-3 py-1.5 bg-stone-100 rounded-xl font-mono text-xs font-bold text-stone-605">
            Total Days: {dailyReports.length}
          </div>
        </div>

        {allTransactions.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-stone-100 shadow-sm animate-fadeIn">
            <p className="text-sm font-semibold text-stone-400 font-bold">No Sales Transactions matching account setup.</p>
            <button
              onClick={() => {
                setShowDailySales(false);
                onAddTransaction();
              }}
              className="mt-4 px-4 py-2 bg-emerald-600 font-bold text-white rounded-xl text-xs uppercase cursor-pointer"
            >
              Log First Sale
            </button>
          </div>
        ) : (
          <div className="space-y-6 animate-fadeIn">
            {/* Date Range Selection Filter Row */}
            <div className="bg-stone-50/50 p-4 rounded-3xl border border-stone-200/80 shadow-xs flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
              <div className="flex items-center gap-2.5">
                <span className="p-2.5 bg-emerald-50 text-emerald-800 rounded-2xl flex items-center justify-center">
                  <Calendar size={18} className="stroke-[2.5px]" />
                </span>
                <div>
                  <h4 className="text-xs font-black text-stone-900 uppercase tracking-widest">Filter Rozana Sale By Date</h4>
                  <p className="text-[10px] text-stone-500 font-bold">Browse daily credit sales from specific business dates</p>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase text-stone-400 tracking-wider">From:</span>
                  <input
                    type="date"
                    value={dailyStartDate}
                    onChange={(e) => {
                      setDailyStartDate(e.target.value);
                      setSelectedDayKey(null);
                    }}
                    className="px-3.5 py-2 bg-white border border-stone-200 rounded-xl text-xs font-bold text-stone-900 outline-none focus:border-stone-400 cursor-pointer shadow-xs"
                    id="date-filter-from"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase text-stone-400 tracking-wider">To:</span>
                  <input
                    type="date"
                    value={dailyEndDate}
                    onChange={(e) => {
                      setDailyEndDate(e.target.value);
                      setSelectedDayKey(null);
                    }}
                    className="px-3.5 py-2 bg-white border border-stone-200 rounded-xl text-xs font-bold text-stone-900 outline-none focus:border-stone-400 cursor-pointer shadow-xs"
                    id="date-filter-to"
                  />
                </div>

                {(dailyStartDate || dailyEndDate) && (
                  <button
                    onClick={() => {
                      setDailyStartDate("");
                      setDailyEndDate("");
                      setSelectedDayKey(null);
                    }}
                    className="px-3 py-2 text-xs font-extrabold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-150 rounded-xl transition cursor-pointer flex items-center gap-1.5"
                    id="btn-clear-date-filter"
                  >
                    Clear Filter
                  </button>
                )}
              </div>
            </div>

            {dailyReports.length === 0 ? (
              <div className="bg-white p-12 text-center rounded-3xl border border-stone-150 shadow-sm py-16">
                <span className="inline-block p-4.5 bg-stone-50 text-stone-400 rounded-full mb-3">
                  <Calendar size={28} />
                </span>
                <p className="text-sm font-black text-stone-900">No Rozana Sales In This Date Range</p>
                <p className="text-xs text-stone-450 mt-1 max-w-md mx-auto">Try selecting a different date scale or click below to view all transactions recorded.</p>
                <button
                  onClick={() => {
                    setDailyStartDate("");
                    setDailyEndDate("");
                    setSelectedDayKey(null);
                  }}
                  className="mt-5 px-5 py-2.5 bg-stone-900 hover:bg-stone-850 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider cursor-pointer"
                  id="btn-reset-filter-range"
                >
                  Reset Filter Range
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fadeIn">
            {/* Days list: span-5 */}
            <div className="lg:col-span-5 space-y-3 max-h-[600px] overflow-y-auto pr-2">
              <p className="text-[10px] font-black text-stone-450 uppercase tracking-wider mb-2 font-extrabold">Select Day to Inspect</p>
              {dailyReports.map((report) => {
                const isActive = report.dateKey === activeDayKey;
                return (
                  <motion.div
                    whileHover={{ scale: 1.015 }}
                    key={report.dateKey}
                    onClick={() => setSelectedDayKey(report.dateKey)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                      isActive 
                        ? "bg-stone-900 border-stone-950 text-white shadow-md shadow-stone-900/10" 
                        : "bg-white border-stone-150 text-stone-900 hover:border-stone-300 hover:bg-stone-50/50"
                    }`}
                  >
                    <div>
                      <p className={`text-[10px] font-extrabold uppercase tracking-widest ${isActive ? "text-stone-300" : "text-stone-400"}`}>
                        {report.dateKey === new Date().toISOString().split("T")[0] ? "⭐ Today" : report.formattedDate.split(",")[0]}
                      </p>
                      <h4 className="font-extrabold font-sans text-sm mt-1">{report.formattedDate}</h4>
                      <p className={`text-xs mt-2 font-medium ${isActive ? "text-stone-400" : "text-stone-500"}`}>
                        {report.transactions.length} sale{report.transactions.length !== 1 ? 's' : ''} &bull; {report.totalQty} item{report.totalQty !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm font-black ${isActive ? "text-emerald-400" : "text-emerald-700"}`}>
                        {Math.round(report.totalSales).toLocaleString()} SAR
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Selected day details table: span-7 */}
            <div className="lg:col-span-7">
              {activeDayReport ? (
                <div className="bg-white rounded-3xl border border-stone-250/65 shadow-md p-6 sticky top-4 animate-fadeIn">
                  <div className="pb-4 border-b border-stone-100">
                    <span className="text-[9px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                      Selected Day Ledger
                    </span>
                    <h3 className="text-lg font-black text-stone-950 mt-1">{activeDayReport.formattedDate}</h3>
                    
                    {/* Tiny stats inside daily details picker */}
                    <div className="grid grid-cols-3 gap-3 mt-4">
                      <div className="bg-stone-50/50 p-2.5 rounded-xl border border-stone-100/80 text-center">
                        <span className="text-[9px] font-black uppercase text-stone-400 tracking-wider">Daily Sales</span>
                        <p className="text-xs font-black text-emerald-700 mt-0.5">{Math.round(activeDayReport.totalSales).toLocaleString()} SAR</p>
                      </div>
                      <div className="bg-stone-50/50 p-2.5 rounded-xl border border-stone-100/80 text-center">
                        <span className="text-[9px] font-black uppercase text-stone-400 tracking-wider">Entries Count</span>
                        <p className="text-xs font-black text-stone-950 mt-0.5">{activeDayReport.transactions.length}</p>
                      </div>
                      <div className="bg-stone-50/50 p-2.5 rounded-xl border border-stone-100/80 text-center">
                        <span className="text-[9px] font-black uppercase text-stone-400 tracking-wider">Total Qty</span>
                        <p className="text-xs font-black text-stone-950 mt-0.5">{activeDayReport.totalQty} Units</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 max-h-[380px] overflow-y-auto divide-y divide-stone-100 pr-1">
                    {activeDayReport.transactions.map((t, index) => {
                      const custName = getCustomerName(t.customer_id);
                      return (
                        <div key={t.id || index} className="py-3 flex justify-between items-center hover:bg-stone-50/30 px-1 rounded-lg">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] font-black text-stone-500 font-mono tracking-tight flex items-center gap-1">
                                <Clock size={10} className="text-stone-400" /> {formatTime(t.date)}
                              </span>
                              <span className="text-[9px] font-extrabold text-stone-700 bg-stone-105 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                {custName}
                              </span>
                            </div>
                            <p className="text-stone-900 font-bold text-sm">{t.product_name || "Stock Item"}</p>
                            <p className="text-stone-450 text-xs font-semibold">
                              {t.price} SAR &times; {t.quantity} unit{t.quantity > 1 ? 's' : ''}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-black text-emerald-800 bg-emerald-50 px-2 py-1 rounded-lg">
                              +{Math.round(t.total_amount).toLocaleString()} SAR
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="bg-stone-50 rounded-2xl border border-dashed border-stone-200 text-center py-20 text-stone-400">
                  Select a day to view its detailed ledger.
                </div>
              )}
            </div>
          </div>
        )}
          </div>
        )}
      </div>
    );
  }  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-stone-900">Khata Summary</h1>
          <p className="text-stone-500 mt-1">Manage outstanding credit and ledger easily.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {onOpenBackup && (
            <button
              onClick={onOpenBackup}
              id="btn-dashboard-excel-backup"
              className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold shadow-sm transition-all flex items-center gap-2.5 text-xs uppercase tracking-wider cursor-pointer font-sans"
            >
              <FileSpreadsheet size={14} className="text-white" />
              <span>📥 Excel Backup</span>
            </button>
          )}

          {onOpenCashReceived && (
            <button
              onClick={onOpenCashReceived}
              id="btn-dashboard-cash-received"
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-stone-950 rounded-xl font-bold shadow-sm transition-all flex items-center gap-2.5 text-xs uppercase tracking-wider cursor-pointer font-sans"
            >
              <Coins size={14} className="text-stone-950" />
              <span>💵 Cash Received</span>
            </button>
          )}

          <button
            onClick={() => onNavigateToProducts("inventory")}
            id="btn-quick-manage-stock"
            className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shadow-sm transition-all flex items-center gap-2.5 text-xs uppercase tracking-wider cursor-pointer font-sans"
          >
            <Layers size={14} className="text-white" />
            <span>📦 Manage Stock</span>
          </button>

          <button
            onClick={() => setShowDailySales(true)}
            id="btn-view-daily-sales"
            className="px-4 py-2.5 bg-stone-900 text-white rounded-xl font-bold shadow-sm hover:bg-stone-850 transition-all flex items-center gap-2.5 text-xs uppercase tracking-wider cursor-pointer border border-stone-800"
          >
            <Calendar size={14} className="text-emerald-400" />
            <span>📅 Daily Sales Log</span>
          </button>
          
          <button
            onClick={onAddTransaction}
            id="btn-quick-new-transaction"
            className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-bold shadow-sm hover:bg-emerald-700 transition-all flex items-center gap-2.5 text-xs uppercase tracking-wider cursor-pointer"
          >
            <span>➕ Add New Entry</span>
          </button>
        </div>
      </div>

      {/* Stats Cards Grid (4 Columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Customers */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm flex items-center justify-between"
          id="stats-total-customers"
        >
          <div>
            <p className="text-stone-400 font-medium text-xs tracking-wider uppercase">Total Customers</p>
            <h3 className="text-3xl font-extrabold text-stone-900 mt-2">{totalCustomers}</h3>
            <button 
              onClick={onNavigateToCustomers} 
              className="text-stone-605 hover:text-emerald-600 text-xs font-semibold mt-3 flex items-center gap-1 transition-colors"
            >
              View all customers &rarr;
            </button>
          </div>
          <div className="p-4 bg-stone-50 rounded-xl text-stone-600">
            <Users size={22} />
          </div>
        </motion.div>

        {/* Total Outstanding Balance (Receivables) */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.08 }}
          className="bg-white p-6 rounded-2xl border border-rose-100 shadow-sm flex items-center justify-between"
          id="stats-total-outstanding"
        >
          <div>
            <p className="text-rose-600/80 font-bold text-xs tracking-wider uppercase flex items-center gap-1">
              <AlertCircle size={14} /> Receivables (Customer Credit)
            </p>
            <h3 className="text-3xl font-extrabold text-rose-600 mt-2">
              {Math.round(totalOutstanding).toLocaleString()} SAR
            </h3>
            <p className="text-stone-500 text-xs mt-3 font-semibold">Owed by customers to store</p>
          </div>
          <div className="p-4 bg-rose-50 rounded-xl text-rose-600">
            <DollarSign size={22} />
          </div>
        </motion.div>

        {/* Total Supplier Payables */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.14 }}
          className="bg-white p-6 rounded-2xl border border-amber-100 shadow-sm flex items-center justify-between"
          id="stats-total-payables"
        >
          <div>
            <p className="text-amber-700/90 font-bold text-xs tracking-wider uppercase flex items-center gap-1">
              <Building2 size={14} /> Total Payables (Owed)
            </p>
            <h3 className="text-3xl font-extrabold text-amber-705 mt-2">
              {Math.round(totalPayables).toLocaleString()} SAR
            </h3>
            <button 
              onClick={() => onNavigateToVendors?.()}
              className="text-amber-700 hover:text-amber-900 text-xs font-semibold mt-3 flex items-center gap-1 transition-colors"
            >
              View vendors ledger &rarr;
            </button>
          </div>
          <div className="p-4 bg-amber-50 rounded-xl text-amber-700">
            <Building2 size={22} />
          </div>
        </motion.div>

        {/* Store Cash Flow Visual / Inventory status */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="bg-white p-6 rounded-2xl border border-emerald-100 shadow-sm flex items-center justify-between"
          id="stats-total-products"
        >
          <div>
            <p className="text-emerald-700 font-medium text-xs tracking-wider uppercase">Live Store Inventory</p>
            <h3 className="text-3xl font-extrabold text-emerald-800 mt-2">
              {Math.round(totalInStoreQuantity).toLocaleString()} <span className="text-[10px] font-bold text-stone-500 uppercase">Units</span>
            </h3>
            <button 
              onClick={() => onNavigateToProducts && onNavigateToProducts("inventory")}
              className="text-emerald-750 hover:text-emerald-900 text-xs font-bold mt-3 flex items-center gap-1 transition-colors"
            >
              View Inventory Sheet ({products.length}) &rarr;
            </button>
          </div>
          <div className="p-4 bg-emerald-50 rounded-xl text-emerald-600">
            <Layers size={22} />
          </div>
        </motion.div>
      </div>

      {/* Accounts & Loans balances section */}
      <div className="mt-8 mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-stone-50 p-4 rounded-xl border border-stone-200/60" id="accounts-balances-section-header">
        <div>
          <h4 className="text-xs font-black text-stone-700 uppercase tracking-widest block">Accounts & Balances (کھاتہ جات اور بیلنس)</h4>
          <p className="text-[10px] text-stone-500 mt-1 font-medium">Real-time balances for petty cash, bank, and loan standing.</p>
        </div>
        <button
          onClick={() => setIsOpeningBalancesModalOpen(true)}
          className="px-3.5 py-2 bg-white hover:bg-stone-100 text-stone-750 hover:text-stone-900 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer border border-stone-300/80 shadow-xs self-start sm:self-center"
        >
          <Settings size={12} className="text-emerald-600 animate-spin-slow" />
          <span>Set Opening Balances (اوپننگ بیلنس)</span>
        </button>
      </div>

      {/* Accounts & Loans balances row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Petty Cash */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-white p-6 rounded-2xl border border-stone-200/95 shadow-xs flex items-center justify-between"
          id="dashboard-petty-cash-card"
        >
          <div>
            <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest block">Available Petty Cash (کیش دراز)</span>
            <h3 className={`text-2xl font-black mt-2 ${pettyCashBalance >= 0 ? "text-stone-900" : "text-rose-600"}`}>
              {Math.round(pettyCashBalance).toLocaleString()} SAR
            </h3>
            <p className="text-stone-450 text-[10px] mt-2 font-bold uppercase tracking-wider">Physical Cash in Hand</p>
          </div>
          <div className="p-3 bg-stone-50 rounded-xl text-stone-600 border border-stone-100">
            <Coins size={18} />
          </div>
        </motion.div>

        {/* Bank Account */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="bg-white p-6 rounded-2xl border border-stone-200/95 shadow-xs flex items-center justify-between"
          id="dashboard-bank-account-card"
        >
          <div>
            <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest block">Bank Balance (بینک اکاؤنٹ)</span>
            <h3 className={`text-2xl font-black mt-2 ${bankBalance >= 0 ? "text-stone-900" : "text-rose-600"}`}>
              {Math.round(bankBalance).toLocaleString()} SAR
            </h3>
            <p className="text-stone-450 text-[10px] mt-2 font-bold uppercase tracking-wider">Digital Bank Balance</p>
          </div>
          <div className="p-3 bg-stone-50 rounded-xl text-stone-600 border border-stone-100">
            <Landmark size={18} />
          </div>
        </motion.div>

        {/* Loans Summary */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="bg-white p-6 rounded-2xl border border-stone-200/95 shadow-xs flex flex-col justify-between animate-fadeIn"
          id="dashboard-loans-card"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest block">Loans Standing (قرضہ اکاؤنٹ)</span>
            <span className="text-[9px] font-black text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md uppercase">Live Summary</span>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mt-3">
            <div className="border-r border-stone-100 pr-2">
              <span className="text-[9px] font-black text-emerald-600 uppercase block">Owed To Us</span>
              <span className="font-extrabold text-sm text-stone-900">{Math.round(totalLoansOwedToUs).toLocaleString()} SAR</span>
            </div>
            <div className="pl-2">
              <span className="text-[9px] font-black text-rose-500 uppercase block">We Owe Others</span>
              <span className="font-extrabold text-sm text-stone-900">{Math.round(totalLoansOwedByUs).toLocaleString()} SAR</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Main Grid: Pending Reminders & Top Debtors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Debtors */}
        <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm flex flex-col">
          <div className="flex justify-between items-center pb-4 border-b border-stone-100">
            <div>
              <h3 className="text-lg font-bold text-stone-900">Debtors list (Sabse Zyada Udhar)</h3>
              <p className="text-stone-500 text-xs mt-0.5">Customers with highest outstanding balances.</p>
            </div>
            <span className="text-rose-500 text-xs font-bold bg-rose-50 px-2 py-1 rounded">Attention Required</span>
          </div>

          {debtors.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 text-stone-400">
              <p className="text-sm font-medium">Mashallah! No pending customer debt.</p>
            </div>
          ) : (
            <div className="divide-y divide-stone-100 max-h-96 overflow-y-auto mt-2">
              {debtors.slice(0, 6).map((cust, i) => (
                <div 
                  key={cust.id}
                  onClick={() => onNavigateToCustomerDetail(cust.id)}
                  className="flex justify-between items-center py-3.5 hover:bg-stone-50 px-2 rounded-xl cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 bg-amber-50 rounded-full flex items-center justify-center text-xs font-bold text-amber-700">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-stone-950 font-semibold text-sm">{cust.name || "Unnamed Customer"}</p>
                      <p className="text-stone-400 text-xs font-medium font-mono">{cust.phone || "No phone"}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-rose-600 font-extrabold text-sm">{Math.round(cust.balance || 0).toLocaleString()} SAR</p>
                    <p className="text-stone-400 text-[10px] font-semibold mt-0.5">Click to collect</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Supplies / Purchase History */}
        <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm flex flex-col justify-between" id="dashboard-purchase-history">
          <div>
            <div className="flex justify-between items-center pb-4 border-b border-stone-100">
              <div>
                <h3 className="text-lg font-bold text-stone-900">Purchase History (Maal Khareedi)</h3>
                <p className="text-stone-500 text-xs mt-0.5">Latest supply re-stock purchases logged from vendors.</p>
              </div>
              <span className="text-amber-700 text-[10px] font-black bg-amber-50 px-2.5 py-1 rounded-lg flex items-center gap-1 uppercase tracking-wider">
                <Clock size={11} className="text-amber-600" /> Recent restocks
              </span>
            </div>

            {allVendorPurchases.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-12 text-stone-400">
                <p className="text-sm font-semibold">No vendor purchases logged yet.</p>
                {onNavigateToVendors && (
                  <button
                    onClick={onNavigateToVendors}
                    className="mt-3 text-xs text-amber-700 hover:text-amber-900 font-extrabold flex items-center gap-1 uppercase cursor-pointer"
                  >
                    Manage Vendors &rarr;
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-stone-100 max-h-96 overflow-y-auto mt-2 pr-1">
                {[...allVendorPurchases]
                  .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
                  .slice(0, 6)
                  .map((pur, i) => {
                    const vendName = getVendorName(pur.vendor_id);
                    const formattedPurchaseDate = pur.date 
                      ? new Date(pur.date).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                      : "No Date";
                    return (
                      <div 
                        key={pur.id || i}
                        className="py-3 px-1 hover:bg-stone-50/50 rounded-xl flex items-center justify-between transition-colors"
                      >
                        <div className="flex items-start gap-2.5">
                          <span className="w-8 h-8 bg-amber-50 rounded-xl flex items-center justify-center text-xs font-bold mt-0.5">
                            📦
                          </span>
                          <div>
                            <p className="text-stone-900 font-bold text-sm tracking-tight">{pur.product_name || "Listed Item"}</p>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              <span className="text-[9px] font-extrabold text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                {vendName}
                              </span>
                              <span className="text-stone-400 text-[10px] font-medium font-mono">
                                {formattedPurchaseDate}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-stone-900 font-extrabold text-sm">
                            {Math.round(pur.total_amount).toLocaleString()} SAR
                          </p>
                          <p className="text-stone-400 text-[10px] font-semibold mt-0.5 leading-none">
                            {pur.cost_price} &times; {pur.quantity}
                          </p>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-stone-100 text-stone-400 text-[11px] font-semibold flex items-center justify-between mt-4">
            <span>Supplier invoices ledger entries</span>
            {onNavigateToVendors && (
              <button 
                onClick={onNavigateToVendors}
                className="text-amber-700 hover:text-amber-900 text-[11px] font-extrabold transition-colors cursor-pointer"
              >
                Go to Vendors page &rarr;
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Guide Rulebook */}
      <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm" id="dashboard-rulebook">
        <h3 className="text-lg font-bold text-stone-900 mb-1">How It Works (Hisaab-Kitaab Rulebook)</h3>
        <p className="text-stone-500 text-xs mb-6">These are the strict business logic rules encoded in this khata book:</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-start gap-4 p-3.5 bg-stone-50/50 rounded-xl border border-stone-100/70">
            <div className="p-2 bg-rose-50/80 rounded-lg text-rose-600 mt-0.5">
              <ArrowUpRight size={18} />
            </div>
            <div>
              <h4 className="font-bold text-sm text-stone-900">Purchase Added (Udhar Diya)</h4>
              <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                Adding a transaction automatically calculates <code className="bg-white px-1 py-0.5 border text-stone-700 font-mono rounded">Qty &times; Price</code> and <strong>adds</strong> it to customer Balance.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-3.5 bg-stone-50/50 rounded-xl border border-stone-100/70">
            <div className="p-2 bg-emerald-50/80 rounded-lg text-emerald-600 mt-0.5">
              <ArrowDownLeft size={18} />
            </div>
            <div>
              <h4 className="font-bold text-sm text-stone-900">Payment Saved (Paisa Mila)</h4>
              <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                Adding a payment entry immediately <strong>subtracts</strong> that amount from customer Balance.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-3.5 bg-stone-50/50 rounded-xl border border-stone-100/70">
            <div className="p-2 bg-indigo-50/80 rounded-lg text-indigo-600 mt-0.5 flex-shrink-0 animate-pulse">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div>
              <h4 className="font-bold text-sm text-stone-900">WhatsApp Notification (Reminders)</h4>
              <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                Directly prefilled reminders can be dispatched on mobile/web WhatsApp to alert customers of outstanding balances instantly.
              </p>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-stone-100 text-stone-400 text-xs font-semibold flex items-center justify-between mt-6">
          <span>Data synced with Cloud Firestore database ID</span>
          <span className="font-mono text-[10px] text-stone-500 bg-stone-50 px-2 py-0.5 rounded border border-stone-100">Realtime</span>
        </div>
      </div>

      <EditOpeningBalancesModal
        isOpen={isOpeningBalancesModalOpen}
        onClose={() => setIsOpeningBalancesModalOpen(false)}
        currentBankOpening={settings.bankOpeningBalance}
        currentCashOpening={settings.cashOpeningBalance}
        onSave={handleSaveOpeningBalances}
      />
    </div>
  );
}
