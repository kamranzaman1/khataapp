import React, { useState, useEffect, useMemo } from "react";
import { LoanPartner, LoanTransaction } from "../types";
import { 
  PlusCircle, Search, User, Phone, ArrowUpRight, ArrowDownLeft, 
  Trash2, Landmark, Coins, AlertCircle, Check, History, ArrowLeft, Plus, Landmark as BankIcon 
} from "lucide-react";
import { motion } from "motion/react";

interface LoansListProps {
  onRefreshGlobal?: () => void;
}

export default function LoansList({ onRefreshGlobal }: LoansListProps) {
  const [partners, setPartners] = useState<LoanPartner[]>([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [selectedPartnerDetail, setSelectedPartnerDetail] = useState<{
    partner: LoanPartner;
    transactions: LoanTransaction[];
  } | null>(null);

  // Form toggles
  const [showAddPartnerForm, setShowAddPartnerForm] = useState(false);
  const [showAddTransactionForm, setShowAddTransactionForm] = useState(false);

  // Add Partner form fields
  const [partnerName, setPartnerName] = useState("");
  const [partnerPhone, setPartnerPhone] = useState("");
  const [partnerOpeningBalance, setPartnerOpeningBalance] = useState(""); // positive = we gave, negative = we took
  const [partnerBalanceType, setPartnerBalanceType] = useState<"given" | "taken">("given");

  // Add Transaction form fields
  const [txType, setTxType] = useState<"given" | "taken" | "repayment_sent" | "repayment_received">("given");
  const [txAmount, setTxAmount] = useState("");
  const [txAccount, setTxAccount] = useState<"cash" | "bank">("cash");
  const [txDescription, setTxDescription] = useState("");

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");

  // System states
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Fetch Loan Partners
  const fetchPartners = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/loans/partners");
      if (res.ok) {
        const data = await res.json();
        setPartners(Array.isArray(data) ? data : []);
      } else {
        setError("Failed to load loan accounts.");
      }
    } catch (err: any) {
      setError("Server connection issue while fetching partners.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch Partner details
  const fetchPartnerDetail = async (id: string) => {
    setError("");
    try {
      const [partnerRes, txRes] = await Promise.all([
        fetch(`/api/loans/partners/${id}`),
        fetch(`/api/loans/transactions?partner_id=${id}`)
      ]);

      if (partnerRes.ok && txRes.ok) {
        const partner = await partnerRes.json();
        const transactions = await txRes.json();
        setSelectedPartnerDetail({ partner, transactions });
      } else {
        setError("Failed to fetch detailed loan ledger statement.");
      }
    } catch (err) {
      setError("Failed to load partner ledger entries.");
    }
  };

  useEffect(() => {
    fetchPartners();
  }, []);

  const handlePartnerSelect = async (id: string) => {
    setSelectedPartnerId(id);
    await fetchPartnerDetail(id);
  };

  // Create Partner
  const handleAddPartnerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!partnerName.trim()) {
      setError("Name is required.");
      return;
    }

    const initialBal = Number(partnerOpeningBalance) || 0;
    // Positive means they owe us (loan given by us), negative means we owe them (loan taken from them)
    const adjustedBalance = partnerBalanceType === "given" ? initialBal : -initialBal;

    setActionLoading(true);
    try {
      const res = await fetch("/api/loans/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: partnerName.trim(),
          phone: partnerPhone.trim(),
          openingBalance: adjustedBalance
        })
      });

      if (res.ok) {
        setSuccess("Loan account partner registered successfully!");
        setPartnerName("");
        setPartnerPhone("");
        setPartnerOpeningBalance("");
        setShowAddPartnerForm(false);
        await fetchPartners();
        if (onRefreshGlobal) onRefreshGlobal();
        setTimeout(() => setSuccess(""), 4000);
      } else {
        const errData = await res.json();
        setError(errData.error || "Failed to create loan partner.");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Partner
  const handleDeletePartner = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this loan account? All historical ledger data for this contact will be lost.")) return;

    setError("");
    setSuccess("");
    setActionLoading(true);
    try {
      const res = await fetch(`/api/loans/partners/${id}`, {
        method: "DELETE"
      });

      if (res.ok) {
        setSuccess("Loan account deleted from system.");
        setSelectedPartnerId(null);
        setSelectedPartnerDetail(null);
        await fetchPartners();
        if (onRefreshGlobal) onRefreshGlobal();
        setTimeout(() => setSuccess(""), 3000);
      } else {
        setError("Failed to delete loan partner. Ensure they have zero balance or no active transactions.");
      }
    } catch (err) {
      setError("Network error while deleting partner.");
    } finally {
      setActionLoading(false);
    }
  };

  // Create Loan Transaction
  const handleAddTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!selectedPartnerId) return;
    const amt = Number(txAmount);
    if (isNaN(amt) || amt <= 0) {
      setError("Please specify a valid loan amount.");
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch("/api/loans/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partner_id: selectedPartnerId,
          type: txType,
          amount: amt,
          account: txAccount,
          description: txDescription.trim()
        })
      });

      if (res.ok) {
        setSuccess(`Loan transaction logged and account adjusted!`);
        setTxAmount("");
        setTxDescription("");
        setShowAddTransactionForm(false);
        // Refresh partner detail and partner list
        await fetchPartnerDetail(selectedPartnerId);
        await fetchPartners();
        if (onRefreshGlobal) onRefreshGlobal();
        setTimeout(() => setSuccess(""), 4000);
      } else {
        const errData = await res.json();
        setError(errData.error || "Failed to register loan transaction.");
      }
    } catch (err) {
      setError("Network issue. Transaction failed to post.");
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Transaction
  const handleDeleteTransaction = async (txId: string) => {
    if (!window.confirm("Are you sure you want to delete this transaction entry? This will reverse the partner's balance and the corresponding account balance.")) return;

    setError("");
    setSuccess("");
    setActionLoading(true);
    try {
      const res = await fetch(`/api/loans/transactions/${txId}`, {
        method: "DELETE"
      });

      if (res.ok) {
        setSuccess("Ledger entry reversed successfully!");
        if (selectedPartnerId) {
          await fetchPartnerDetail(selectedPartnerId);
        }
        await fetchPartners();
        if (onRefreshGlobal) onRefreshGlobal();
        setTimeout(() => setSuccess(""), 4000);
      } else {
        setError("Failed to reverse ledger entry.");
      }
    } catch (err) {
      setError("Network failure while reversing entry.");
    } finally {
      setActionLoading(false);
    }
  };

  // Filter partners
  const filteredPartners = useMemo(() => {
    if (!searchQuery.trim()) return partners;
    const q = searchQuery.toLowerCase();
    return partners.filter(p => 
      p.name.toLowerCase().includes(q) || 
      (p.phone && p.phone.toLowerCase().includes(q))
    );
  }, [partners, searchQuery]);

  const formatDateString = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6" id="loans-section">
      {/* Page header and title */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-stone-900 tracking-tight">
            Loans Account Manager (قرضہ اکاؤنٹ)
          </h1>
          <p className="text-stone-500 text-xs font-semibold uppercase tracking-wider mt-1">
            Record loans given & taken, track outstanding balances, and match with Petty Cash/Bank.
          </p>
        </div>
        
        {!selectedPartnerId && (
          <button
            onClick={() => setShowAddPartnerForm(!showAddPartnerForm)}
            className="px-5 py-2.5 bg-stone-900 hover:bg-stone-850 text-white text-xs font-black uppercase tracking-wider rounded-xl transition flex items-center gap-2 cursor-pointer self-start md:self-auto"
            id="btn-add-partner"
          >
            <PlusCircle size={15} />
            <span>{showAddPartnerForm ? "Hide Form" : "Add Loan Partner (نیا قرضہ اکاؤنٹ)"}</span>
          </button>
        )}
      </div>

      {success && (
        <div className="bg-emerald-50 text-emerald-800 text-xs font-extrabold px-4 py-3 rounded-xl border border-emerald-150 flex items-center gap-2">
          <Check size={16} className="stroke-[3]" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 text-rose-800 text-xs font-extrabold px-4 py-3 rounded-xl border border-rose-150 flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Conditional: Detail Ledger of single selected Partner */}
      {selectedPartnerId && selectedPartnerDetail ? (
        <div className="space-y-6">
          {/* Partner Detail Header */}
          <div className="bg-white p-6 rounded-3xl border border-stone-150 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  setSelectedPartnerId(null);
                  setSelectedPartnerDetail(null);
                  fetchPartners();
                }}
                className="p-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl transition cursor-pointer"
                title="Go Back"
              >
                <ArrowLeft size={16} />
              </button>
              <div>
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Active Loan Ledger</span>
                <h2 className="text-xl font-black text-stone-900 flex items-center gap-2 mt-0.5">
                  <span>{selectedPartnerDetail.partner.name}</span>
                  {selectedPartnerDetail.partner.phone && (
                    <span className="text-xs text-stone-450 font-bold font-mono">({selectedPartnerDetail.partner.phone})</span>
                  )}
                </h2>
              </div>
            </div>

            {/* Balances summary */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest block">Net Loan Balance</span>
                <div className="flex items-center justify-end gap-1.5 mt-0.5">
                  <span className={`text-xl font-black ${
                    selectedPartnerDetail.partner.balance > 0 
                      ? "text-emerald-700" 
                      : selectedPartnerDetail.partner.balance < 0 
                      ? "text-rose-600" 
                      : "text-stone-500"
                  }`}>
                    {Math.round(Math.abs(selectedPartnerDetail.partner.balance)).toLocaleString()} SAR
                  </span>
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-stone-100 text-stone-600 uppercase">
                    {selectedPartnerDetail.partner.balance > 0 ? "They Owe Us (ہمیں ملنا ہے)" : selectedPartnerDetail.partner.balance < 0 ? "We Owe Them (ہم نے دینا ہے)" : "Settled"}
                  </span>
                </div>
              </div>

              <div className="h-10 w-[1px] bg-stone-150 mx-2 hidden md:block"></div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowAddTransactionForm(!showAddTransactionForm)}
                  className="px-4 py-2.5 bg-stone-900 hover:bg-stone-850 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Log Loan Action</span>
                </button>
                <button
                  onClick={() => handleDeletePartner(selectedPartnerDetail.partner.id)}
                  className="p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition cursor-pointer"
                  title="Delete Entire Partner Account"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* New Loan Transaction Drawer */}
          {showAddTransactionForm && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              onSubmit={handleAddTransactionSubmit}
              className="bg-white p-6 rounded-3xl border border-stone-200/85 shadow-sm space-y-4 overflow-hidden"
            >
              <h3 className="font-bold text-stone-900 text-base">Record New Loan Action (قرضہ کا اندراج)</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">Action Type (قسم)</label>
                  <select
                    value={txType}
                    onChange={(e) => setTxType(e.target.value as any)}
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-250 rounded-xl outline-none text-stone-900 text-sm font-bold focus:border-stone-400 focus:bg-white"
                  >
                    <option value="given">Loan Given (ہم نے ادھار دیا)</option>
                    <option value="taken">Loan Taken (ہم نے قرض لیا)</option>
                    <option value="repayment_sent">Repayment Sent (ہم نے واپس کیا)</option>
                    <option value="repayment_received">Repayment Received (ہمیں واپس ملا)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">Amount (رقم)</label>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    placeholder="0.00"
                    value={txAmount}
                    onChange={(e) => setTxAmount(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-250 rounded-xl outline-none text-stone-900 text-sm font-black focus:border-stone-400 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">Match Account</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTxAccount("cash")}
                      className={`py-2.5 px-3 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-bold transition cursor-pointer ${
                        txAccount === "cash"
                          ? "border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-600/20"
                          : "border-stone-250 bg-stone-50 hover:bg-stone-100 text-stone-600"
                      }`}
                    >
                      <Coins size={13} />
                      <span>Cash</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTxAccount("bank")}
                      className={`py-2.5 px-3 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-bold transition cursor-pointer ${
                        txAccount === "bank"
                          ? "border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-600/20"
                          : "border-stone-250 bg-stone-50 hover:bg-stone-100 text-stone-600"
                      }`}
                    >
                      <BankIcon size={13} />
                      <span>Bank</span>
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">Remarks / Details</label>
                  <input
                    type="text"
                    placeholder="e.g. Returned shop construction loan"
                    value={txDescription}
                    onChange={(e) => setTxDescription(e.target.value)}
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-250 rounded-xl outline-none text-stone-900 text-sm font-medium focus:border-stone-400 focus:bg-white"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-2 gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddTransactionForm(false)}
                  className="px-4 py-2 text-stone-500 hover:text-stone-900 font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 disabled:bg-stone-550 text-white font-black text-xs uppercase tracking-wider rounded-lg transition cursor-pointer"
                >
                  {actionLoading ? "Saving entry..." : "Post Loan Transaction"}
                </button>
              </div>
            </motion.form>
          )}

          {/* Historical Ledger Statement of Partner */}
          <div className="bg-white p-6 rounded-3xl border border-stone-150 shadow-xs">
            <h3 className="text-base font-black text-stone-900 pb-4 border-b border-stone-100 flex items-center gap-2">
              <History size={16} />
              <span>Statement Ledger for {selectedPartnerDetail.partner.name}</span>
            </h3>

            {selectedPartnerDetail.transactions.length === 0 ? (
              <div className="py-12 text-center text-stone-400">
                <p className="text-sm font-medium">No active loan transactions logged yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-stone-600 divide-y divide-stone-150 mt-4">
                  <thead>
                    <tr className="text-[10px] font-black text-stone-400 uppercase tracking-wider">
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Action Type</th>
                      <th className="py-3 px-4 text-center">Account Match</th>
                      <th className="py-3 px-4">Description</th>
                      <th className="py-3 px-4 text-right">Debit / Credit</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 font-bold">
                    {selectedPartnerDetail.transactions.map((tx) => {
                      let typeLabel = "";
                      let typeStyle = "";
                      let displayAmount = tx.amount;
                      let isIncrement = true;

                      switch (tx.type) {
                        case "given":
                          typeLabel = "Loan Given";
                          typeStyle = "bg-emerald-50 text-emerald-800 border-emerald-100";
                          isIncrement = true;
                          break;
                        case "taken":
                          typeLabel = "Loan Taken";
                          typeStyle = "bg-rose-50 text-rose-800 border-rose-100";
                          isIncrement = false;
                          break;
                        case "repayment_sent":
                          typeLabel = "Repayment Sent";
                          typeStyle = "bg-blue-50 text-blue-800 border-blue-100";
                          isIncrement = true;
                          break;
                        case "repayment_received":
                          typeLabel = "Repayment Received";
                          typeStyle = "bg-amber-50 text-amber-800 border-amber-100";
                          isIncrement = false;
                          break;
                      }

                      return (
                        <tr key={tx.id} className="hover:bg-stone-50 transition-colors">
                          <td className="py-3 px-4 text-stone-400 font-mono text-[10px]">
                            {formatDateString(tx.date)}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-md border text-[10px] font-black uppercase tracking-wider ${typeStyle}`}>
                              {typeLabel}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="inline-flex items-center gap-1 text-[10px] text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md">
                              {tx.account === "bank" ? <BankIcon size={10} /> : <Coins size={10} />}
                              <span className="capitalize">{tx.account === "bank" ? "Bank" : "Cash"}</span>
                            </span>
                          </td>
                          <td className="py-3 px-4 text-stone-700">
                            {tx.description || <span className="text-stone-300 font-normal">--</span>}
                          </td>
                          <td className={`py-3 px-4 text-right font-black text-sm ${isIncrement ? "text-emerald-700" : "text-rose-600"}`}>
                            {isIncrement ? "+" : "-"}{Math.round(displayAmount).toLocaleString()} SAR
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleDeleteTransaction(tx.id)}
                              className="text-stone-400 hover:text-rose-600 transition p-1.5 rounded-lg hover:bg-stone-100 cursor-pointer"
                              title="Delete transaction entry"
                            >
                              <Trash2 size={13} />
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
        </div>
      ) : (
        /* List View of all Partners */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Add Partner Form Drawer */}
          {showAddPartnerForm && (
            <div className="lg:col-span-3 bg-white p-6 rounded-3xl border border-stone-200/90 shadow-sm space-y-4">
              <h3 className="font-black text-stone-900 text-base">Register New Loan Partner (نیا قرضہ کھاتہ دار)</h3>
              <form onSubmit={handleAddPartnerSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">Contact Name (نام) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bilal Khan / Haji Tariq"
                    value={partnerName}
                    onChange={(e) => setPartnerName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-250 rounded-xl outline-none text-stone-900 text-sm font-bold focus:border-stone-400 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">Phone Number (فون نمبر)</label>
                  <input
                    type="tel"
                    placeholder="e.g. 0501234567"
                    value={partnerPhone}
                    onChange={(e) => setPartnerPhone(e.target.value)}
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-250 rounded-xl outline-none text-stone-900 text-sm font-bold focus:border-stone-400 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">Starting Balance Type</label>
                  <select
                    value={partnerBalanceType}
                    onChange={(e) => setPartnerBalanceType(e.target.value as any)}
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-250 rounded-xl outline-none text-stone-900 text-sm font-bold focus:border-stone-400 focus:bg-white"
                  >
                    <option value="given">We Gave Loan (ہم نے قرض دیا ہے)</option>
                    <option value="taken">We Took Loan (ہم نے قرض لیا ہے)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">Loan Amount (رقم)</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="0.00 (optional)"
                      value={partnerOpeningBalance}
                      onChange={(e) => setPartnerOpeningBalance(e.target.value)}
                      className="w-full px-4 py-2.5 bg-stone-50 border border-stone-250 rounded-xl outline-none text-stone-900 text-sm font-bold focus:border-stone-400 focus:bg-white"
                    />
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="px-5 bg-stone-900 hover:bg-stone-850 text-white rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer shrink-0"
                    >
                      {actionLoading ? "Saving..." : "Save Account"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* Search bar and Partners directory */}
          <div className="lg:col-span-3 space-y-4">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-450">
                <Search size={15} />
              </span>
              <input
                type="text"
                placeholder="Search loan account by partner name or phone number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border border-stone-200/90 rounded-2xl text-xs font-bold text-stone-800 outline-none focus:border-stone-400 focus:ring-1 focus:ring-stone-400 transition"
              />
            </div>

            {loading ? (
              <div className="bg-white py-16 rounded-3xl border border-stone-100 flex flex-col items-center justify-center space-y-3 shadow-xs">
                <div className="w-8 h-8 rounded-full border-2 border-stone-100 border-t-stone-900 animate-spin"></div>
                <span className="text-xs font-mono text-stone-400 uppercase tracking-wider">Syncing Loan Accounts...</span>
              </div>
            ) : filteredPartners.length === 0 ? (
              <div className="bg-white py-16 rounded-3xl border border-stone-150 text-center text-stone-450 shadow-xs">
                <p className="text-sm font-extrabold">No active loan partner accounts matching your query.</p>
                <button
                  onClick={() => setShowAddPartnerForm(true)}
                  className="mt-3 text-xs text-stone-900 hover:underline font-black uppercase tracking-wider cursor-pointer"
                >
                  Create your first loan partner now &rarr;
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPartners.map((p) => {
                  return (
                    <motion.div
                      key={p.id}
                      whileHover={{ y: -2 }}
                      onClick={() => handlePartnerSelect(p.id)}
                      className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-xs cursor-pointer hover:border-stone-300 transition-all flex flex-col justify-between"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <span className="p-2.5 bg-stone-100 text-stone-700 rounded-2xl flex items-center justify-center">
                            <User size={16} />
                          </span>
                          <div>
                            <h4 className="font-black text-stone-950 text-sm leading-tight">{p.name}</h4>
                            {p.phone && (
                              <span className="text-[10px] text-stone-450 font-mono flex items-center gap-1 mt-0.5 font-bold">
                                <Phone size={10} />
                                <span>{p.phone}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                          p.balance > 0 
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-100" 
                            : p.balance < 0 
                            ? "bg-rose-50 text-rose-800 border border-rose-100" 
                            : "bg-stone-50 text-stone-500 border border-stone-100"
                        }`}>
                          {p.balance > 0 ? "Owes Us" : p.balance < 0 ? "We Owe Them" : "Settled"}
                        </span>
                      </div>

                      <div className="mt-5 pt-3.5 border-t border-stone-100 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Outstanding Loan</span>
                        <div className="flex items-baseline gap-1">
                          <span className={`text-base font-black ${
                            p.balance > 0 
                              ? "text-emerald-700" 
                              : p.balance < 0 
                              ? "text-rose-600" 
                              : "text-stone-500"
                          }`}>
                            {Math.round(Math.abs(p.balance)).toLocaleString()}
                          </span>
                          <span className="text-[10px] text-stone-500 font-bold">SAR</span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
