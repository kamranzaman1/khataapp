import React, { useState, useEffect } from "react";
import { Product, Transaction, Expense, Customer, Payment } from "../types";
import { 
  DollarSign, TrendingUp, TrendingDown, Calendar, 
  Trash2, PlusCircle, AlertCircle, ShoppingCart, 
  Briefcase, ArrowDownRight, ArrowUpRight, Check, RefreshCw, Coins 
} from "lucide-react";
import { motion } from "motion/react";

interface ProfitLossStatementProps {
  products: Product[];
  customers?: Customer[];
}

type DateRange = "today" | "week" | "month" | "year" | "all";

export default function ProfitLossStatement({ products, customers = [] }: ProfitLossStatementProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [showPaymentsDetail, setShowPaymentsDetail] = useState(false);
  const [paymentSearchQuery, setPaymentSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<DateRange>("all");
  
  // Loading & Action states
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // New Expense form state
  const [category, setCategory] = useState("Rent");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [expenseAccount, setExpenseAccount] = useState<"cash" | "bank">("cash");
  const [showAddExpense, setShowAddExpense] = useState(false);

  const categories = ["Rent", "Wages/Salary", "Electricity/Utilities", "Internet/Phone", "Tea/Meals", "Transport/Fuel", "Packaging", "Loss/Spoil", "Miscellaneous"];

  // Fetch P&L Data
  const fetchPLData = async () => {
    setLoading(true);
    setError("");
    try {
      const [transRes, expRes, payRes] = await Promise.all([
        fetch("/api/transactions"),
        fetch("/api/expenses"),
        fetch("/api/payments")
      ]);

      if (transRes.ok && expRes.ok && payRes.ok) {
        const transData = await transRes.json();
        const expData = await expRes.json();
        const payData = await payRes.json();
        setTransactions(Array.isArray(transData) ? transData : []);
        setExpenses(Array.isArray(expData) ? expData : []);
        setPayments(Array.isArray(payData) ? payData : []);
      } else {
        setError("Failed to fetch transaction, expense, or payment histories from server.");
      }
    } catch (err: any) {
      console.error(err);
      setError("Server connection issue. Please dry refresh.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPLData();
  }, []);

  // Filtered Lists depending on range
  const getFilteredData = () => {
    const now = new Date();
    let minDate = new Date(0); // Epoch beginning

    if (dateRange === "today") {
      minDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (dateRange === "week") {
      minDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (dateRange === "month") {
      minDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    } else if (dateRange === "year") {
      minDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    }

    const filteredTrans = transactions.filter(t => new Date(t.date) >= minDate);
    const filteredExps = expenses.filter(e => new Date(e.date) >= minDate);
    const filteredPays = payments.filter(p => new Date(p.date) >= minDate);

    return { filteredTrans, filteredExps, filteredPays };
  };

  const { filteredTrans, filteredExps, filteredPays } = getFilteredData();

  // Payments Calculations
  const totalPaymentsReceived = filteredPays.reduce((sum, p) => sum + (p.amount ?? 0), 0);
  const paymentsCount = filteredPays.length;

  // Filter payments by search query
  const filteredPaymentsList = filteredPays.filter(p => {
    if (!paymentSearchQuery.trim()) return true;
    const customer = customers.find(c => c.id === p.customer_id);
    const name = customer ? customer.name.toLowerCase() : "";
    return name.includes(paymentSearchQuery.toLowerCase());
  });

  // Group payments by date
  const paymentsGroupedByDate = React.useMemo(() => {
    const groups: Record<string, Payment[]> = {};
    filteredPaymentsList.forEach(p => {
      const dKey = p.date ? p.date.split("T")[0] : "No Date";
      if (!groups[dKey]) {
        groups[dKey] = [];
      }
      groups[dKey].push(p);
    });
    // Sort dates descending
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredPaymentsList]);

  // Today's summary calculations (آج کی کل وصولی)
  const todayDateStr = React.useMemo(() => {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    const localDate = new Date(d.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
  }, []);

  const todayPayments = React.useMemo(() => {
    return payments.filter(p => p.date && p.date.split("T")[0] === todayDateStr);
  }, [payments, todayDateStr]);

  const todayTotalAmount = React.useMemo(() => {
    return todayPayments.reduce((sum, p) => sum + (p.amount ?? 0), 0);
  }, [todayPayments]);

  const todayCustomersCount = React.useMemo(() => {
    const uniqueIds = new Set(todayPayments.map(p => p.customer_id));
    return uniqueIds.size;
  }, [todayPayments, todayPayments]);

  const formatDateString = (dateStr: string) => {
    if (dateStr === "No Date") return "No Date Specified";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric"
      });
    } catch {
      return dateStr;
    }
  };

  // Save Expense Action
  const handleAddExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const expAmount = Number(amount);
    if (isNaN(expAmount) || expAmount <= 0) {
      setError("Please provide a valid expense amount greater than 0.");
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          amount: expAmount,
          account: expenseAccount,
          date: date ? new Date(date).toISOString() : new Date().toISOString(),
          description: description.trim()
        })
      });

      if (res.ok) {
        setSuccess("Expense logged successfully!");
        setAmount("");
        setDescription("");
        setExpenseAccount("cash");
        setShowAddExpense(false);
        await fetchPLData(); // Refresh dataset
        setTimeout(() => setSuccess(""), 3000);
      } else {
        setError("Failed to submit expense to ledger.");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Expense Action
  const handleDeleteExpense = async (id: string) => {
    if (!confirm("Are you sure you want to delete this expense record?")) return;

    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/expenses/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setSuccess("Expense deleted successfully!");
        await fetchPLData();
        setTimeout(() => setSuccess(""), 3000);
      } else {
        setError("Could not delete expense.");
      }
    } catch (err: any) {
      setError(err.message || "Error deleting expense.");
    }
  };

  // Financial Calculations
  // 1. Revenue
  const totalRevenue = filteredTrans.reduce((sum, t) => sum + (t.total_amount ?? 0), 0);

  // 2. Cost of Goods Sold (COGS)
  // For each transaction, we find the corresponding product catalog's costPrice.
  // If product is deleted or doesn't have costPrice, fallback to 70% of product price at the transaction time.
  const totalCOGS = filteredTrans.reduce((sum, t) => {
    const prod = products.find(p => p.id === t.product_id);
    const costPerItem = prod?.costPrice !== undefined 
      ? prod.costPrice 
      : Math.round(t.price * 0.7 * 100) / 100;
    return sum + (costPerItem * (t.quantity || 1));
  }, 0);

  // 3. Gross Profit
  const grossProfit = totalRevenue - totalCOGS;

  // 4. Operating Expenses (OPEX)
  const totalOPEX = filteredExps.reduce((sum, e) => sum + (e.amount ?? 0), 0);

  // 5. Net Profit
  const netProfit = grossProfit - totalOPEX;
  const netProfitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
  const grossProfitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

  // Expense breakdown by Category
  const expenseByCategory = filteredExps.reduce((acc: Record<string, number>, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-stone-900">Profit & Loss Statement</h1>
          <p className="text-stone-500 mt-1">Real-time store dashboard monitoring retail margins, COGS, and operational expenses.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchPLData}
            disabled={loading}
            className="p-2.5 bg-stone-50 hover:bg-stone-100 text-stone-600 rounded-xl border border-stone-200 transition-all"
            title="Reload financial data"
          >
            <RefreshCw size={15} className={loading ? "animate-spin text-emerald-600" : ""} />
          </button>
          <button
            onClick={() => setShowAddExpense(!showAddExpense)}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-sm transition-all flex items-center gap-2"
          >
            <PlusCircle size={15} />
            <span>{showAddExpense ? "Hide Ledger Form" : "Log Store Expense"}</span>
          </button>
        </div>
      </div>

      {/* Date Filter & Cash Received Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-stone-50 p-4.5 rounded-3xl border border-stone-200">
        <div className="flex flex-col gap-1 w-full sm:w-auto">
          <span className="text-[10px] font-black uppercase text-stone-400 tracking-wider">Statement Period Filter</span>
          <div className="flex items-center gap-1.5 p-1 bg-stone-150 rounded-xl w-full sm:max-w-sm">
            {(["all", "year", "month", "week", "today"] as const).map((range) => {
              const labels: Record<DateRange, string> = {
                all: "All Time",
                year: "Past Year",
                month: "Past Month",
                week: "Past Week",
                today: "Today"
              };
              return (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`flex-1 px-2.5 py-1.5 text-center text-[11px] font-extrabold rounded-lg transition-all capitalize cursor-pointer ${dateRange === range ? "bg-white text-stone-950 shadow-xs" : "text-stone-500 hover:text-stone-900"}`}
                >
                  {labels[range]}
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={() => setShowPaymentsDetail(!showPaymentsDetail)}
          id="btn-statement-toggle-payments"
          className={`px-4.5 py-3 rounded-2xl border text-xs font-black uppercase tracking-wider flex items-center justify-between gap-3 transition-all cursor-pointer w-full sm:w-auto ${
            showPaymentsDetail
              ? "bg-amber-500 border-amber-500 text-stone-950 shadow-md font-sans"
              : "bg-white border-stone-250 text-stone-700 hover:text-stone-950 hover:bg-stone-50 font-sans shadow-xs"
          }`}
          title="Toggle customer payments collected in this period"
        >
          <div className="flex items-center gap-2">
            <Coins size={15} className={showPaymentsDetail ? "text-stone-950" : "text-amber-500"} />
            <span>💰 Cash Collected (وصولی)</span>
          </div>
          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${showPaymentsDetail ? 'bg-stone-950 text-amber-400' : 'bg-stone-100 text-stone-700'}`}>
            {Math.round(totalPaymentsReceived).toLocaleString()} SAR ({paymentsCount})
          </span>
        </button>
      </div>

      {/* Cash Received Detailed Panel */}
      {showPaymentsDetail && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="bg-stone-900 text-stone-150 p-6 rounded-3xl border border-stone-850 shadow-xl space-y-5 overflow-hidden"
          id="statement-payments-panel"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-850">
            <div>
              <h3 className="font-black text-amber-400 text-sm flex items-center gap-2">
                <Coins size={16} className="text-amber-400" />
                <span>Customer Cash Received Statement (وصول شدہ رقم کی تفصیل)</span>
              </h3>
              <p className="text-stone-400 text-[10px] mt-0.5">Date-wise chronological ledger of cash collected from accounts.</p>
            </div>
            
            <div className="flex items-center gap-3 self-start sm:self-auto">
              <span className="text-[11px] font-black text-emerald-400 bg-stone-950 px-3 py-1.5 rounded-xl border border-stone-850">
                Total Cash Received: {Math.round(totalPaymentsReceived).toLocaleString()} SAR
              </span>
              <button
                onClick={() => setShowPaymentsDetail(false)}
                className="p-1.5 hover:bg-stone-850 text-stone-400 hover:text-white rounded-xl transition cursor-pointer text-xs"
                title="Hide Details"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Today's Quick Statistics Panel */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 bg-stone-950 p-4.5 rounded-2xl border border-stone-850">
            <div className="space-y-0.5">
              <span className="text-[10px] font-black text-stone-450 uppercase tracking-widest block">Today's Total Cash (آج کی کل وصولی)</span>
              <div className="text-lg font-black text-emerald-400 font-mono">
                {Math.round(todayTotalAmount).toLocaleString()} SAR
              </div>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] font-black text-stone-450 uppercase tracking-widest block">Customers Paid Today (گاہکوں کی تعداد)</span>
              <div className="text-lg font-black text-stone-100 font-mono">
                {todayCustomersCount} {todayCustomersCount === 1 ? "Customer" : "Customers"}
              </div>
            </div>
            <div className="flex items-center justify-start sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setDateRange("today");
                  setPaymentSearchQuery("");
                }}
                className={`px-3.5 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                  dateRange === "today" 
                    ? "bg-amber-400 border-amber-400 text-stone-950 font-sans" 
                    : "bg-stone-900 border-stone-800 text-amber-400 hover:bg-stone-850 hover:text-amber-300 font-sans"
                }`}
              >
                <span>📅 Filter Today Only (صرف آج کا دیکھیں)</span>
              </button>
            </div>
          </div>

          {/* Search bar inside details */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative w-full max-w-sm">
              <input
                type="text"
                placeholder="Search by customer name..."
                value={paymentSearchQuery}
                onChange={(e) => setPaymentSearchQuery(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-xs font-bold text-white placeholder-stone-600 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition"
                id="statement-payment-search"
              />
            </div>
            <div className="text-[10px] font-bold text-stone-400">
              Showing {filteredPaymentsList.length} of {paymentsCount} payments in this period
            </div>
          </div>

          {/* Payments list grouped by date */}
          {paymentsGroupedByDate.length === 0 ? (
            <div className="py-12 text-center text-xs text-stone-500 font-bold">
              No cash payments received in this range or matching your search.
            </div>
          ) : (
            <div className="space-y-6 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
              {paymentsGroupedByDate.map(([dateKey, items]) => {
                const dayTotal = items.reduce((sum, p) => sum + (p.amount ?? 0), 0);
                return (
                  <div key={dateKey} className="space-y-2.5">
                    {/* Date Heading Header with day total */}
                    <div className="flex items-center justify-between bg-stone-950/60 p-3 rounded-2xl border border-stone-850">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                        <span className="text-xs font-black text-amber-300">
                          {formatDateString(dateKey)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] text-stone-500 uppercase font-black mr-2 tracking-wider">Day Total:</span>
                        <span className="text-xs font-black text-emerald-400 font-mono">
                          {Math.round(dayTotal).toLocaleString()} SAR
                        </span>
                      </div>
                    </div>

                    {/* Payments under this date */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pl-1">
                      {items.map((p) => {
                        const customer = customers.find(c => c.id === p.customer_id);
                        const custName = customer ? customer.name : "Deleted Customer";
                        const phone = customer ? customer.phone : "";
                        
                        return (
                          <div key={p.id} className="p-3.5 bg-stone-950/40 hover:bg-stone-900/60 border border-stone-850/80 rounded-2xl flex items-center justify-between transition-all">
                            <div className="space-y-1">
                              <span className="font-extrabold text-xs text-stone-100 block">{custName}</span>
                              {phone && <span className="text-[9px] text-stone-500 block font-semibold">{phone}</span>}
                              <span className="text-[9px] text-stone-500 font-mono block font-bold">
                                {p.date ? new Date(p.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                              </span>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <span className="text-xs font-black text-emerald-400 font-mono">
                                +{Math.round(p.amount).toLocaleString()} SAR
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      )}

      {/* Status messages */}
      {success && (
        <div className="bg-emerald-50 text-emerald-800 text-xs px-4 py-3 rounded-xl border border-emerald-100 flex items-center gap-2 font-medium">
          <Check size={16} />
          <span>{success}</span>
        </div>
      )}
      {error && (
        <div className="bg-rose-50 text-rose-800 text-xs px-4 py-3 rounded-xl border border-rose-100 flex items-center gap-2 font-medium">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Expense Addition Form drawer overlay */}
      {showAddExpense && (
        <motion.form
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          onSubmit={handleAddExpenseSubmit}
          className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm space-y-4 overflow-hidden"
        >
          <h3 className="font-bold text-stone-900 text-base">Register New Outflow / Expense</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">Expense Class / Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl outline-none text-stone-900 text-sm font-medium focus:border-stone-400 focus:bg-white"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">Amount Paid (SAR)</label>
              <input
                type="number"
                step="any"
                min="0.1"
                placeholder="e.g. 150"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl outline-none text-stone-900 text-sm font-medium focus:border-stone-400 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">Date Paid</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl outline-none text-stone-900 text-sm font-medium focus:border-stone-400 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">Payment From Account</label>
              <select
                value={expenseAccount}
                onChange={(e) => setExpenseAccount(e.target.value as "cash" | "bank")}
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl outline-none text-stone-900 text-sm font-medium focus:border-stone-400 focus:bg-white"
              >
                <option value="cash">Petty Cash</option>
                <option value="bank">Bank Account</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">Description / Remarks (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Paid shop electricity bill for June / Milk pack spoilage loss"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl outline-none text-stone-900 text-sm font-medium focus:border-stone-400 focus:bg-white"
            />
          </div>
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={actionLoading}
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white font-semibold text-xs rounded-lg transition"
            >
              {actionLoading ? "Saving..." : "Log Store Expense"}
            </button>
          </div>
        </motion.form>
      )}

      {/* Loader indicator */}
      {loading ? (
        <div className="bg-white py-12 rounded-2xl border border-stone-100 flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 rounded-full border-2 border-stone-100 border-t-rose-500 animate-spin"></div>
          <span className="text-xs font-mono text-stone-400 uppercase tracking-wider">Syncing Ledger Calculations...</span>
        </div>
      ) : (
        <>
          {/* Main 5 P&L Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            
            {/* 1. Revenue Card */}
            <div className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-stone-400 font-bold text-[10px] uppercase tracking-wider block">1. Gross Revenue</span>
                <h3 className="text-2xl font-black text-stone-900 mt-1 font-mono">{Math.round(totalRevenue).toLocaleString()} SAR</h3>
              </div>
              <div className="flex items-center gap-1.5 text-stone-400 text-xs mt-3 select-none">
                <ShoppingCart size={13} />
                <span>{filteredTrans.length} sales receipts</span>
              </div>
            </div>

            {/* 2. COGS Card */}
            <div className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-stone-400 font-bold text-[10px] uppercase tracking-wider block">2. Cost of Goods</span>
                <h3 className="text-2xl font-black text-stone-600 mt-1 font-mono">-{Math.round(totalCOGS).toLocaleString()} SAR</h3>
              </div>
              <div className="mt-3 flex items-center justify-between text-stone-400 text-xs">
                <span>Margin: {grossProfitMargin.toFixed(0)}%</span>
                <span className="text-[10px] font-semibold text-stone-500">Inventory Cost</span>
              </div>
            </div>

            {/* 3. Gross Profit Card */}
            <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-emerald-700 font-bold text-[10px] uppercase tracking-wider block">3. Gross Profit</span>
                <h3 className="text-2xl font-black text-emerald-700 mt-1 font-mono">{Math.round(grossProfit).toLocaleString()} SAR</h3>
              </div>
              <div className="flex items-center gap-1 text-emerald-600 text-xs mt-3">
                <TrendingUp size={13} />
                <span>Profit markup baseline</span>
              </div>
            </div>

            {/* 4. OPEX Card */}
            <div className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-stone-400 font-bold text-[10px] uppercase tracking-wider block">4. Operating Expenses</span>
                <h3 className="text-2xl font-black text-rose-600 mt-1 font-mono">-{Math.round(totalOPEX).toLocaleString()} SAR</h3>
              </div>
              <div className="flex items-center justify-between text-stone-400 text-xs mt-3">
                <span>{filteredExps.length} entries</span>
                <span className="text-[10px] font-semibold text-rose-500">Rent, Bills, spoilage</span>
              </div>
            </div>

            {/* 5. Net Profit / Loss Card */}
            <div className={`p-5 rounded-2xl border shadow-sm flex flex-col justify-between ${netProfit >= 0 ? 'bg-emerald-50/50 border-emerald-100' : 'bg-rose-50/40 border-rose-100'}`}>
              <div>
                <span className={`font-bold text-[10px] uppercase tracking-wider block ${netProfit >= 0 ? "text-emerald-800" : "text-rose-800"}`}>
                  5. Net profit / (Loss)
                </span>
                <h3 className={`text-3xl font-extrabold mt-1 font-mono ${netProfit >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                  {Math.round(netProfit).toLocaleString()} SAR
                </h3>
              </div>
              <div className="flex items-center justify-between text-xs mt-3">
                <span className={`flex items-center gap-1 font-bold ${netProfit >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                  {netProfit >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                  <span>{netProfitMargin.toFixed(1)}% ratio</span>
                </span>
              </div>
            </div>

          </div>

          {/* Visual statement breakdown and expenses lists */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Col: Ledger structure */}
            <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-stone-100 shadow-sm">
              <h3 className="text-base font-bold text-stone-900 pb-4 border-b border-stone-100">Merchant P&L Breakdown</h3>
              
              <div className="divide-y divide-stone-100 font-medium text-sm text-stone-600 mt-4 space-y-4">
                
                {/* Revenue rows */}
                <div className="pt-2 flex justify-between text-stone-950 font-bold">
                  <span>Gross Sales (Revenues)</span>
                  <span>{Math.round(totalRevenue).toLocaleString()} SAR</span>
                </div>

                {/* COGS rows */}
                <div className="pt-3 flex justify-between">
                  <span className="pl-4 text-stone-500">Total Goods Sold Cost (COGS)</span>
                  <span>({Math.round(totalCOGS).toLocaleString()}) SAR</span>
                </div>

                {/* Gross Margin */}
                <div className="pt-3 flex justify-between text-emerald-800 font-bold bg-emerald-50/20 px-3 py-1.5 rounded-lg">
                  <span>Gross Operating Profit</span>
                  <span>{Math.round(grossProfit).toLocaleString()} SAR</span>
                </div>

                {/* Expense List block */}
                <div className="pt-3 space-y-2">
                  <div className="flex justify-between font-bold text-stone-800">
                    <span>Operating Expenses (OPEX)</span>
                    <span className="text-rose-600">({Math.round(totalOPEX).toLocaleString()}) SAR</span>
                  </div>

                  {/* Individual Categories inside breakdown */}
                  <div className="pl-6 space-y-2 text-xs text-stone-500 font-mono">
                    {categories.map((c) => {
                      const val = expenseByCategory[c] || 0;
                      if (!val) return null;
                      return (
                        <div key={c} className="flex justify-between">
                          <span>{c}</span>
                          <span>- {Math.round(val).toLocaleString()} SAR</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Net operating profit */}
                <div className={`pt-4 flex justify-between font-black text-base px-3 py-2 rounded-xl border ${netProfit >= 0 ? "bg-emerald-50 border-emerald-100 text-emerald-800" : "bg-rose-50 border-rose-100 text-rose-800"}`}>
                  <span>Net Net Profit / (Loss)</span>
                  <span>{Math.round(netProfit).toLocaleString()} SAR</span>
                </div>

              </div>

              {/* visual distribution bar of Sales versus (COGS + Expenses) */}
              <div className="mt-8 pt-4 border-t border-stone-100">
                <span className="text-xs font-bold text-stone-400 uppercase tracking-wider block mb-3">Revenue Allocation Visual</span>
                {totalRevenue > 0 ? (
                  <div className="space-y-4">
                    <div className="w-full h-4 bg-stone-100 rounded-full flex overflow-hidden">
                      {/* COGS Segment */}
                      <div 
                        style={{ width: `${(totalCOGS / totalRevenue) * 100}%` }} 
                        className="bg-stone-400" 
                        title={`COGS: ${((totalCOGS / totalRevenue) * 100).toFixed(0)}%`}
                      />
                      {/* Expenses Segment */}
                      <div 
                        style={{ width: `${(totalOPEX / totalRevenue) * 100}%` }} 
                        className="bg-rose-500" 
                        title={`Expenses: ${((totalOPEX / totalRevenue) * 100).toFixed(0)}%`}
                      />
                      {/* Net Margin Segment if profitable */}
                      {netProfit > 0 && (
                        <div 
                          style={{ width: `${(netProfit / totalRevenue) * 100}%` }} 
                          className="bg-emerald-500" 
                          title={`Net Profit: ${((netProfit / totalRevenue) * 100).toFixed(0)}%`}
                        />
                      )}
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 text-[10px] font-bold text-stone-500 uppercase tracking-wider text-center">
                      <div className="flex items-center gap-1.5 justify-center">
                        <span className="w-2.5 h-2.5 bg-stone-400 rounded-xs block"></span> Table Cost ({((totalCOGS / totalRevenue) * 100).toFixed(0)}%)
                      </div>
                      <div className="flex items-center gap-1.5 justify-center">
                        <span className="w-2.5 h-2.5 bg-rose-500 rounded-xs block"></span> Expenses ({((totalOPEX / totalRevenue) * 100).toFixed(0)}%)
                      </div>
                      <div className="flex items-center gap-1.5 justify-center">
                        <span className="w-2.5 h-2.5 bg-emerald-500 rounded-xs block"></span> Profit Margin ({netProfit > 0 ? `${((netProfit / totalRevenue) * 100).toFixed(0)}%` : "0%"})
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-stone-400 font-medium italic">Record invoice credit purchases on Udhar ledger to load charts.</p>
                )}
              </div>

            </div>

            {/* Right Col: Expense Entries Logs table */}
            <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-stone-100 shadow-sm flex flex-col">
              <div className="pb-4 border-b border-stone-100 flex justify-between items-center">
                <div>
                  <h3 className="text-base font-bold text-stone-900">Expenses Logbook</h3>
                  <p className="text-stone-400 text-xs mt-0.5">Track real cash outflow records.</p>
                </div>
                <span className="text-stone-900 font-black text-sm bg-stone-50 px-2.5 py-1 rounded-lg border border-stone-100 font-mono">
                  {Math.round(totalOPEX).toLocaleString()} SAR
                </span>
              </div>

              {filteredExps.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mb-3">
                    <Briefcase size={20} />
                  </div>
                  <h4 className="text-sm font-bold text-stone-800">No Operating Expenses Logged</h4>
                  <p className="text-stone-400 text-xs px-6 mt-1 max-w-xs">
                    Press the "Log Store Expense" button to record operating overhead like electricity, rent, wages, etc.
                  </p>
                </div>
              ) : (
                <div className="flex-grow overflow-y-auto max-h-[420px] mt-4 space-y-3 pr-1">
                  {filteredExps.map((e) => (
                    <div key={e.id} className="p-3 bg-stone-50 hover:bg-stone-50/80 rounded-xl border border-stone-100 flex items-start justify-between gap-2.5 transition">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-stone-900 leading-tight">
                            {e.category}
                          </span>
                          <span className="text-[10px] text-stone-400 font-mono">
                            {new Date(e.date).toLocaleDateString()}
                          </span>
                        </div>
                        {e.description && (
                          <p className="text-stone-500 text-xs leading-normal">
                            {e.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="font-extrabold text-sm text-stone-950 font-mono">
                          {Math.round(e.amount).toLocaleString()} SAR
                        </span>
                        <button
                          onClick={() => handleDeleteExpense(e.id)}
                          className="p-1 hover:bg-rose-50 text-stone-400 hover:text-rose-600 rounded-lg transition"
                          title="Delete entry"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>

          </div>
        </>
      )}

    </div>
  );
}
