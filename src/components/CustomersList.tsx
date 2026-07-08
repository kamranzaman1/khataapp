import React, { useState, useEffect } from "react";
import { Customer } from "../types";
import { 
  UserPlus, Search, Phone, Check, Edit2, Trash2, PiggyBank, 
  Filter, Calendar, Printer, Clock, AlertCircle, X 
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface CustomersListProps {
  customers: Customer[];
  onAddCustomer: (name: string, phone: string, openingBalance?: number, customId?: string, pin?: string) => Promise<boolean>;
  onSelectCustomer: (id: string) => void;
  onUpdateCustomer: (id: string, name: string, phone: string, openingBalance?: number, pin?: string) => Promise<boolean>;
  onDeleteCustomer: (id: string) => Promise<boolean>;
  allTransactions?: any[];
  allPayments?: any[];
}

export default function CustomersList({ 
  customers, 
  onAddCustomer, 
  onSelectCustomer,
  onUpdateCustomer,
  onDeleteCustomer,
  allTransactions = [],
  allPayments = []
}: CustomersListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [phoneFilter, setPhoneFilter] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newOpeningBalance, setNewOpeningBalance] = useState("0");
  const [newCustomId, setNewCustomId] = useState("");
  const [newPin, setNewPin] = useState("");
  const [isIdTouched, setIsIdTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Auto-generate memorable ID suggestion when name/phone changes, if user hasn't manually edited the ID
  useEffect(() => {
    if (isIdTouched) return;
    if (!newName.trim()) {
      setNewCustomId("");
      return;
    }

    const prefix = newName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, "")
      .substring(0, 6)
      .toUpperCase() || "CUST";

    const cleanPhone = newPhone.trim().replace(/[^\d]/g, "");
    const last4 = cleanPhone.length >= 4 ? cleanPhone.slice(-4) : "";

    // 1. Try Name-Phone combination if phone exists
    if (last4) {
      const candidate = `${prefix}-${last4}`;
      if (!customers.some(c => c.id.toUpperCase() === candidate.toUpperCase())) {
        setNewCustomId(candidate);
        return;
      }
    }

    // 2. Try Name-Sequential number combination
    let seq = 101;
    while (true) {
      const candidate = `${prefix}-${seq}`;
      if (!customers.some(c => c.id.toUpperCase() === candidate.toUpperCase())) {
        setNewCustomId(candidate);
        return;
      }
      seq++;
    }
  }, [newName, newPhone, isIdTouched, customers]);

  // Suggestions options displayed in UI
  const getEasyIdSuggestions = () => {
    const list: string[] = [];
    if (!newName.trim()) return [];

    const prefix = newName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, "")
      .substring(0, 6)
      .toUpperCase() || "CUST";

    const cleanPhone = newPhone.trim().replace(/[^\d]/g, "");
    const last4 = cleanPhone.length >= 4 ? cleanPhone.slice(-4) : "";

    // Name-sequential
    let nameSeq = 101;
    while (true) {
      const candidate = `${prefix}-${nameSeq}`;
      if (!customers.some(c => c.id.toUpperCase() === candidate.toUpperCase())) {
        list.push(candidate);
        break;
      }
      nameSeq++;
    }

    // Name-Phone
    if (last4) {
      const candidatePhone = `${prefix}-${last4}`;
      if (!customers.some(c => c.id.toUpperCase() === candidatePhone.toUpperCase())) {
        list.push(candidatePhone);
      }
    }

    // Pure numeric sequential ID
    let numSeq = 1001;
    const numericIds = customers
      .map(c => parseInt(c.id, 10))
      .filter(num => !isNaN(num) && num >= 100);
    if (numericIds.length > 0) {
      numSeq = Math.max(...numericIds) + 1;
    }
    while (customers.some(c => c.id === String(numSeq))) {
      numSeq++;
    }
    list.push(String(numSeq));

    return list;
  };

  const suggestions = getEasyIdSuggestions();

  // Editing state
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editOpeningBalance, setEditOpeningBalance] = useState("0");
  const [editPin, setEditPin] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editErrorMessage, setEditErrorMessage] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    if (!newName.trim()) {
      setErrorMessage("Customer name is required.");
      return;
    }

    setLoading(true);
    try {
      const sanitizedPhone = newPhone.trim().replace(/[^\d+]/g, "");
      const res = await onAddCustomer(
        newName.trim(), 
        sanitizedPhone, 
        Number(newOpeningBalance) || 0,
        newCustomId.trim() || undefined,
        newPin.trim()
      );
      if (res) {
        setNewName("");
        setNewPhone("");
        setNewOpeningBalance("0");
        setNewCustomId("");
        setNewPin("");
        setIsIdTouched(false);
        setShowAddForm(false);
        setSuccessMessage("Customer registered successfully with opening balance!");
        setTimeout(() => setSuccessMessage(""), 3000);
      } else {
        setErrorMessage("Failed to add customer. Please try again.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCustomer) return;
    setEditErrorMessage("");

    if (!editName.trim()) {
      setEditErrorMessage("Customer name is required.");
      return;
    }

    setEditLoading(true);
    try {
      const sanitizedPhone = editPhone.trim().replace(/[^\d+]/g, "");
      const res = await onUpdateCustomer(
        editCustomer.id,
        editName.trim(),
        sanitizedPhone,
        Number(editOpeningBalance) || 0,
        editPin.trim()
      );
      if (res) {
        setEditCustomer(null);
        setSuccessMessage("Customer profile updated successfully!");
        setTimeout(() => setSuccessMessage(""), 3000);
      } else {
        setEditErrorMessage("Failed to modify customer profile.");
      }
    } catch (err: any) {
      setEditErrorMessage(err.message || "An error occurred.");
    } finally {
      setEditLoading(false);
    }
  };

  // Filter States
  const [balanceFilter, setBalanceFilter] = useState<"all" | "outstanding" | "advance" | "zero">("all");
  const [pendingDurationFilter, setPendingDurationFilter] = useState<"all" | "15" | "30" | "60" | "90">("all");
  const [oldestFromDate, setOldestFromDate] = useState("");
  const [oldestToDate, setOldestToDate] = useState("");
  const [minBalance, setMinBalance] = useState("");
  const [maxBalance, setMaxBalance] = useState("");
  const [noPaymentOnly, setNoPaymentOnly] = useState(false);
  const [noPaymentFromDate, setNoPaymentFromDate] = useState("");
  const [noPaymentToDate, setNoPaymentToDate] = useState("");

  const num = (v: any) => (typeof v === "number" ? v : Number(v) || 0);

  const getCustomerLedgerStats = (customerId: string, balance: number) => {
    const custTx = (allTransactions || [])
      .filter(t => t.customer_id === customerId)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const custPay = (allPayments || [])
      .filter(p => p.customer_id === customerId)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const oldestPurchaseDate = custTx[0]?.date ? new Date(custTx[0].date).toISOString().split("T")[0] : null;
    const oldestPurchaseDisplay = custTx[0]?.date ? new Date(custTx[0].date).toLocaleDateString() : "No Purchase";
    const lastPurchaseDate = custTx[custTx.length - 1]?.date ? new Date(custTx[custTx.length - 1].date).toLocaleDateString() : "No Purchase";
    const lastPaymentDate = custPay[custPay.length - 1]?.date ? new Date(custPay[custPay.length - 1].date).toLocaleDateString() : "No Payment";

    let daysPending = 0;
    if (balance > 0 && custTx[0]?.date) {
      daysPending = Math.floor((new Date().getTime() - new Date(custTx[0].date).getTime()) / (1000 * 60 * 60 * 24));
    }

    return {
      oldestPurchaseDate,
      oldestPurchaseDisplay,
      lastPurchaseDate,
      lastPaymentDate,
      daysPending: daysPending > 0 ? `${daysPending} Days` : "0 Days",
      daysPendingNum: daysPending
    };
  };

  const handlePrintList = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow popups to print the ledger list.");
      return;
    }

    const todayStr = new Date().toLocaleDateString();
    const rowsHtml = filteredCustomers.map((cust, idx) => {
      const stats = getCustomerLedgerStats(cust.id, num(cust.balance));
      const isOwed = cust.balance > 0;
      const balanceText = isOwed 
        ? `${Math.round(cust.balance).toLocaleString()} SAR` 
        : cust.balance < 0 
          ? `${Math.round(Math.abs(cust.balance)).toLocaleString()} SAR (Adv)` 
          : "0 SAR";
      
      return `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 10px 8px; text-align: center; font-weight: bold; font-family: monospace;">${idx + 1}</td>
          <td style="padding: 10px 8px; font-weight: bold;">${cust.name || "Unnamed"}</td>
          <td style="padding: 10px 8px; font-family: monospace;">${cust.phone || "-"}</td>
          <td style="padding: 10px 8px; text-align: right; font-weight: 800; color: ${isOwed ? '#dc2626' : '#059669'}; font-family: monospace;">
            ${balanceText}
          </td>
          <td style="padding: 10px 8px; text-align: center; font-family: monospace;">
            ${stats.oldestPurchaseDisplay || "-"}
          </td>
          <td style="padding: 10px 8px; text-align: center; font-weight: bold; color: ${stats.daysPendingNum > 30 ? '#d97706' : '#4b5563'}; font-family: monospace;">
            ${stats.daysPending}
          </td>
        </tr>
      `;
    }).join("");

    const totalOutstanding = filteredCustomers
      .filter(c => c.balance > 0)
      .reduce((sum, c) => sum + num(c.balance), 0);

    const printHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Outstanding Khata Follow-up Report (${todayStr})</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1f2937; margin: 30px; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #111827; padding-bottom: 15px; margin-bottom: 25px; }
          .title-area h1 { margin: 0; font-size: 24px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
          .title-area p { margin: 5px 0 0 0; font-size: 12px; color: #4b5563; font-weight: 500; }
          .meta-info { text-align: right; font-size: 12px; color: #4b5563; line-height: 1.6; }
          .summary-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px 20px; margin-bottom: 25px; display: inline-block; min-width: 250px; }
          .summary-card h4 { margin: 0 0 5px 0; font-size: 10px; text-transform: uppercase; color: #6b7280; letter-spacing: 1px; }
          .summary-card p { margin: 0; font-size: 20px; font-weight: 900; color: #b91c1c; font-family: monospace; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
          th { background: #f3f4f6; padding: 10px 8px; font-weight: 700; text-align: left; border-bottom: 2px solid #e5e7eb; color: #374151; font-size: 11px; text-transform: uppercase; }
          @media print {
            body { margin: 15px; font-size: 12px; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; background: #fffbeb; padding: 10px 15px; border-radius: 6px; border: 1px solid #fef3c7;" id="print-header-actions">
          <span style="font-size: 12px; color: #b45309; font-weight: 600;">Outstanding Khata Follow-up Report Generated</span>
          <button onclick="window.print();" style="background: #111827; color: #fff; border: none; padding: 8px 16px; font-weight: bold; border-radius: 6px; cursor: pointer; font-size: 12px;">🖨️ Print Report / Save PDF</button>
        </div>
        
        <div class="header">
          <div class="title-area">
            <h1>Outstanding Credit Report (ادھار رپورٹ)</h1>
            <p>Realtime customer ledger balance and aging report for follow-up verification.</p>
          </div>
          <div class="meta-info">
            <strong>Date:</strong> ${todayStr}<br>
            <strong>Generated By:</strong> Khata Book Master CRM<br>
            <strong>Filters Active:</strong> Status: ${balanceFilter === 'outstanding' ? 'Owed Only' : balanceFilter === 'all' ? 'All' : balanceFilter}, Duration: ${pendingDurationFilter !== 'all' ? `Owed > ${pendingDurationFilter} Days` : 'All'}
          </div>
        </div>

        <div class="summary-card">
          <h4>Total Filtered Outstanding (کل بقایا رقم)</h4>
          <p>${Math.round(totalOutstanding).toLocaleString()} SAR</p>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 50px; text-align: center;">#</th>
              <th>Customer Name (نام)</th>
              <th>Phone Number</th>
              <th style="text-align: right;">Owed Balance (SAR)</th>
              <th style="text-align: center;">Oldest Udhar Date</th>
              <th style="text-align: center;">Days Pending</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="6" style="padding: 20px; text-align: center; color: #9ca3af;">No customers matched the print criteria.</td></tr>'}
          </tbody>
        </table>

        <div style="margin-top: 40px; border-top: 1px dashed #d1d5db; padding-top: 15px; text-align: center; font-size: 10px; color: #9ca3af;">
          Report compiled automatically. Verify ledger transactions if there are any pending disputes. Confirmed via Firestore Secure Ledger.
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(printHtml);
    printWindow.document.close();
  };

  // Filtering list
  const filteredCustomers = customers.filter(cust => {
    const name = cust.name || "";
    const phone = cust.phone || "";
    const matchesName = name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPhone = phone.includes(phoneFilter);
    
    // Balance Filter
    let matchesBalance = true;
    if (balanceFilter === "outstanding") {
      matchesBalance = cust.balance > 0;
    } else if (balanceFilter === "advance") {
      matchesBalance = cust.balance < 0;
    } else if (balanceFilter === "zero") {
      matchesBalance = cust.balance === 0;
    }

    // Ledger Stats calculation for filter logic
    const stats = getCustomerLedgerStats(cust.id, num(cust.balance));

    // Pending Duration Filter
    let matchesDuration = true;
    if (pendingDurationFilter !== "all") {
      const days = stats.daysPendingNum;
      const minDays = Number(pendingDurationFilter);
      matchesDuration = days >= minDays;
    }

    // Date Filter
    let matchesDate = true;
    if (oldestFromDate && stats.oldestPurchaseDate) {
      matchesDate = matchesDate && (stats.oldestPurchaseDate >= oldestFromDate);
    }
    if (oldestToDate && stats.oldestPurchaseDate) {
      matchesDate = matchesDate && (stats.oldestPurchaseDate <= oldestToDate);
    }
    // If we filtered by date but customer has no purchase, they should not match
    if ((oldestFromDate || oldestToDate) && !stats.oldestPurchaseDate) {
      matchesDate = false;
    }

    // Outstanding Balance Amount Range Filter
    let matchesAmountRange = true;
    if (minBalance !== "") {
      const minVal = Number(minBalance);
      if (!isNaN(minVal)) {
        matchesAmountRange = matchesAmountRange && (cust.balance >= minVal);
      }
    }
    if (maxBalance !== "") {
      const maxVal = Number(maxBalance);
      if (!isNaN(maxVal)) {
        matchesAmountRange = matchesAmountRange && (cust.balance <= maxVal);
      }
    }

    // No Payment received filter
    let matchesNoPayment = true;
    if (noPaymentOnly) {
      const custPayments = (allPayments || []).filter(p => p.customer_id === cust.id);
      const paymentsInRange = custPayments.filter(p => {
        const pDate = p.date ? new Date(p.date).toISOString().split("T")[0] : "";
        if (noPaymentFromDate && pDate < noPaymentFromDate) return false;
        if (noPaymentToDate && pDate > noPaymentToDate) return false;
        return true;
      });
      // If they received any payments in this range, they do not match the filter
      if (paymentsInRange.length > 0) {
        matchesNoPayment = false;
      }
    }

    return matchesName && matchesPhone && matchesBalance && matchesDuration && matchesDate && matchesAmountRange && matchesNoPayment;
  });

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-stone-900 tracking-tight">Customers list</h1>
          <p className="text-stone-500 text-sm mt-1">Manage profiles, configure opening balance, and view account records.</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          id="btn-toggle-add-customer"
          className="px-4 py-2 bg-stone-900 text-white hover:bg-stone-800 rounded-xl font-semibold shadow-sm text-sm transition-all flex items-center gap-2"
        >
          <UserPlus size={16} />
          <span>{showAddForm ? "Close Form" : "New Customer"}</span>
        </button>
      </div>

      {successMessage && (
        <div className="bg-emerald-50 text-emerald-800 text-xs px-4 py-3 rounded-xl border border-emerald-100 flex items-center gap-2 font-medium">
          <Check size={16} />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Add Customer Collapsible Form */}
      {showAddForm && (
        <motion.form 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          onSubmit={handleCreate}
          className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm space-y-4 overflow-hidden"
          id="add-customer-form"
        >
          <h3 className="font-bold text-stone-900 text-base">Register New Khata Holder</h3>
          {errorMessage && (
            <p className="text-rose-500 text-xs font-semibold">{errorMessage}</p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Asif Bhai"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 focus:border-stone-400 rounded-xl outline-none text-stone-900 text-sm font-medium transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">
                Phone (WhatsApp)
              </label>
              <input
                type="text"
                placeholder="e.g. 966512345678"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 focus:border-stone-400 rounded-xl outline-none text-stone-900 text-sm font-mono transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">
                Opening Balance (SAR)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                  <PiggyBank size={14} />
                </div>
                <input
                  type="number"
                  placeholder="e.g. 150"
                  value={newOpeningBalance}
                  onChange={(e) => setNewOpeningBalance(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-stone-50 border border-stone-200 focus:border-stone-400 rounded-xl outline-none text-stone-900 text-sm font-mono transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5 flex justify-between">
                <span>Unique Customer ID</span>
                <span className="text-emerald-600 font-bold font-sans">آن لائن کوڈ</span>
              </label>
              <input
                type="text"
                placeholder="e.g. ASIF-001 (Optional)"
                value={newCustomId}
                onChange={(e) => {
                  setIsIdTouched(true);
                  setNewCustomId(e.target.value);
                }}
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-250 focus:border-stone-400 rounded-xl outline-none text-stone-900 text-sm font-mono font-bold transition-colors"
              />
              
              {/* Easy Memorable Suggestions */}
              {suggestions.length > 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">Tap to apply:</span>
                  {suggestions.map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => {
                        setIsIdTouched(true);
                        setNewCustomId(sug);
                      }}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold transition-all border cursor-pointer ${
                        newCustomId === sug
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-stone-100 hover:bg-stone-200 text-stone-700 border-stone-200"
                      }`}
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5 flex justify-between">
                <span>Login PIN / Passcode</span>
                <span className="text-emerald-600 font-bold font-sans">پن کوڈ / پاس ورڈ</span>
              </label>
              <input
                type="text"
                placeholder="e.g. 1234 (Optional)"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-250 focus:border-stone-400 rounded-xl outline-none text-stone-900 text-sm font-mono font-bold transition-colors"
              />
            </div>
          </div>
          <span className="text-[10px] text-stone-400 mt-1 block">
            Note: Use country formats (e.g. 966XXXXXXXXX). If you assign a <strong>Unique Customer ID</strong>, the customer can instantly use it to view their khata online. Positive Opening Balance is initial debt (UDHAR); Negative is advance.
          </span>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setNewName("");
                setNewPhone("");
                setNewOpeningBalance("0");
                setNewCustomId("");
                setNewPin("");
                setIsIdTouched(false);
              }}
              className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold rounded-lg text-xs transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-semibold rounded-lg text-xs transition flex items-center gap-1.5"
            >
              {loading ? "Registering..." : "Add Profile"}
            </button>
          </div>
        </motion.form>
      )}

      {/* Search and Advanced Filters */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200/60 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="font-extrabold text-stone-900 text-sm flex items-center gap-2">
              <Filter size={16} className="text-emerald-600" />
              <span>Filter & Follow-up Controls (فلٹرز اور فالو اپ)</span>
            </h3>
            <p className="text-[11px] text-stone-500 font-medium">Narrow down debtors, check pending ages, and extract clean reports.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handlePrintList}
              id="btn-print-filtered-khata"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-sm shadow-indigo-100 cursor-pointer"
            >
              <Printer size={13} />
              <span>🖨️ Print Follow-up List</span>
            </button>
            {(balanceFilter !== "all" || pendingDurationFilter !== "all" || oldestFromDate || oldestToDate || searchTerm || phoneFilter || minBalance || maxBalance || noPaymentOnly || noPaymentFromDate || noPaymentToDate) && (
              <button
                type="button"
                onClick={() => {
                  setBalanceFilter("all");
                  setPendingDurationFilter("all");
                  setOldestFromDate("");
                  setOldestToDate("");
                  setSearchTerm("");
                  setPhoneFilter("");
                  setMinBalance("");
                  setMaxBalance("");
                  setNoPaymentOnly(false);
                  setNoPaymentFromDate("");
                  setNoPaymentToDate("");
                }}
                className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl text-xs flex items-center gap-1 transition-all cursor-pointer"
              >
                <X size={13} />
                <span>Clear All</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t border-stone-100">
          {/* Text Searches */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-extrabold text-stone-500 uppercase tracking-wider">Search Name</label>
            <div className="flex items-center bg-stone-50 border border-stone-200 focus-within:border-stone-400 rounded-xl px-3 py-2 transition-all">
              <Search size={14} className="text-stone-400" />
              <input
                type="text"
                placeholder="Search customer by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-2 bg-transparent text-xs text-stone-900 outline-none placeholder-stone-400 font-semibold"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-extrabold text-stone-500 uppercase tracking-wider">Phone Number</label>
            <div className="flex items-center bg-stone-50 border border-stone-200 focus-within:border-stone-400 rounded-xl px-3 py-2 transition-all">
              <Phone size={13} className="text-stone-400" />
              <input
                type="text"
                placeholder="Filter by phone..."
                value={phoneFilter}
                onChange={(e) => setPhoneFilter(e.target.value)}
                className="w-full pl-2 bg-transparent text-xs text-stone-900 outline-none placeholder-stone-400 font-mono font-semibold"
              />
            </div>
          </div>

          {/* Balance Filter dropdown */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-extrabold text-stone-500 uppercase tracking-wider">Outstanding Status</label>
            <select
              value={balanceFilter}
              onChange={(e: any) => setBalanceFilter(e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-800 focus:border-stone-400 outline-none cursor-pointer"
            >
              <option value="all">All Statuses (تمام گاہک)</option>
              <option value="outstanding">Only with Outstanding Balance (صرف ادھار والے)</option>
              <option value="advance">Only with Advance Deposits (ایڈوانس والے)</option>
              <option value="zero">No Pending Balance (بغیر بقایا والے)</option>
            </select>
          </div>

          {/* Aging/Duration filter */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-extrabold text-stone-500 uppercase tracking-wider">Pending Since (کتنا پرانا ہے)</label>
            <select
              value={pendingDurationFilter}
              onChange={(e: any) => setPendingDurationFilter(e.target.value)}
              disabled={balanceFilter === "advance" || balanceFilter === "zero"}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-800 focus:border-stone-400 outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="all">Any Duration (تمام مدت)</option>
              <option value="15">Pending &gt; 15 Days (&gt; 15 دن پرانا)</option>
              <option value="30">Pending &gt; 30 Days (&gt; 30 دن پرانا)</option>
              <option value="60">Pending &gt; 60 Days (&gt; 60 دن پرانا)</option>
              <option value="90">Pending &gt; 90 Days (&gt; 90 دن پرانا)</option>
            </select>
          </div>
        </div>

        {/* Date Ranges for oldest purchase */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div className="space-y-1.5">
            <label className="block text-[10px] font-extrabold text-stone-500 uppercase tracking-wider flex items-center gap-1">
              <Calendar size={11} className="text-emerald-600" />
              <span>Oldest Udhar Date: From (تاریخ سے)</span>
            </label>
            <input
              type="date"
              value={oldestFromDate}
              onChange={(e) => setOldestFromDate(e.target.value)}
              className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-850 outline-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-[10px] font-extrabold text-stone-500 uppercase tracking-wider flex items-center gap-1">
              <Calendar size={11} className="text-emerald-600" />
              <span>Oldest Udhar Date: To (تاریخ تک)</span>
            </label>
            <input
              type="date"
              value={oldestToDate}
              onChange={(e) => setOldestToDate(e.target.value)}
              className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-850 outline-none"
            />
          </div>
        </div>

        {/* Outstanding Balance Ranges */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div className="space-y-1.5">
            <label className="block text-[10px] font-extrabold text-stone-500 uppercase tracking-wider flex items-center gap-1">
              <span>💰 Min Udhar Amount (کم سے کم ادھار)</span>
            </label>
            <input
              type="number"
              placeholder="e.g. 0"
              value={minBalance}
              onChange={(e) => setMinBalance(e.target.value)}
              className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-850 outline-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-[10px] font-extrabold text-stone-500 uppercase tracking-wider flex items-center gap-1">
              <span>💰 Max Udhar Amount (زیادہ سے زیادہ ادھار)</span>
            </label>
            <input
              type="number"
              placeholder="e.g. 10000"
              value={maxBalance}
              onChange={(e) => setMaxBalance(e.target.value)}
              className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-850 outline-none"
            />
          </div>
        </div>

        {/* No Payment Received Filter */}
        <div className="pt-3 border-t border-stone-100 space-y-3">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="no-payment-only-checkbox"
              checked={noPaymentOnly}
              onChange={(e) => setNoPaymentOnly(e.target.checked)}
              className="w-4 h-4 text-rose-600 focus:ring-rose-500 border-stone-300 rounded cursor-pointer"
            />
            <label htmlFor="no-payment-only-checkbox" className="text-xs font-extrabold text-stone-850 cursor-pointer select-none flex items-center gap-1.5">
              <span>🚫 Show customers with NO payments received (صرف وہ گاہک جن سے کوئی رقم وصول نہیں ہوئی)</span>
            </label>
          </div>

          {noPaymentOnly && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 bg-rose-50/40 p-4 rounded-xl border border-rose-100/50">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold text-rose-800 uppercase tracking-wider flex items-center gap-1">
                  <Calendar size={11} className="text-rose-600" />
                  <span>No Payment Received From (اس تاریخ سے)</span>
                </label>
                <input
                  type="date"
                  value={noPaymentFromDate}
                  onChange={(e) => setNoPaymentFromDate(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-rose-200 rounded-xl text-xs font-semibold text-stone-850 outline-none focus:border-rose-400"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold text-rose-800 uppercase tracking-wider flex items-center gap-1">
                  <Calendar size={11} className="text-rose-600" />
                  <span>No Payment Received To (اس تاریخ تک)</span>
                </label>
                <input
                  type="date"
                  value={noPaymentToDate}
                  onChange={(e) => setNoPaymentToDate(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-rose-200 rounded-xl text-xs font-semibold text-stone-850 outline-none focus:border-rose-400"
                />
              </div>
              <div className="sm:col-span-2">
                <p className="text-[10px] text-rose-700 font-medium leading-relaxed">
                  * This filters the list to show only customers who made <strong>zero (0) payments</strong> between the chosen dates. Highly useful for managing weekly or monthly collection follow-ups.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Customer List Container */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
        {filteredCustomers.length === 0 ? (
          <div className="text-center py-16 text-stone-400 flex flex-col items-center justify-center">
            <p className="font-semibold text-base mb-1">No customers found</p>
            <p className="text-xs text-stone-400 max-w-xs">Double check your spelling or register a new customer profile above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-stone-100">
              <thead className="bg-stone-50">
                <tr>
                  <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-stone-400 uppercase tracking-wider">
                    Customer Details
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-stone-400 uppercase tracking-wider">
                    Oldest Udhar Date
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-stone-400 uppercase tracking-wider">
                    Days Pending
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-stone-400 uppercase tracking-wider">
                    Ledger Status
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-right text-xs font-bold text-stone-400 uppercase tracking-wider">
                    Balance
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-right text-xs font-bold text-stone-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredCustomers.map((cust) => {
                  const isDebtor = cust.balance > 0;
                  const isClean = cust.balance === 0;
                  const stats = getCustomerLedgerStats(cust.id, num(cust.balance));
                  
                  return (
                    <tr 
                      key={cust.id}
                      className="hover:bg-stone-50/50 transition-colors duration-150 cursor-pointer text-stone-900"
                      onClick={() => onSelectCustomer(cust.id)}
                    >
                      <td className="px-6 py-4.5 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base ${isDebtor ? 'bg-amber-50 text-amber-800' : isClean ? 'bg-stone-100 text-stone-600' : 'bg-emerald-50 text-emerald-800'}`}>
                            {(cust.name || "Unnamed").substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="text-stone-900 font-bold text-sm leading-tight">{cust.name || "Unnamed Customer"}</p>
                              <span className="bg-emerald-50 text-emerald-800 border border-emerald-100/50 px-1.5 py-0.5 rounded text-[9px] font-bold font-mono" title="Unique ID for Online Access">
                                {cust.id}
                              </span>
                            </div>
                            <p className="text-stone-400 text-xs font-medium font-mono mt-0.5">{cust.phone || "No phone linked"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4.5 whitespace-nowrap text-stone-700 text-xs font-semibold font-mono">
                        {stats.oldestPurchaseDisplay}
                      </td>
                      <td className="px-6 py-4.5 whitespace-nowrap">
                        {stats.daysPendingNum > 0 ? (
                          <span className={`inline-flex items-center gap-1 text-xs font-bold font-mono px-2 py-0.5 rounded ${
                            stats.daysPendingNum > 60 
                              ? 'bg-rose-50 text-rose-700 border border-rose-150' 
                              : stats.daysPendingNum > 30 
                                ? 'bg-amber-50 text-amber-700 border border-amber-150' 
                                : 'bg-stone-105 text-stone-700'
                          }`}>
                            <Clock size={11} />
                            {stats.daysPending}
                          </span>
                        ) : (
                          <span className="text-stone-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4.5 whitespace-nowrap">
                        {isDebtor ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                            Udhar Outstanding (Owes)
                          </span>
                        ) : isClean ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-stone-100 text-stone-600">
                            No Pending Balance
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                            Advance Deposit (Credit)
                          </span>
                        )}
                        {cust.openingBalance !== undefined && cust.openingBalance !== 0 && (
                          <span className="text-[10px] text-stone-400 block mt-1">Opening Bal: {Math.round(cust.openingBalance).toLocaleString()} SAR</span>
                        )}
                      </td>
                      <td className="px-6 py-4.5 whitespace-nowrap text-right font-mono">
                        <span className={`text-sm font-extrabold ${isDebtor ? 'text-rose-600' : isClean ? 'text-stone-800' : 'text-emerald-700'}`}>
                          {(cust.balance ?? 0) >= 0 ? `${Math.round(cust.balance ?? 0).toLocaleString()}` : `${Math.round(Math.abs(cust.balance ?? 0)).toLocaleString()}`} SAR
                          {(cust.balance ?? 0) < 0 && <span className="text-[10px] font-bold uppercase ml-1 block text-emerald-600 leading-none">Prepaid</span>}
                        </span>
                      </td>
                      <td className="px-6 py-4.5 whitespace-nowrap text-right text-xs font-semibold space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectCustomer(cust.id);
                          }}
                          className="px-3.5 py-1.5 bg-stone-100 text-stone-700 rounded-lg hover:bg-stone-200 transition-colors"
                        >
                          Show Ledger
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditCustomer(cust);
                            setEditName(cust.name || "");
                            setEditPhone(cust.phone || "");
                            setEditOpeningBalance(String(cust.openingBalance ?? 0));
                            setEditPin(cust.pin || "");
                          }}
                          className="px-2.5 py-1.5 bg-stone-50 hover:bg-amber-50 hover:text-amber-800 text-stone-700 rounded-lg border border-stone-200 hover:border-amber-200 transition-colors inline-flex items-center gap-1"
                        >
                          <Edit2 size={12} />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (window.confirm(`Are you sure you want to permanently delete customer "${cust.name}"? This deletes their ledger profile.`)) {
                              await onDeleteCustomer(cust.id);
                            }
                          }}
                          className="px-2.5 py-1.5 bg-stone-50 hover:bg-rose-50 hover:text-rose-800 text-rose-600 rounded-lg border border-stone-200 hover:border-rose-200 transition-colors inline-flex items-center gap-1"
                        >
                          <Trash2 size={12} />
                          <span>Delete</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Customer Dialog Modal */}
      <AnimatePresence>
        {editCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-2xl p-6 shadow-xl border border-stone-100 space-y-4"
              id="edit-customer-modal"
            >
              <div className="flex justify-between items-center pb-2 border-b border-stone-100">
                <h3 className="font-extrabold text-stone-900 text-base">✏️ Edit Customer Profile</h3>
                <button
                  onClick={() => setEditCustomer(null)}
                  className="text-stone-400 hover:text-stone-600 text-sm font-semibold"
                >
                  Close
                </button>
              </div>

              {editErrorMessage && (
                <p className="text-rose-500 text-xs font-semibold">{editErrorMessage}</p>
              )}

              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5 flex justify-between">
                    <span>Unique Customer ID</span>
                    <span className="text-emerald-600 font-bold font-sans font-medium">آن لائن لاگ ان کوڈ</span>
                  </label>
                  <input
                    type="text"
                    value={editCustomer.id}
                    disabled
                    className="w-full px-3.5 py-2.5 bg-stone-100 border border-stone-200 rounded-xl font-mono text-stone-500 text-sm outline-none cursor-not-allowed font-black"
                  />
                  <span className="text-[10px] text-stone-400 mt-1 block">This unique access key is locked and cannot be changed.</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5 flex justify-between">
                    <span>Portal Password / PIN</span>
                    <span className="text-emerald-600 font-bold font-sans">لاگ ان پاس ورڈ / پن کوڈ</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 1234"
                    value={editPin}
                    onChange={(e) => setEditPin(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-mono text-stone-900 text-sm outline-none font-bold"
                  />
                  <span className="text-[10px] text-stone-400 mt-1 block">Set an optional passcode/password for customer portal login.</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">
                    Customer Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-medium text-stone-900 text-sm outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">
                    Phone (WhatsApp)
                  </label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="e.g. 966512345678"
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-mono text-stone-900 text-sm outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">
                    Opening Balance (SAR)
                  </label>
                  <input
                    type="number"
                    value={editOpeningBalance}
                    onChange={(e) => setEditOpeningBalance(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-mono text-stone-900 text-sm outline-none"
                  />
                  <span className="text-[10px] text-stone-400 mt-1 block">Editing this adjusts the current balance directly by the difference.</span>
                </div>

                <div className="flex justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditCustomer(null)}
                    className="px-4 py-2 bg-stone-100 text-stone-700 font-semibold text-xs rounded-lg hover:bg-stone-200 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editLoading}
                    className="px-5 py-2 bg-stone-900 text-white font-semibold text-xs rounded-lg hover:bg-stone-800 disabled:bg-stone-400 transition"
                  >
                    {editLoading ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
