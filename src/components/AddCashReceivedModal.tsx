import React, { useState, useEffect, useMemo } from "react";
import { Customer } from "../types";
import { 
  X, Check, Coins, Search, User, AlertTriangle, ArrowRight, Landmark 
} from "lucide-react";
import { motion } from "motion/react";

interface AddCashReceivedModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  onAddPayment: (customer_id: string, amount: number, account: "cash" | "bank") => Promise<boolean>;
}

export default function AddCashReceivedModal({
  isOpen,
  onClose,
  customers = [],
  onAddPayment,
}: AddCashReceivedModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [amount, setAmount] = useState("");
  const [account, setAccount] = useState<"cash" | "bank">("cash");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Clear states when opening/closing
  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      setSelectedCustomerId("");
      setAmount("");
      setAccount("cash");
      setErrorMsg("");
      setSuccessMsg("");
    }
  }, [isOpen]);

  // Filter customers list by search query (name or phone)
  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers;
    const query = searchQuery.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        (c.phone && c.phone.toLowerCase().includes(query))
    );
  }, [customers, searchQuery]);

  // Find currently selected customer object
  const selectedCustomer = useMemo(() => {
    return customers.find((c) => c.id === selectedCustomerId);
  }, [customers, selectedCustomerId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!selectedCustomerId) {
      setErrorMsg("Meharbani karke customer select karein. (Please select a customer.)");
      return;
    }

    const payAmt = Number(amount);
    if (isNaN(payAmt) || payAmt <= 0) {
      setErrorMsg("Meharbani karke sahi raqam darj karein. (Please enter a valid positive amount.)");
      return;
    }

    setLoading(true);
    try {
      const success = await onAddPayment(selectedCustomerId, payAmt, account);
      if (success) {
        setSuccessMsg(`Cash Received Registered! ${selectedCustomer?.name} pichla khata updated.`);
        setTimeout(() => {
          onClose();
        }, 1800);
      } else {
        setErrorMsg("System error. Payment record failed to save.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred while saving.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-3xl shadow-2xl border border-stone-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
        id="cash-received-modal"
      >
        {/* Modal Header */}
        <div className="bg-stone-950 p-5 text-white relative flex-shrink-0">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-stone-400 hover:text-white transition cursor-pointer p-1.5 hover:bg-stone-850 rounded-xl"
            title="Close Modal"
            id="btn-close-cash-received"
          >
            <X size={18} />
          </button>
          
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-emerald-500 text-stone-950 rounded-2xl flex items-center justify-center">
              <Coins size={22} className="stroke-[2.5px]" />
            </span>
            <div>
              <h1 className="text-lg font-black tracking-tight">
                Daily Cash Received (کیش وصولی)
              </h1>
              <p className="text-stone-400 text-[10px] mt-0.5">Record immediate cash payments received from customers.</p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 space-y-5 overflow-y-auto flex-1">
            
            {successMsg && (
              <motion.div 
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-emerald-50 text-emerald-800 text-xs px-4 py-3 rounded-xl border border-emerald-100 flex items-center gap-2 font-extrabold"
              >
                <Check size={16} className="stroke-[3]" />
                <span>{successMsg}</span>
              </motion.div>
            )}

            {errorMsg && (
              <motion.div 
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-rose-50 text-rose-800 text-xs px-4 py-3 rounded-xl border border-rose-100 flex items-center gap-2 font-extrabold"
              >
                <AlertTriangle size={16} />
                <span>{errorMsg}</span>
              </motion.div>
            )}

            {/* Step 1: Customer Selection */}
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-stone-450 uppercase tracking-wider">
                1. Select Customer (گاہک منتخب کریں) <span className="text-rose-500">*</span>
              </label>

              {/* Customer Search Bar */}
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                  <Search size={14} />
                </span>
                <input
                  type="text"
                  placeholder="Type name or phone to filter customers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-800 outline-none focus:border-stone-400 transition"
                  id="search-customer-payment"
                />
              </div>

              {/* Scrollable Customer List */}
              <div className="border border-stone-200 rounded-2xl max-h-[160px] overflow-y-auto bg-stone-50/30 divide-y divide-stone-100">
                {filteredCustomers.length === 0 ? (
                  <div className="p-4 text-center text-xs text-stone-400 font-bold">
                    No customers found matching "{searchQuery}"
                  </div>
                ) : (
                  filteredCustomers.map((c) => {
                    const isSelected = c.id === selectedCustomerId;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelectedCustomerId(c.id);
                          setErrorMsg("");
                        }}
                        className={`w-full text-left p-3 flex items-center justify-between text-xs transition-all hover:bg-stone-50 cursor-pointer ${
                          isSelected ? "bg-emerald-50/50 hover:bg-emerald-50 border-l-4 border-emerald-600 pl-2" : ""
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <User size={13} className={isSelected ? "text-emerald-600" : "text-stone-400"} />
                          <div>
                            <span className="font-extrabold text-stone-900 block">{c.name}</span>
                            {c.phone && <span className="text-[10px] text-stone-450">{c.phone}</span>}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-stone-400 block uppercase font-bold">Outstanding</span>
                          <span className={`font-black ${Number(c.balance || 0) > 0 ? "text-rose-600" : "text-emerald-700"}`}>
                            {Math.round(c.balance || 0).toLocaleString()} SAR
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Selected Customer Card Preview */}
            {selectedCustomer && (
              <motion.div 
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-stone-50 border border-stone-200 p-4 rounded-2xl flex items-center justify-between"
              >
                <div>
                  <span className="text-[9px] font-black text-stone-400 uppercase tracking-widest">Selected Customer</span>
                  <h4 className="font-black text-sm text-stone-900 mt-0.5">{selectedCustomer.name}</h4>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-black text-stone-400 uppercase tracking-widest">Current Balance</span>
                  <div className="font-black text-base text-rose-600 flex items-center gap-1 justify-end">
                    <span>{Math.round(selectedCustomer.balance || 0).toLocaleString()}</span>
                    <span className="text-xs">SAR</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: Cash Amount Received Input */}
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-stone-450 uppercase tracking-wider">
                2. Cash Amount Received (وصول رقم) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none font-bold text-xs text-stone-500">
                  SAR
                </span>
                <input
                  type="number"
                  step="any"
                  min="1"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setErrorMsg("");
                  }}
                  className="w-full pl-12 pr-4 py-3 bg-white border border-stone-250 rounded-xl text-sm font-black text-stone-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition shadow-xs"
                  id="input-cash-received-amount"
                />
              </div>
              
              {/* Cash Preview Ledger Reduction */}
              {selectedCustomer && amount && !isNaN(Number(amount)) && (
                <div className="text-[10px] font-semibold text-stone-500 flex items-center gap-1.5 px-1">
                  <span>Balance will reduce from</span>
                  <span className="font-bold text-rose-600">{Math.round(selectedCustomer.balance).toLocaleString()} SAR</span>
                  <ArrowRight size={10} />
                  <span className="font-black text-emerald-700">
                    {Math.round(Math.max(0, selectedCustomer.balance - Number(amount))).toLocaleString()} SAR
                  </span>
                </div>
              )}
            </div>

            {/* Step 3: Account Selection */}
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-stone-450 uppercase tracking-wider">
                3. Choose Account (اکاؤنٹ منتخب کریں) <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setAccount("cash")}
                  className={`py-3 px-4 rounded-xl border flex items-center justify-center gap-2 text-xs font-black transition cursor-pointer ${
                    account === "cash"
                      ? "border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-600/20"
                      : "border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-600"
                  }`}
                  id="btn-account-cash"
                >
                  <Coins size={14} className={account === "cash" ? "text-emerald-600" : "text-stone-400"} />
                  <span>Petty Cash</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAccount("bank")}
                  className={`py-3 px-4 rounded-xl border flex items-center justify-center gap-2 text-xs font-black transition cursor-pointer ${
                    account === "bank"
                      ? "border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-600/20"
                      : "border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-600"
                  }`}
                  id="btn-account-bank"
                >
                  <Landmark size={14} className={account === "bank" ? "text-emerald-600" : "text-stone-400"} />
                  <span>Bank Account</span>
                </button>
              </div>
            </div>

          </div>

          {/* Modal Footer Actions */}
          <div className="bg-stone-50 px-6 py-4.5 border-t border-stone-200 flex items-center justify-end gap-2.5 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-stone-700 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 font-extrabold text-xs rounded-xl cursor-pointer transition uppercase tracking-wider"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !selectedCustomerId || !amount}
              className={`px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center gap-2`}
              id="btn-save-cash-received"
            >
              {loading ? "Saving Cash..." : "Save Cash Received"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
