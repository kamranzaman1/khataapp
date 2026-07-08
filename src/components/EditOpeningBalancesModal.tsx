import React, { useState, useEffect } from "react";
import { X, Check, Landmark, Coins, Save } from "lucide-react";
import { motion } from "motion/react";

interface EditOpeningBalancesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBankOpening: number;
  currentCashOpening: number;
  onSave: (bankOpening: number, cashOpening: number) => Promise<boolean>;
}

export default function EditOpeningBalancesModal({
  isOpen,
  onClose,
  currentBankOpening,
  currentCashOpening,
  onSave,
}: EditOpeningBalancesModalProps) {
  const [bankOpening, setBankOpening] = useState("");
  const [cashOpening, setCashOpening] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (isOpen) {
      setBankOpening(String(currentBankOpening || 0));
      setCashOpening(String(currentCashOpening || 0));
      setErrorMsg("");
      setSuccessMsg("");
    }
  }, [isOpen, currentBankOpening, currentCashOpening]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    const bankVal = Number(bankOpening) || 0;
    const cashVal = Number(cashOpening) || 0;

    try {
      const success = await onSave(bankVal, cashVal);
      if (success) {
        setSuccessMsg("Opening balances updated successfully! (اوپننگ بیلنس کامیابی سے محفوظ ہو گیا)");
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setErrorMsg("Failed to update opening balances. Please try again.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" id="edit-opening-balances-modal">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs transition-opacity" 
        onClick={onClose}
      />

      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", duration: 0.4 }}
          className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-md border border-stone-100"
        >
          {/* Header */}
          <div className="bg-stone-50 px-6 py-4 flex items-center justify-between border-b border-stone-200/80">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                <Landmark size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black text-stone-900 uppercase tracking-wider">
                  Set Opening Balances
                </h3>
                <p className="text-[10px] text-stone-450 font-bold uppercase tracking-wider">
                  اوپننگ بیلنس درج کریں
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-all cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-6 space-y-5">
            {errorMsg && (
              <div className="p-3 bg-rose-50 text-rose-700 text-xs font-semibold rounded-xl border border-rose-100 animate-shake">
                {errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-xl border border-emerald-100 flex items-center gap-2">
                <Check size={14} className="animate-bounce" />
                {successMsg}
              </div>
            )}

            {/* Petty Cash Opening Balance */}
            <div className="space-y-2">
              <label className="text-[11px] font-black text-stone-500 uppercase tracking-wider block flex items-center gap-1.5">
                <Coins size={14} className="text-stone-400" />
                Petty Cash Opening Balance (کیش اوپننگ بیلنس)
              </label>
              <div className="relative rounded-xl shadow-xs">
                <input
                  type="number"
                  step="any"
                  required
                  value={cashOpening}
                  onChange={(e) => setCashOpening(e.target.value)}
                  placeholder="0"
                  className="w-full px-4 py-3 bg-stone-50 hover:bg-stone-100/60 focus:bg-white border border-stone-200/85 focus:border-stone-400/90 rounded-xl font-sans text-sm outline-none transition-all focus:ring-2 focus:ring-stone-200"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <span className="text-xs font-extrabold text-stone-400">SAR</span>
                </div>
              </div>
            </div>

            {/* Bank Opening Balance */}
            <div className="space-y-2">
              <label className="text-[11px] font-black text-stone-500 uppercase tracking-wider block flex items-center gap-1.5">
                <Landmark size={14} className="text-stone-400" />
                Bank Opening Balance (بینک اوپننگ بیلنس)
              </label>
              <div className="relative rounded-xl shadow-xs">
                <input
                  type="number"
                  step="any"
                  required
                  value={bankOpening}
                  onChange={(e) => setBankOpening(e.target.value)}
                  placeholder="0"
                  className="w-full px-4 py-3 bg-stone-50 hover:bg-stone-100/60 focus:bg-white border border-stone-200/85 focus:border-stone-400/90 rounded-xl font-sans text-sm outline-none transition-all focus:ring-2 focus:ring-stone-200"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <span className="text-xs font-extrabold text-stone-400">SAR</span>
                </div>
              </div>
            </div>

            {/* Footer buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 border border-stone-200 text-stone-600 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-stone-50 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-grow py-3 px-4 bg-emerald-600 text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-emerald-700 transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Save size={14} />
                {loading ? "Saving..." : "Save Balances"}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
