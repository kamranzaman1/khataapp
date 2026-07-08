import React, { useState } from "react";
import { Customer, Transaction, Payment, Product } from "../types";
import { 
  ArrowLeft, Phone, Share2, PlusCircle, CreditCard, ChevronRight, 
  Calendar, Check, AlertTriangle, MessageSquare, ShoppingCart, DollarSign,
  Edit2, Trash2, Download, Coins, Landmark
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface CustomerDetailProps {
  customer: Customer;
  transactions: Transaction[];
  payments: Payment[];
  loans?: any[];
  products: Product[];
  onBack: () => void;
  onAddTransaction: (customer_id: string, product_id: string, qty: number) => Promise<boolean>;
  onAddPayment: (customer_id: string, amount: number, account?: "cash" | "bank") => Promise<boolean>;
  onUpdateCustomer: (id: string, name: string, phone: string, openingBalance?: number, pin?: string) => Promise<boolean>;
  onDeleteCustomer: (id: string) => Promise<boolean>;
  onUpdatePayment: (id: string, customer_id: string, amount: number, account?: "cash" | "bank") => Promise<boolean>;
  onDeletePayment: (id: string, customer_id: string) => Promise<boolean>;
}

export default function CustomerDetail({
  customer,
  transactions,
  payments,
  loans = [],
  products,
  onBack,
  onAddTransaction,
  onAddPayment,
  onUpdateCustomer,
  onDeleteCustomer,
  onUpdatePayment,
  onDeletePayment
}: CustomerDetailProps) {
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showWhatsappModal, setShowWhatsappModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Edit Payment State
  const [showEditPaymentModal, setShowEditPaymentModal] = useState(false);
  const [selectedPaymentToEdit, setSelectedPaymentToEdit] = useState<Payment | null>(null);
  const [editPaymentAmount, setEditPaymentAmount] = useState("");
  const [editPaymentAccount, setEditPaymentAccount] = useState<"cash" | "bank">("cash");
  const [editPaymentLoading, setEditPaymentLoading] = useState(false);

  // Edit Patient/customer profile states
  const [editName, setEditName] = useState(customer.name || "");
  const [editPhone, setEditPhone] = useState(customer.phone || "");
  const [editOpeningBalance, setEditOpeningBalance] = useState(String(customer.openingBalance ?? 0));
  const [editPin, setEditPin] = useState(customer.pin || "");
  const [editLoading, setEditLoading] = useState(false);

  // Add Transaction Form
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [transLoading, setTransLoading] = useState(false);

  // Add Payment Form
  const [payAmount, setPayAmount] = useState("");
  const [payAccount, setPayAccount] = useState<"cash" | "bank">("cash");
  const [payLoading, setPayLoading] = useState(false);

  // Success messages
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    const directLink = `${window.location.origin}/?id=${customer.id}`;
    navigator.clipboard.writeText(directLink);
    setCopied(true);
    setSuccessMsg("Direct Online Khata Link copied! (آن لائن لنک کاپی ہو گیا)");
    setTimeout(() => {
      setCopied(false);
      setSuccessMsg("");
    }, 4000);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      setErrorMsg("Name is required");
      return;
    }
    setEditLoading(true);
    setErrorMsg("");
    try {
      const sanitizedPhone = editPhone.trim().replace(/[^\d+]/g, "");
      const ok = await onUpdateCustomer(customer.id, editName.trim(), sanitizedPhone, Number(editOpeningBalance) || 0, editPin.trim());
      if (ok) {
        setSuccessMsg("Customer profile updated successfully!");
        setShowEditModal(false);
        setTimeout(() => setSuccessMsg(""), 3500);
      } else {
        setErrorMsg("Failed to update profile.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred.");
    } finally {
      setEditLoading(false);
    }
  };

  const handleAddTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || quantity <= 0) return;
    
    setTransLoading(true);
    setErrorMsg("");
    try {
      const ok = await onAddTransaction(customer.id, selectedProductId, quantity);
      if (ok) {
        setSuccessMsg("Purchase entry recorded perfectly!");
        setSelectedProductId("");
        setQuantity(1);
        setShowTransactionModal(false);
        setTimeout(() => setSuccessMsg(""), 3500);
      } else {
        setErrorMsg("Failed to add transaction. Try again.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred.");
    } finally {
      setTransLoading(false);
    }
  };

  const handleAddPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(payAmount);
    if (!payAmount || isNaN(amt) || amt <= 0) return;

    setPayLoading(true);
    setErrorMsg("");
    try {
      const ok = await onAddPayment(customer.id, amt, payAccount);
      if (ok) {
        setSuccessMsg("Payment entry recorded perfectly!");
        setPayAmount("");
        setPayAccount("cash");
        setShowPaymentModal(false);
        setTimeout(() => setSuccessMsg(""), 3500);
      } else {
        setErrorMsg("Failed to record payment. Try again.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred.");
    } finally {
      setPayLoading(false);
    }
  };

  const handleEditPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPaymentToEdit) return;
    const amt = Number(editPaymentAmount);
    if (!editPaymentAmount || isNaN(amt) || amt <= 0) return;

    setEditPaymentLoading(true);
    setErrorMsg("");
    try {
      const ok = await onUpdatePayment(selectedPaymentToEdit.id, customer.id, amt, editPaymentAccount);
      if (ok) {
        setSuccessMsg("Payment entry updated successfully!");
        setShowEditPaymentModal(false);
        setSelectedPaymentToEdit(null);
        setTimeout(() => setSuccessMsg(""), 3500);
      } else {
        setErrorMsg("Failed to update payment. Try again.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred.");
    } finally {
      setEditPaymentLoading(false);
    }
  };

  const handleDeletePaymentClick = async () => {
    if (!selectedPaymentToEdit) return;
    if (window.confirm(`Are you sure you want to permanently delete this payment of ${selectedPaymentToEdit.amount} SAR?`)) {
      setEditPaymentLoading(true);
      setErrorMsg("");
      try {
        const ok = await onDeletePayment(selectedPaymentToEdit.id, customer.id);
        if (ok) {
          setSuccessMsg("Payment entry deleted and customer balance restored!");
          setShowEditPaymentModal(false);
          setSelectedPaymentToEdit(null);
          setTimeout(() => setSuccessMsg(""), 3500);
        } else {
          setErrorMsg("Failed to delete payment.");
        }
      } catch (err: any) {
        setErrorMsg(err.message || "An error occurred.");
      } finally {
        setEditPaymentLoading(false);
      }
    }
  };

  // Compile full ledger chronological timeline
  const ledgerTimeline = [
    ...transactions.map(t => ({
      id: t.id,
      type: "purchase" as const,
      detail: `${t.product_name} (${t.quantity} qty × ${t.price} SAR)`,
      amount: t.total_amount,
      date: t.date,
      ref: t
    })),
    ...payments.map(p => ({
      id: p.id,
      type: "payment" as const,
      detail: `Paisa Mila / Payment (${p.account === "bank" ? "Bank Account" : "Petty Cash"})`,
      amount: p.amount,
      date: p.date,
      ref: p,
      isPaymentEntry: true
    })),
    ...loans.map(l => {
      let label = "";
      if (l.type === "given") label = `Loan Given (قرضہ دیا) - ${l.account.toUpperCase()}`;
      else if (l.type === "taken") label = `Loan Taken (قرضہ لیا) - ${l.account.toUpperCase()}`;
      else if (l.type === "repayment_sent") label = `Repayment Sent (قرضہ واپس کیا) - ${l.account.toUpperCase()}`;
      else if (l.type === "repayment_received") label = `Repayment Received (قرضہ واپس ملا) - ${l.account.toUpperCase()}`;

      // given (+) or repayment_sent (+) increases customer balance
      // repayment_received (-) or taken (-) decreases customer balance
      const isDebit = l.type === "given" || l.type === "repayment_sent";

      return {
        id: l.id,
        type: isDebit ? ("purchase" as const) : ("payment" as const),
        detail: `${label}${l.description ? ` (${l.description})` : ""}`,
        amount: l.amount,
        date: l.date,
        ref: l
      };
    })
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // WhatsApp reminder generator
  const getWhatsAppMessage = () => {
    const name = customer.name || "Unnamed Customer";
    const balance = customer.balance || 0;
    const lastItem = transactions[0];
    const directLink = `${window.location.origin}/?id=${customer.id}`;

    let messageText = `*${name} ka Khata* 🧾\n\n*Outstanding Balance Reminder*\nAapka kul Hisaab: *${Math.round(balance).toLocaleString()} SAR* hai.\n\n`;
    if (lastItem) {
      messageText += `*Aakhri Khareedari:*\n${lastItem.product_name} (${lastItem.quantity} qty = ${Math.round(lastItem.total_amount)} SAR) On ${new Date(lastItem.date).toLocaleDateString()}\n\n`;
    }

    messageText += `Apna khata online dekhne ke liye is link par click karein:\n👉 ${directLink}\n\nShukriya! 🙏`;
    return messageText;
  };

  const [whatsappMsgText, setWhatsappMsgText] = useState(getWhatsAppMessage());
  const [whatsappPhone, setWhatsappPhone] = useState(customer.phone || "");

  const handleSendWhatsApp = () => {
    const rawPhone = whatsappPhone.replace(/[^\D+]/g, "").trim();
    // Default country format is usually KSA (966) if no code is present
    let formattedPhone = rawPhone;
    if (formattedPhone && !formattedPhone.startsWith("+") && formattedPhone.length === 9) {
      formattedPhone = "966" + formattedPhone;
    }
    const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(whatsappMsgText)}`;
    window.open(url, "_blank");
    setShowWhatsappModal(false);
  };

  const downloadLedgerCsv = () => {
    const metaRows = [
      [`Customer Name: ${customer.name || "N/A"}`],
      [`Phone: ${customer.phone || "N/A"}`],
      [`Opening Balance: ${customer.openingBalance || 0} SAR`],
      [`Current Outstanding Balance: ${customer.balance || 0} SAR`],
      [] // Empty spacer line
    ];

    const headers = [
      "Date & Time (تاریخ اور وقت)",
      "Type (قسم)",
      "Detail / Activity (تفصیل)",
      "Amount Change (SAR) (رقم)",
      "Days Outstanding / Elapsed (کتنے دن پرانا ہے)"
    ];

    const rows = ledgerTimeline.map(item => {
      const isPurchase = item.type === "purchase";
      const daysElapsed = Math.floor((new Date().getTime() - new Date(item.date).getTime()) / (1000 * 60 * 60 * 24));
      return [
        new Date(item.date).toLocaleString(),
        isPurchase ? "Purchase (Debit / ادھار دیا)" : "Payment (Credit / وصولی)",
        item.detail || "",
        `${isPurchase ? "+" : "-"} ${item.amount}`,
        daysElapsed > 0 ? `${daysElapsed} Days` : "Today"
      ];
    });

    // Append Opening Balance row as the starting point at the end of the chronological list
    rows.push([
      customer.createdAt ? new Date(customer.createdAt).toLocaleString() : "Initial Setup",
      "Opening Balance (ابتدائی بقایا)",
      "Starting balance configured on registration",
      `+ ${customer.openingBalance || 0}`,
      "-"
    ]);

    const csvContent = [
      ...metaRows.map(row => row.map(cell => `"${(String(cell) || "").replace(/"/g, '""')}"`).join(",")),
      headers.map(h => `"${h.replace(/"/g, '""')}"`).join(","),
      ...rows.map(row => row.map(cell => `"${(String(cell) || "").replace(/"/g, '""')}"`).join(","))
    ].join("\r\n");

    const bom = "\uFEFF"; // Prepend Byte Order Mark for Excel Unicode/Urdu support
    const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeName = (customer.name || "Customer").replace(/[^a-zA-Z0-9]/g, "_");
    const fileDate = new Date().toISOString().split("T")[0];
    
    link.setAttribute("href", url);
    link.setAttribute("download", `Ledger_${safeName}_${fileDate}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const selectedProduct = products.find(p => p.id === selectedProductId);
  const calculatedTotal = selectedProduct ? selectedProduct.price * quantity : 0;

  return (
    <div className="space-y-6">
      {/* Back & Client Card header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <button
          onClick={onBack}
          id="btn-back-to-list"
          className="px-3.5 py-1.5 hover:bg-stone-100 text-stone-600 rounded-lg flex items-center gap-2 text-xs font-bold transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Back to Customers</span>
        </button>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => {
              setEditName(customer.name || "");
              setEditPhone(customer.phone || "");
              setEditOpeningBalance(String(customer.openingBalance ?? 0));
              setEditPin(customer.pin || "");
              setShowEditModal(true);
            }}
            id="btn-edit-detail-profile"
            className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg font-bold text-xs flex items-center gap-1.5 border border-stone-200 transition-colors"
          >
            <Edit2 size={13} />
            <span>Edit Profile</span>
          </button>
          
          <button
            onClick={async () => {
              if (window.confirm(`Are you sure you want to permanently delete customer "${customer.name}"? This deletes their ledger profile.`)) {
                await onDeleteCustomer(customer.id);
              }
            }}
            id="btn-delete-detail-profile"
            className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg font-bold text-xs flex items-center gap-1.5 border border-rose-200 transition-colors"
          >
            <Trash2 size={13} />
            <span>Delete Profile</span>
          </button>
          
          <button
            onClick={downloadLedgerCsv}
            id="btn-export-ledger-csv"
            className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-bold text-xs flex items-center gap-1.5 border border-indigo-200 transition-colors"
          >
            <Download size={13} />
            <span>📥 Export Ledger</span>
          </button>

          <button
            onClick={handleCopyLink}
            id="btn-copy-khata-link"
            className="px-3.5 py-2 bg-amber-550 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-250 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors"
          >
            <Share2 size={13} />
            <span>🔗 Copy Khata Link</span>
          </button>

          <button
            onClick={() => {
              setWhatsappMsgText(getWhatsAppMessage());
              setShowWhatsappModal(true);
            }}
            id="btn-whatsapp-remind"
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-bold text-xs flex items-center gap-2 shadow-sm transition-all"
          >
            <MessageSquare size={14} />
            <span>📲 WhatsApp Reminder</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 text-emerald-800 text-xs px-4 py-3 rounded-xl border border-emerald-100 flex items-center gap-2 font-medium">
          <Check size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-50 text-rose-800 text-xs px-4 py-3 rounded-xl border border-rose-100 flex items-center gap-2 font-medium">
          <AlertTriangle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Hero Stats Card for Customer */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <span className="text-xs text-stone-400 font-bold uppercase tracking-wider">Account profile</span>
          <h2 className="text-2xl font-black text-stone-900 mt-1">{customer.name || "Unnamed Customer"}</h2>
          <p className="text-stone-400 text-xs font-mono mt-1.5 flex items-center gap-1.5">
            <Phone size={12} /> {customer.phone || "(no phone)"}
          </p>
          <span className="text-[10px] text-stone-400 block mt-2">Created: {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() : "Syncing"}</span>
        </div>

        <div className="md:border-l border-stone-100 md:pl-6">
          <span className="text-xs text-stone-400 font-bold uppercase tracking-wider">Outstanding balance</span>
          <div className="mt-1 flex items-baseline gap-2">
            <h3 className={`text-3xl font-black ${(customer.balance || 0) > 0 ? 'text-rose-600' : (customer.balance || 0) === 0 ? 'text-stone-800' : 'text-emerald-700'}`}>
              {Math.round(customer.balance || 0).toLocaleString()} SAR
            </h3>
          </div>
          <p className="text-xs text-stone-500 mt-2">
            {(customer.balance || 0) > 0 
              ? "This customer currently owes money to your store." 
              : (customer.balance || 0) === 0 
              ? "All accounts settled! Account has no debt." 
              : "Prepaid advance balance / deposit in favor of customer."}
          </p>
        </div>

        <div className="flex flex-col justify-center gap-2.5 md:border-l border-stone-100 md:pl-6">
          <button
            onClick={() => setShowTransactionModal(true)}
            id="btn-customer-add-purchase"
            className="w-full py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all border border-rose-100"
          >
            <ShoppingCart size={13} />
            <span>➕ Add Purchase (Udhar Diya)</span>
          </button>
          <button
            onClick={() => setShowPaymentModal(true)}
            id="btn-customer-add-payment"
            className="w-full py-2 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all border border-emerald-100"
          >
            <DollarSign size={13} />
            <span>💰 Add Payment (Paisa Mila)</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Ledger Transaction History Timeline */}
        <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm">
          <h3 className="text-base font-bold text-stone-900 mb-4 pb-2 border-b border-stone-100">Ledger Chronology (Tasdeeq)</h3>

          {ledgerTimeline.length === 0 ? (
            <div className="py-16 text-center text-stone-400 text-xs">
              <p className="font-semibold">No entries recorded yet.</p>
              <p className="mt-1 text-stone-400">Record a purchase or payment using the buttons above.</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[450px] overflow-y-auto pr-1">
              {ledgerTimeline.map((item: any) => {
                const isPurchase = item.type === "purchase";
                return (
                  <div key={item.id} className="flex gap-3 text-sm items-start justify-between border-b border-stone-50 pb-3">
                    <div className="flex gap-2.5 items-start">
                      <div className={`mt-0.5 p-1.5 rounded-lg ${isPurchase ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                        {isPurchase ? <ShoppingCart size={14} /> : <DollarSign size={14} />}
                      </div>
                      <div>
                        <p className="font-semibold text-stone-900 leading-tight">{item.detail}</p>
                        <p className="text-stone-400 text-[10px] mt-1 font-semibold flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="flex items-center gap-1">
                            <Calendar size={10} />
                            {new Date(item.date).toLocaleString()}
                          </span>
                          {Math.floor((new Date().getTime() - new Date(item.date).getTime()) / (1000 * 60 * 60 * 24)) > 0 ? (
                            <span className="bg-amber-50 text-amber-700 border border-amber-100 px-1.5 py-0.5 rounded text-[9px] font-bold">
                              {Math.floor((new Date().getTime() - new Date(item.date).getTime()) / (1000 * 60 * 60 * 24))} Days Pending (پرانا ادھار)
                            </span>
                          ) : (
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 py-0.5 rounded text-[9px] font-bold">
                              Today (آج)
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 flex items-center gap-2">
                      <span className={`font-bold ${isPurchase ? 'text-rose-600' : 'text-emerald-700'}`}>
                        {isPurchase ? "+" : "-"} {Math.round(item.amount ?? 0).toLocaleString()} SAR
                      </span>
                      {item.isPaymentEntry && (
                        <button
                          onClick={() => {
                            setSelectedPaymentToEdit(item.ref);
                            setEditPaymentAmount(String(item.ref.amount));
                            setEditPaymentAccount(item.ref.account || "cash");
                            setShowEditPaymentModal(true);
                          }}
                          className="p-1 hover:bg-stone-100 text-stone-400 hover:text-stone-700 rounded transition cursor-pointer"
                          title="Edit Payment (پیمنٹ تبدیل کریں)"
                        >
                          <Edit2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Informative Side Card regarding Account settlement */}
        <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-stone-900 mb-2">Ledger Balance Calculations</h3>
            <p className="text-stone-500 text-xs leading-relaxed mb-4">
              Here is how customer balance behaves according to standard double entry bookkeeping rules for store logs:
            </p>

            <div className="font-mono text-xs bg-stone-50 p-4 rounded-xl space-y-2 border border-stone-100">
              <div className="flex justify-between text-stone-600">
                <span>Add Purchase (+):</span>
                <span>Balance + (Qty * Price)</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Add Payments (-):</span>
                <span>Balance - Amount</span>
              </div>
              <div className="border-t border-stone-200 my-2 pt-2 flex justify-between font-bold text-stone-900">
                <span>Final Account Status:</span>
                <span>{Math.round(customer.balance ?? 0).toLocaleString()} SAR</span>
              </div>
            </div>

            <div className="mt-6 space-y-2 text-xs text-stone-500 bg-amber-50/50 p-3.5 rounded-xl border border-amber-100 text-[11px] leading-relaxed">
              <p className="font-bold text-amber-800 flex items-center gap-1">
                ⚠️ Verification Guidelines
              </p>
              <p>
                In case of dispute, verify the physical invoices against the chronological order listed in the ledger feed. Both payments and item rates are permanently saved in our Firestore database.
              </p>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-stone-100 flex justify-between items-center text-stone-400 text-xs">
            <span>Direct Sync Enabled</span>
            <span className="font-mono text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded font-bold uppercase tracking-wider">Online</span>
          </div>
        </div>
      </div>

      {/* Transaction Entry Modal Drawer */}
      <AnimatePresence>
        {showTransactionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-2xl p-6 shadow-xl border border-stone-100 space-y-4"
              id="transaction-modal"
            >
              <div className="flex justify-between items-center pb-2 border-b border-stone-100">
                <h3 className="font-extrabold text-stone-900 text-base">➕ Add Purchase (Udhar Entry)</h3>
                <button 
                  onClick={() => setShowTransactionModal(false)}
                  className="text-stone-400 hover:text-stone-600 text-sm font-semibold"
                >
                  Close
                </button>
              </div>

              <form onSubmit={handleAddTransactionSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">
                    Select Product <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-medium text-stone-900 text-sm outline-none"
                  >
                    <option value="">-- Choose Product --</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.price} SAR)</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">
                    Quantity <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    required
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-medium text-stone-900 text-sm outline-none"
                  />
                </div>

                {selectedProduct && (
                  <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-100 flex justify-between items-center text-xs">
                    <span className="text-stone-500 font-semibold">Total Calculation:</span>
                    <span className="font-extrabold text-rose-600 text-sm">{Math.round(calculatedTotal).toLocaleString()} SAR</span>
                  </div>
                )}

                <div className="flex justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowTransactionModal(false)}
                    className="px-4 py-2 bg-stone-100 text-stone-600 font-semibold text-xs rounded-lg hover:bg-stone-200 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={transLoading || !selectedProductId}
                    className="px-5 py-2 bg-rose-600 text-white font-semibold text-xs rounded-lg hover:bg-rose-700 disabled:bg-rose-300 transition"
                  >
                    {transLoading ? "Adding..." : "Add to Debt"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Payment Entry Modal Drawer */}
      <AnimatePresence>
        {showPaymentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-2xl p-6 shadow-xl border border-stone-100 space-y-4"
              id="payment-modal"
            >
              <div className="flex justify-between items-center pb-2 border-b border-stone-100">
                <h3 className="font-extrabold text-stone-900 text-base">💰 Add Payment (Cash Recieved)</h3>
                <button 
                  onClick={() => setShowPaymentModal(false)}
                  className="text-stone-400 hover:text-stone-600 text-sm font-semibold"
                >
                  Close
                </button>
              </div>

              <form onSubmit={handleAddPaymentSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">
                    Amount Received (SAR) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0.1"
                    placeholder="e.g. 100"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-medium text-stone-900 text-sm outline-none"
                  />
                  <span className="text-[10px] text-stone-400 mt-1 block">This amount will be directly subtracted from their outstanding balance.</span>
                </div>

                {/* Account Selection */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">
                    Choose Account (اکاؤنٹ منتخب کریں) <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPayAccount("cash")}
                      className={`py-2.5 px-4 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition cursor-pointer ${
                        payAccount === "cash"
                          ? "border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-600/20"
                          : "border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-600"
                      }`}
                      id="btn-detail-account-cash"
                    >
                      <Coins size={13} className={payAccount === "cash" ? "text-emerald-600" : "text-stone-400"} />
                      <span>Petty Cash (کیش)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPayAccount("bank")}
                      className={`py-2.5 px-4 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition cursor-pointer ${
                        payAccount === "bank"
                          ? "border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-600/20"
                          : "border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-600"
                      }`}
                      id="btn-detail-account-bank"
                    >
                      <Landmark size={13} className={payAccount === "bank" ? "text-emerald-600" : "text-stone-400"} />
                      <span>Bank / Account (بینک)</span>
                    </button>
                  </div>
                </div>

                <div className="flex justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowPaymentModal(false)}
                    className="px-4 py-2 bg-stone-100 text-stone-600 font-semibold text-xs rounded-lg hover:bg-stone-200 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={payLoading || !payAmount}
                    className="px-5 py-2 bg-emerald-600 text-white font-semibold text-xs rounded-lg hover:bg-emerald-700 disabled:bg-emerald-300 transition"
                  >
                    {payLoading ? "Recording..." : "Record Payment"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* WhatsApp Reminder Editor Modal */}
      <AnimatePresence>
        {showWhatsappModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-2xl p-6 shadow-xl border border-stone-100 space-y-4"
              id="whatsapp-modal"
            >
              <div className="flex justify-between items-center pb-2 border-b border-stone-100">
                <h3 className="font-extrabold text-stone-900 text-base">📲 Preview WhatsApp Reminder</h3>
                <button 
                  onClick={() => setShowWhatsappModal(false)}
                  className="text-stone-400 hover:text-stone-600 text-sm font-semibold"
                >
                  Close
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">
                    WhatsApp Phone Number
                  </label>
                  <input
                    type="text"
                    value={whatsappPhone}
                    onChange={(e) => setWhatsappPhone(e.target.value)}
                    placeholder="e.g. 966512345678"
                    className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl font-mono text-stone-900 text-sm outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">
                    Message Preview (Editable)
                  </label>
                  <textarea
                    rows={6}
                    value={whatsappMsgText}
                    onChange={(e) => setWhatsappMsgText(e.target.value)}
                    className="w-full px-3.5 py-3 bg-stone-50 border border-stone-200 rounded-xl font-sans text-stone-900 text-xs outline-none focus:border-stone-400 placeholder-stone-400"
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowWhatsappModal(false)}
                    className="px-4 py-2 bg-stone-100 text-stone-600 font-semibold text-xs rounded-lg hover:bg-stone-200 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendWhatsApp}
                    className="px-5 py-2 bg-emerald-600 text-white font-semibold text-xs rounded-lg hover:bg-emerald-700 transition flex items-center gap-1.5"
                  >
                    <MessageSquare size={12} />
                    <span>Send Message</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Customer Profile Modal */}
      <AnimatePresence>
        {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-2xl p-6 shadow-xl border border-stone-100 space-y-4 text-stone-900"
              id="detail-edit-customer-modal"
            >
              <div className="flex justify-between items-center pb-2 border-b border-stone-100">
                <h3 className="font-extrabold text-stone-900 text-base">✏️ Edit Customer Profile</h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-stone-400 hover:text-stone-600 text-sm font-semibold"
                >
                  Close
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5 flex justify-between">
                    <span>Unique Customer ID</span>
                    <span className="text-emerald-600 font-bold font-sans">آن لائن لاگ ان کوڈ</span>
                  </label>
                  <input
                    type="text"
                    value={customer.id}
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
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-medium text-stone-900 text-sm outline-none focus:border-stone-400"
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
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-mono text-stone-900 text-sm outline-none focus:border-stone-400"
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
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-mono text-stone-900 text-sm outline-none focus:border-stone-400"
                  />
                  <span className="text-[10px] text-stone-400 mt-1 block">Modifying this value directly recalibrates the user's outstanding balance.</span>
                </div>

                <div className="flex justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 bg-stone-100 text-stone-600 font-semibold text-xs rounded-lg hover:bg-stone-200 transition"
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

      {/* Edit Payment Modal */}
      <AnimatePresence>
        {showEditPaymentModal && selectedPaymentToEdit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-2xl p-6 shadow-xl border border-stone-100 space-y-4 text-stone-900"
              id="edit-payment-modal"
            >
              <div className="flex justify-between items-center pb-2 border-b border-stone-100">
                <h3 className="font-extrabold text-stone-900 text-base flex items-center gap-1.5">
                  <span>✏️ Edit Payment (پیسہ ملا)</span>
                </h3>
                <button 
                  type="button"
                  onClick={() => {
                    setShowEditPaymentModal(false);
                    setSelectedPaymentToEdit(null);
                  }}
                  className="text-stone-400 hover:text-stone-600 text-sm font-semibold"
                >
                  Close
                </button>
              </div>

              <form onSubmit={handleEditPaymentSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">
                    Amount Received (SAR) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0.1"
                    placeholder="e.g. 100"
                    value={editPaymentAmount}
                    onChange={(e) => setEditPaymentAmount(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-medium text-stone-900 text-sm outline-none font-bold"
                  />
                  <span className="text-[10px] text-stone-400 mt-1 block">The new amount will recalibrate the customer's outstanding balance automatically.</span>
                </div>

                {/* Account Selection */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">
                    Choose Account (اکاؤنٹ) <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setEditPaymentAccount("cash")}
                      className={`py-2.5 px-4 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition cursor-pointer ${
                        editPaymentAccount === "cash"
                          ? "border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-600/20"
                          : "border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-600"
                      }`}
                    >
                      <Coins size={13} className={editPaymentAccount === "cash" ? "text-emerald-600" : "text-stone-400"} />
                      <span>Petty Cash (کیش)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditPaymentAccount("bank")}
                      className={`py-2.5 px-4 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition cursor-pointer ${
                        editPaymentAccount === "bank"
                          ? "border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-600/20"
                          : "border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-600"
                      }`}
                    >
                      <Landmark size={13} className={editPaymentAccount === "bank" ? "text-emerald-600" : "text-stone-400"} />
                      <span>Bank / Account (بینک)</span>
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 gap-2">
                  <button
                    type="button"
                    disabled={editPaymentLoading}
                    onClick={handleDeletePaymentClick}
                    className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-bold text-xs rounded-xl transition flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 size={12} />
                    <span>Delete Entry</span>
                  </button>
                  
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowEditPaymentModal(false);
                        setSelectedPaymentToEdit(null);
                      }}
                      className="px-4 py-2 bg-stone-100 text-stone-600 font-semibold text-xs rounded-xl hover:bg-stone-200 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={editPaymentLoading || !editPaymentAmount}
                      className="px-5 py-2 bg-emerald-600 text-white font-semibold text-xs rounded-xl hover:bg-emerald-700 disabled:bg-emerald-300 transition"
                    >
                      {editPaymentLoading ? "Updating..." : "Update Entry"}
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
