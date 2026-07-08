import React, { useState, useEffect } from "react";
import { Vendor, Product, VendorPurchase, VendorPayment } from "../types";
import { 
  Building2, Phone, Search, PlusCircle, Check, 
  AlertCircle, ChevronRight, History, ShoppingBag, 
  DollarSign, ArrowLeft, Layers, BookmarkPlus, ArrowDownToLine,
  Edit2, Trash2, RotateCcw
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface VendorsListProps {
  products: Product[];
  onRefreshGlobal?: () => Promise<void>;
}

export default function VendorsList({ products, onRefreshGlobal }: VendorsListProps) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendorDetail, setSelectedVendorDetail] = useState<{
    vendor: Vendor;
    purchases: VendorPurchase[];
    payments: VendorPayment[];
  } | null>(null);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Editing individual restock/purchase record
  const [editingPurchaseId, setEditingPurchaseId] = useState<string | null>(null);
  const [editPurchaseQty, setEditPurchaseQty] = useState("");
  const [editPurchaseCost, setEditPurchaseCost] = useState("");
  const [purchaseEditLoading, setPurchaseEditLoading] = useState(false);

  // Editing individual payment record
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [editPaymentAmount, setEditPaymentAmount] = useState("");
  const [editPaymentAccount, setEditPaymentAccount] = useState<"cash" | "bank">("cash");
  const [paymentEditLoading, setPaymentEditLoading] = useState(false);

  // Search/Filters
  const [searchTerm, setSearchTerm] = useState("");

  // Forms visibility
  const [showAddVendorForm, setShowAddVendorForm] = useState(false);
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showReturnForm, setShowReturnForm] = useState(false);

  // New Vendor Form State
  const [vendorName, setVendorName] = useState("");
  const [vendorPhone, setVendorPhone] = useState("");

  // Edit Vendor Form State
  const [showEditVendorModal, setShowEditVendorModal] = useState(false);
  const [editVendor, setEditVendor] = useState<Vendor | null>(null);
  const [editVendorName, setEditVendorName] = useState("");
  const [editVendorPhone, setEditVendorPhone] = useState("");
  const [editVendorLoading, setEditVendorLoading] = useState(false);

  // New Purchase / Stock In Form State
  const [purchaseVendorId, setPurchaseVendorId] = useState("");
  const [purchaseProductId, setPurchaseProductId] = useState("");
  const [purchaseQty, setPurchaseQty] = useState("");
  const [purchaseCost, setPurchaseCost] = useState("");

  // New Payment to Supplier Form State
  const [paymentVendorId, setPaymentVendorId] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentAccount, setPaymentAccount] = useState<"cash" | "bank">("cash");

  // New Return Form State
  const [returnVendorId, setReturnVendorId] = useState("");
  const [returnProductId, setReturnProductId] = useState("");
  const [returnQty, setReturnQty] = useState("");
  const [returnCost, setReturnCost] = useState("");

  // Load Vendors
  const fetchVendors = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/vendors");
      if (res.ok) {
        const data = await res.json();
        setVendors(Array.isArray(data) ? data : []);
      } else {
        setError("Failed to fetch vendors list.");
      }
    } catch (err: any) {
      console.error(err);
      setError("Server connection issue.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  // Fetch individual vendor details (to load ledger on selection)
  const fetchVendorDetail = async (id: string) => {
    setError("");
    try {
      const res = await fetch(`/api/vendors/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedVendorDetail(data);
      } else {
        setError("Failed to load details for this vendor.");
      }
    } catch (err) {
      console.error(err);
      setError("Server connection error loading vendor ledger.");
    }
  };

  // Create new vendor
  const handleAddVendorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!vendorName.trim()) {
      setError("Vendor name is required.");
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch("/api/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: vendorName.trim(),
          phone: vendorPhone.trim().replace(/[^\d+]/g, ""),
          openingBalance: 0
        })
      });

      if (res.ok) {
        const newVendor = await res.json();
        setSuccess(`Vendor "${newVendor.name}" registered successfully!`);
        setVendorName("");
        setVendorPhone("");
        setShowAddVendorForm(false);
        await fetchVendors();
        setTimeout(() => setSuccess(""), 4000);
      } else {
        setError("Failed to create vendor.");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setActionLoading(false);
    }
  };

  // Edit vendor profile
  const handleEditVendorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editVendor) return;
    setError("");
    setSuccess("");

    if (!editVendorName.trim()) {
      setError("Vendor name is required.");
      return;
    }

    setEditVendorLoading(true);
    try {
      const res = await fetch(`/api/vendors/${editVendor.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editVendorName.trim(),
          phone: editVendorPhone.trim().replace(/[^\d+]/g, ""),
          openingBalance: Number(editVendor.openingBalance) || 0
        })
      });

      if (res.ok) {
        setSuccess("Vendor updated perfectly!");
        setShowEditVendorModal(false);
        setEditVendor(null);
        await fetchVendors();
        if (selectedVendorDetail?.vendor.id === editVendor.id) {
          await fetchVendorDetail(editVendor.id);
        }
        setTimeout(() => setSuccess(""), 4000);
      } else {
        setError("Failed to update vendor.");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setEditVendorLoading(false);
    }
  };

  // Delete vendor
  const handleDeleteVendor = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete supplier "${name}"? This will delete their wholesale ledger and history.`)) {
      return;
    }
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/vendors/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setSuccess(`Vendor "${name}" deleted.`);
        setSelectedVendorDetail(null);
        await fetchVendors();
        setTimeout(() => setSuccess(""), 4000);
      } else {
        setError("Failed to delete vendor.");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    }
  };

  // Save Vendor Purchase / Restock
  const handlePurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const vId = purchaseVendorId || (selectedVendorDetail ? selectedVendorDetail.vendor.id : "");
    const pId = purchaseProductId;
    const qty = Number(purchaseQty);
    const cost = Number(purchaseCost);

    if (!vId) {
      setError("Please select a vendor.");
      return;
    }
    if (!pId) {
      setError("Please select a product.");
      return;
    }
    if (isNaN(qty) || qty <= 0) {
      setError("Please enter a valid quantity.");
      return;
    }
    if (isNaN(cost) || cost <= 0) {
      setError("Please enter a valid buying cost.");
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch("/api/vendor-purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendor_id: vId,
          product_id: pId,
          quantity: qty,
          cost_price: cost
        })
      });

      if (res.ok) {
        setSuccess("Supply restock successfully logged in ledger!");
        setPurchaseVendorId("");
        setPurchaseProductId("");
        setPurchaseQty("");
        setPurchaseCost("");
        setShowPurchaseForm(false);
        // Refresh
        await fetchVendors();
        if (selectedVendorDetail?.vendor.id === vId) {
          await fetchVendorDetail(vId);
        }
        setTimeout(() => setSuccess(""), 4000);
      } else {
        const errData = await res.json();
        setError(errData.error || "Failed to log supply purchase in ledger.");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setActionLoading(false);
    }
  };

  // Edit / Update Vendor Purchase
  const handleEditPurchaseSubmit = async (pId: string) => {
    setError("");
    setSuccess("");

    const qty = Number(editPurchaseQty);
    const cost = Number(editPurchaseCost);

    if (isNaN(qty) || qty <= 0) {
      setError("Please specify a valid quantity.");
      return;
    }
    if (isNaN(cost) || cost <= 0) {
      setError("Please specify a valid cost price.");
      return;
    }

    setPurchaseEditLoading(true);
    try {
      const res = await fetch(`/api/vendor-purchases/${pId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantity: qty,
          cost_price: cost
        })
      });

      if (res.ok) {
        setSuccess("Stock order restock upgraded successfully!");
        setEditingPurchaseId(null);
        // Refresh local vendor details
        if (selectedVendorDetail) {
          await fetchVendorDetail(selectedVendorDetail.vendor.id);
          await fetchVendors();
        }
        // Refresh global state so other tabs like Stock, Dashboard, P&L update
        if (onRefreshGlobal) {
          await onRefreshGlobal();
        }
        setTimeout(() => setSuccess(""), 4050);
      } else {
        const errData = await res.json();
        setError(errData.error || "Failed to edit stock purchase entry.");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setPurchaseEditLoading(false);
    }
  };

  // Save Supplier Cash Payment
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const vId = paymentVendorId || (selectedVendorDetail ? selectedVendorDetail.vendor.id : "");
    const amt = Number(paymentAmount);

    if (!vId) {
      setError("Please select a vendor.");
      return;
    }
    if (isNaN(amt) || amt <= 0) {
      setError("Please specify a valid payment amount.");
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch("/api/vendor-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendor_id: vId,
          amount: amt,
          account: paymentAccount
        })
      });

      if (res.ok) {
        setSuccess("Supplier credit payment registered in database!");
        setPaymentVendorId("");
        setPaymentAmount("");
        setPaymentAccount("cash");
        setShowPaymentForm(false);
        // Refresh
        await fetchVendors();
        if (selectedVendorDetail?.vendor.id === vId) {
          await fetchVendorDetail(vId);
        }
        setTimeout(() => setSuccess(""), 4000);
      } else {
        const errData = await res.json();
        setError(errData.error || "Failed to log cash payment to vendor.");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setActionLoading(false);
    }
  };

  // Listen to product change in restock form and autofill standard cost format
  const handleProductChange = (productId: string) => {
    setPurchaseProductId(productId);
    const selected = products.find(p => p.id === productId);
    if (selected) {
      // populate standard cost if available, otherwise default to 70% of standard price
      const standardCost = selected.costPrice ?? Math.round(selected.price * 0.7 * 100) / 100;
      setPurchaseCost(standardCost.toString());
    } else {
      setPurchaseCost("");
    }
  };

  // Listen to product change in return form and autofill standard cost format
  const handleReturnProductChange = (productId: string) => {
    setReturnProductId(productId);
    const selected = products.find(p => p.id === productId);
    if (selected) {
      const standardCost = selected.costPrice ?? Math.round(selected.price * 0.7 * 100) / 100;
      setReturnCost(standardCost.toString());
    } else {
      setReturnCost("");
    }
  };

  // Edit / Update Vendor Payment
  const handleEditPaymentSubmit = async (pId: string) => {
    setError("");
    setSuccess("");

    const amt = Number(editPaymentAmount);

    if (isNaN(amt) || amt <= 0) {
      setError("Please specify a valid payment amount.");
      return;
    }

    setPaymentEditLoading(true);
    try {
      const res = await fetch(`/api/vendor-payments/${pId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amt,
          account: editPaymentAccount
        })
      });

      if (res.ok) {
        setSuccess("Supplier credit payment modified successfully!");
        setEditingPaymentId(null);
        // Refresh local vendor details
        if (selectedVendorDetail) {
          await fetchVendorDetail(selectedVendorDetail.vendor.id);
          await fetchVendors();
        }
        // Refresh global state so other tabs like Dashboard, Profit&Loss update
        if (onRefreshGlobal) {
          await onRefreshGlobal();
        }
        setTimeout(() => setSuccess(""), 4000);
      } else {
        const errData = await res.json();
        setError(errData.error || "Failed to edit credit payment entry.");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setPaymentEditLoading(false);
    }
  };

  // Save Stock Return to Supplier
  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const vId = returnVendorId || (selectedVendorDetail ? selectedVendorDetail.vendor.id : "");
    const pId = returnProductId;
    const qty = Number(returnQty);
    const cost = Number(returnCost);

    if (!vId) {
      setError("Please select a vendor.");
      return;
    }
    if (!pId) {
      setError("Please select a product.");
      return;
    }
    if (isNaN(qty) || qty <= 0) {
      setError("Please enter a valid quantity to return.");
      return;
    }
    if (isNaN(cost) || cost <= 0) {
      setError("Please specify the rate per item.");
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch("/api/vendor-purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendor_id: vId,
          product_id: pId,
          quantity: qty,
          cost_price: cost,
          is_return: true
        })
      });

      if (res.ok) {
        setSuccess("Stock return logged and supplier credit reduced!");
        setReturnVendorId("");
        setReturnProductId("");
        setReturnQty("");
        setReturnCost("");
        setShowReturnForm(false);
        // Refresh
        await fetchVendors();
        if (selectedVendorDetail?.vendor.id === vId) {
          await fetchVendorDetail(vId);
        }
        if (onRefreshGlobal) {
          await onRefreshGlobal();
        }
        setTimeout(() => setSuccess(""), 4000);
      } else {
        const errData = await res.json();
        setError(errData.error || "Failed to log stock return in ledger.");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered vendors list
  const filteredVendors = vendors.filter(v => 
    v.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Total Outstanding Supplier Debt
  const totalVendorDebt = vendors.reduce((sum, v) => sum + (v.balance || 0), 0);

  // Combined Vendor activity entries sorted chronologically
  const getCombinedLedgerEntries = () => {
    if (!selectedVendorDetail) return [];
    const entries: any[] = [];
    
    selectedVendorDetail.purchases.forEach(p => {
      const qty = Number(p.quantity || 0);
      const isReturn = qty < 0 || !!p.is_return;
      entries.push({
        id: p.id,
        type: "purchase",
        isReturn,
        description: isReturn 
          ? `Returned ${Math.abs(qty)} × ${p.product_name} (Stock Return)` 
          : `Restocked ${qty} × ${p.product_name}`,
        amount: p.total_amount,
        rate: p.cost_price,
        qty: qty,
        date: p.date,
      });
    });

    selectedVendorDetail.payments.forEach(pay => {
      entries.push({
        id: pay.id,
        type: "payment",
        description: "Cash / Bank Paid to Supplier",
        amount: pay.amount,
        account: pay.account || "cash",
        date: pay.date,
      });
    });

    // sort chronologically descending
    return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  return (
    <div className="space-y-8">
      {/* Detail view of selected vendor, otherwise general master vendors board */}
      {selectedVendorDetail ? (
        // --- SECTOR A: Vendor Detail Ledger View ---
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <button
              onClick={() => setSelectedVendorDetail(null)}
              className="flex items-center gap-2 text-stone-500 hover:text-stone-900 transition text-xs font-bold uppercase tracking-wider"
            >
              <ArrowLeft size={14} />
              <span>Back to Vendors Board</span>
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const v = selectedVendorDetail.vendor;
                  setEditVendor(v);
                  setEditVendorName(v.name || "");
                  setEditVendorPhone(v.phone || "");
                  setShowEditVendorModal(true);
                }}
                className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg font-bold text-xs flex items-center gap-1.5 border border-stone-200 transition-colors"
              >
                <Edit2 size={13} />
                <span>Edit Profile</span>
              </button>
              
              <button
                onClick={() => handleDeleteVendor(selectedVendorDetail.vendor.id, selectedVendorDetail.vendor.name)}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg font-bold text-xs flex items-center gap-1.5 border border-rose-200 transition-colors"
              >
                <Trash2 size={13} />
                <span>Delete Supplier</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-stone-100 shadow-sm text-stone-950">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-stone-900 text-white rounded-xl flex items-center justify-center font-bold text-lg select-none">
                {selectedVendorDetail.vendor.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-black text-stone-900 tracking-tight">{selectedVendorDetail.vendor.name}</h1>
                <p className="text-stone-500 flex items-center gap-1.5 text-xs font-semibold mt-1">
                  <Phone size={13} className="text-stone-400" />
                  <span>{selectedVendorDetail.vendor.phone || "No phone added"}</span>
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs font-bold text-stone-400 uppercase tracking-widest block font-sans">Account Balance Due</span>
              <span className={`text-2xl font-black block font-mono ${selectedVendorDetail.vendor.balance >= 0 ? "text-rose-600" : "text-emerald-700"}`}>
                {Math.round(selectedVendorDetail.vendor.balance).toLocaleString()} SAR
              </span>
              <span className="text-[10px] text-stone-500 font-bold block">
                {selectedVendorDetail.vendor.balance >= 0 ? "Outstanding Debt We Owe" : "Prepaid Surplus Advanced"}
              </span>
            </div>
          </div>

          {/* Quick Actions Row for active Vendor */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => {
                setShowPurchaseForm(true);
                setShowPaymentForm(false);
                setShowReturnForm(false);
              }}
              className="p-5 bg-stone-900 hover:bg-stone-800 text-white rounded-2xl transition flex items-center justify-between text-left group cursor-pointer"
            >
              <div>
                <span className="font-bold text-xs uppercase tracking-widest text-stone-300 block">Inventory Delivery</span>
                <span className="font-black text-lg mt-0.5 block leading-tight">Log Stock Supply Restock</span>
                <p className="text-stone-400 text-xs mt-1 font-medium">Record item rate we bought from this supplier.</p>
              </div>
              <ShoppingBag size={24} className="text-stone-400 group-hover:scale-110 transition-transform ml-2 flex-shrink-0" />
            </button>

            <button
              onClick={() => {
                setShowPaymentForm(true);
                setShowPurchaseForm(false);
                setShowReturnForm(false);
              }}
              className="p-5 bg-white hover:bg-stone-50 text-stone-900 rounded-2xl border border-stone-200 transition flex items-center justify-between text-left group cursor-pointer"
            >
              <div>
                <span className="font-bold text-xs uppercase tracking-widest text-stone-500 block">Cash Disbursement</span>
                <span className="font-black text-lg mt-0.5 block leading-tight text-emerald-800">Dispense Payment to Supplier</span>
                <p className="text-stone-500 text-xs mt-1 font-medium">Log direct cash or bank transfer made to clear balance.</p>
              </div>
              <DollarSign size={24} className="text-emerald-600 group-hover:scale-110 transition-transform ml-2 flex-shrink-0" />
            </button>

            <button
              onClick={() => {
                setShowReturnForm(true);
                setShowPurchaseForm(false);
                setShowPaymentForm(false);
              }}
              className="p-5 bg-rose-50/50 hover:bg-rose-50 text-rose-950 rounded-2xl border border-rose-200/60 transition flex items-center justify-between text-left group cursor-pointer"
            >
              <div>
                <span className="font-bold text-xs uppercase tracking-widest text-rose-700 block">Stock Returns</span>
                <span className="font-black text-lg mt-0.5 block leading-tight text-rose-800 font-sans">Return Stock to Vendor</span>
                <p className="text-rose-900/60 text-xs mt-1 font-medium">Record stock returned to vendor and reduce credit liability.</p>
              </div>
              <RotateCcw size={24} className="text-rose-600 group-hover:scale-110 transition-transform ml-2 flex-shrink-0" />
            </button>
          </div>

          {/* Alerts / Logs */}
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

          {/* Sub Forms Drawer for selected Vendor */}
          {showPurchaseForm && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              onSubmit={handlePurchaseSubmit}
              className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm space-y-4 overflow-hidden"
            >
              <h3 className="font-bold text-stone-900 text-base">Record Inbound Supplier Restock Cargo</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">Delivered Product</label>
                  <select
                    value={purchaseProductId}
                    onChange={(e) => handleProductChange(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl outline-none text-stone-900 text-sm font-medium focus:border-stone-400 focus:bg-white"
                  >
                    <option value="">-- Choose Item --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (Selling Rate: {p.price} SAR)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">Delivered Quantity</label>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    placeholder="e.g. 50"
                    value={purchaseQty}
                    onChange={(e) => setPurchaseQty(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl outline-none text-stone-900 text-sm font-medium focus:border-stone-400 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">Bought Cost Price/Item (SAR)</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="Auto-populated"
                    value={purchaseCost}
                    onChange={(e) => setPurchaseCost(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl outline-none text-stone-900 text-sm font-medium focus:border-stone-400 focus:bg-white font-mono"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-2 gap-3">
                <button
                  type="button"
                  onClick={() => setShowPurchaseForm(false)}
                  className="px-4 py-2 text-stone-500 hover:text-stone-900 font-semibold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-stone-900 hover:bg-stone-800 disabled:bg-stone-500 text-white font-semibold text-xs rounded-lg transition cursor-pointer"
                >
                  {actionLoading ? "Processing restock..." : "Post to Supplier Ledger"}
                </button>
              </div>
            </motion.form>
          )}

          {showPaymentForm && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              onSubmit={handlePaymentSubmit}
              className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm space-y-4 overflow-hidden"
            >
              <h3 className="font-bold text-stone-900 text-base">Record Payment to Supplier</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">Payment Amount (SAR)</label>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    placeholder="e.g. 500"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl outline-none text-stone-900 text-sm font-medium focus:border-stone-400 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">Payment From Account</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentAccount("cash")}
                      className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition cursor-pointer ${
                        paymentAccount === "cash"
                          ? "border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-600/20"
                          : "border-stone-200 bg-stone-50 hover:bg-stone-150 text-stone-600"
                      }`}
                    >
                      <span>Petty Cash</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentAccount("bank")}
                      className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition cursor-pointer ${
                        paymentAccount === "bank"
                          ? "border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-600/20"
                          : "border-stone-200 bg-stone-50 hover:bg-stone-150 text-stone-600"
                      }`}
                    >
                      <span>Bank Account</span>
                    </button>
                  </div>
                </div>
              </div>
              <p className="text-xs text-stone-500 mt-1 font-medium">This transaction will deduct from the outstanding balance due of {selectedVendorDetail.vendor.name} and reflect in the selected account.</p>
              <div className="flex justify-end pt-2 gap-3">
                <button
                  type="button"
                  onClick={() => setShowPaymentForm(false)}
                  className="px-4 py-2 text-stone-500 hover:text-stone-900 font-semibold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-500 text-white font-semibold text-xs rounded-lg transition cursor-pointer"
                >
                  {actionLoading ? "Saving entry..." : "Confirm Supplier Remit"}
                </button>
              </div>
            </motion.form>
          )}

          {showReturnForm && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              onSubmit={handleReturnSubmit}
              className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm space-y-4 overflow-hidden"
            >
              <h3 className="font-bold text-stone-900 text-base">Record Stock Return to Vendor</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">Returned Product</label>
                  <select
                    value={returnProductId}
                    onChange={(e) => handleReturnProductChange(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl outline-none text-stone-900 text-sm font-medium focus:border-stone-400 focus:bg-white"
                  >
                    <option value="">-- Choose Item --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (Selling Rate: {p.price} SAR)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">Returned Quantity</label>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    placeholder="e.g. 5"
                    value={returnQty}
                    onChange={(e) => setReturnQty(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl outline-none text-stone-900 text-sm font-medium focus:border-stone-400 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">Returned Rate/Item (SAR)</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="Auto-populated"
                    value={returnCost}
                    onChange={(e) => setReturnCost(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl outline-none text-stone-900 text-sm font-medium focus:border-stone-400 focus:bg-white font-mono"
                  />
                </div>
              </div>
              <p className="text-xs text-stone-500 mt-1 font-medium font-sans">Logging this stock return will automatically subtract the returned quantity from the product inventory stock and reduce the balance due to this supplier.</p>
              <div className="flex justify-end pt-2 gap-3">
                <button
                  type="button"
                  onClick={() => setShowReturnForm(false)}
                  className="px-4 py-2 text-stone-500 hover:text-stone-900 font-semibold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-rose-700 hover:bg-rose-800 disabled:bg-rose-500 text-white font-semibold text-xs rounded-lg transition cursor-pointer"
                >
                  {actionLoading ? "Processing return..." : "Confirm Stock Return"}
                </button>
              </div>
            </motion.form>
          )}

          {/* Activity Logs Timeline */}
          <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm">
            <h3 className="text-base font-bold text-stone-900 pb-4 border-b border-stone-100 flex items-center gap-2">
              <History size={16} />
              <span>Full Account Statement Ledger</span>
            </h3>

            {getCombinedLedgerEntries().length === 0 ? (
              <div className="py-12 text-center text-stone-400">
                <p className="text-sm font-medium">No purchase transactions or remittance payments logged yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-stone-100 mt-2 font-medium">
                {getCombinedLedgerEntries().map((item) => {
                  const isPurchase = item.type === "purchase";
                  
                  if (editingPurchaseId === item.id) {
                    return (
                      <div key={item.id} className="py-4 bg-stone-50 p-4 rounded-2xl border border-stone-200 my-2 space-y-3">
                        <div className="flex justify-between items-center pb-2 border-b border-stone-150">
                          <span className="text-xs font-extrabold text-stone-600 uppercase tracking-wider">
                            📝 {item.isReturn ? "Edit Stock Return Log" : "Edit Restock Stock Order"}
                          </span>
                          <span className="text-[10px] text-stone-400 font-mono font-bold">ID: {item.id}</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1 font-bold">Quantity (Units)</label>
                            <input
                              type="number"
                              step="any"
                              min="1"
                              placeholder="e.g. 50"
                              value={editPurchaseQty}
                              onChange={(e) => setEditPurchaseQty(e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl outline-none text-stone-900 text-xs font-bold font-sans focus:border-stone-400"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1 font-bold">Cost PRICE (SAR / Unit)</label>
                            <input
                              type="number"
                              step="any"
                              min="0.1"
                              placeholder="e.g. 3.5"
                              value={editPurchaseCost}
                              onChange={(e) => setEditPurchaseCost(e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl outline-none text-stone-900 text-xs font-bold font-sans focus:border-stone-400"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setEditingPurchaseId(null)}
                            className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold rounded-lg text-xs cursor-pointer transition"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEditPurchaseSubmit(item.id)}
                            disabled={purchaseEditLoading}
                            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs cursor-pointer transition disabled:opacity-50"
                          >
                            {purchaseEditLoading ? "Saving..." : "Save Changes"}
                          </button>
                        </div>
                      </div>
                    );
                  }

                  if (editingPaymentId === item.id) {
                    return (
                      <div key={item.id} className="py-4 bg-stone-50 p-4 rounded-2xl border border-stone-200 my-2 space-y-3">
                        <div className="flex justify-between items-center pb-2 border-b border-stone-150">
                          <span className="text-xs font-extrabold text-stone-600 uppercase tracking-wider">📝 Edit Payment Out Record</span>
                          <span className="text-[10px] text-stone-400 font-mono font-bold">ID: {item.id}</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">Paid Amount (SAR)</label>
                            <input
                              type="number"
                              step="any"
                              min="1"
                              placeholder="e.g. 500"
                              value={editPaymentAmount}
                              onChange={(e) => setEditPaymentAmount(e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl outline-none text-stone-900 text-xs font-bold font-sans focus:border-stone-400"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1 font-bold">Payment Account</label>
                            <select
                              value={editPaymentAccount}
                              onChange={(e) => setEditPaymentAccount(e.target.value as "cash" | "bank")}
                              className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl outline-none text-stone-900 text-xs font-bold focus:border-stone-400"
                            >
                              <option value="cash">Petty Cash</option>
                              <option value="bank">Bank Account</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setEditingPaymentId(null)}
                            className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold rounded-lg text-xs cursor-pointer transition"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEditPaymentSubmit(item.id)}
                            disabled={paymentEditLoading}
                            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs cursor-pointer transition disabled:opacity-50"
                          >
                            {paymentEditLoading ? "Saving..." : "Save Changes"}
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={item.id} className="py-4 flex items-center justify-between gap-4 hover:bg-stone-50/20 px-1 rounded-xl transition-all">
                      <div>
                        <span className={`text-xs inline-block px-2 py-0.5 rounded-full font-bold uppercase tracking-wider mb-1 ${
                          isPurchase 
                            ? item.isReturn 
                              ? 'bg-rose-50 text-rose-700' 
                              : 'bg-orange-50 text-orange-700' 
                            : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          {isPurchase ? (item.isReturn ? "Stock Return" : "Stock Order") : "Payment Out"}
                        </span>
                        <p className="text-stone-900 text-sm font-bold">{item.description}</p>
                        {isPurchase ? (
                          <div className="flex flex-col gap-1.5">
                            <span className="text-[10px] text-stone-500 block font-mono">
                              Cost Price: {Math.round(item.rate).toLocaleString()} SAR / unit
                            </span>
                            <button
                              onClick={() => {
                                setEditingPurchaseId(item.id);
                                setEditPurchaseQty(Math.abs(item.qty).toString());
                                setEditPurchaseCost(item.rate.toString());
                              }}
                              className="text-[10px] text-stone-450 hover:text-stone-900 hover:underline flex items-center gap-1 cursor-pointer transition-all w-fit mt-0.5 font-bold"
                            >
                              <Edit2 size={10} />
                              <span>{item.isReturn ? "Edit Stock Return" : "Edit Supply Log"}</span>
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1.5">
                            <span className="text-[10px] text-stone-500 block">
                              Account: {item.account === "bank" ? "Bank Account" : "Petty Cash"}
                            </span>
                            <button
                              onClick={() => {
                                setEditingPaymentId(item.id);
                                setEditPaymentAmount(item.amount.toString());
                                setEditPaymentAccount(item.account || "cash");
                              }}
                              className="text-[10px] text-stone-450 hover:text-stone-900 hover:underline flex items-center gap-1 cursor-pointer transition-all w-fit mt-0.5 font-bold"
                            >
                              <Edit2 size={10} />
                              <span>Edit Payment Entry</span>
                            </button>
                          </div>
                        )}
                        <span className="text-[10px] text-stone-400 font-semibold block mt-1">
                          {new Date(item.date).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className={`text-base font-extrabold ${
                          isPurchase 
                            ? item.isReturn 
                              ? "text-rose-600" 
                              : "text-stone-900" 
                            : "text-emerald-700"
                        }`}>
                          {isPurchase ? (item.isReturn ? "-" : "+") : "-"} {Math.round(Math.abs(item.amount)).toLocaleString()} SAR
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        // --- SECTOR B: Dashboard & List of Vendors ---
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-stone-900">Store Suppliers / Vendors</h1>
              <p className="text-stone-500 mt-1">Manage vendor credit, inventory buys, and view who we owe.</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowPurchaseForm(true);
                  setShowAddVendorForm(false);
                }}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold rounded-xl text-sm transition-all flex items-center gap-2 border border-stone-200"
              >
                <ArrowDownToLine size={15} />
                <span>Log Stock Restock</span>
              </button>
              <button
                onClick={() => {
                  setShowAddVendorForm(!showAddVendorForm);
                  setShowPurchaseForm(false);
                }}
                className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white font-semibold rounded-xl text-sm transition-all flex items-center gap-2"
              >
                <PlusCircle size={15} />
                <span>{showAddVendorForm ? "Close Form" : "Add Vendor"}</span>
              </button>
            </div>
          </div>

          {/* Quick supplier liability dashboard card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm flex justify-between items-center">
              <div>
                <span className="text-stone-400 font-bold text-[10px] uppercase tracking-wider block">Total Suppliers Debt Liability</span>
                <h3 className="text-3xl font-black text-rose-600 mt-1 font-mono">{Math.round(totalVendorDebt).toLocaleString()} SAR</h3>
                <p className="text-stone-500 text-xs mt-1.5 font-medium">Outstanding payments due to registered suppliers.</p>
              </div>
              <div className="p-4 bg-rose-50 text-rose-600 rounded-xl">
                <Building2 size={24} />
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm flex justify-between items-center">
              <div>
                <span className="text-stone-400 font-bold text-[10px] uppercase tracking-wider block">Suppliers Accounts</span>
                <h3 className="text-3xl font-black text-stone-900 mt-1 font-mono">{vendors.length}</h3>
                <p className="text-stone-500 text-xs mt-1.5 font-medium">Active merchant wholesalers & stock suppliers.</p>
              </div>
              <div className="p-4 bg-stone-50 text-stone-600 rounded-xl">
                <Layers size={24} />
              </div>
            </div>
          </div>

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

          {/* Add Vendor Form */}
          {showAddVendorForm && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              onSubmit={handleAddVendorSubmit}
              className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm space-y-4 overflow-hidden"
            >
              <h3 className="font-bold text-stone-900 text-base">Register New Supplier / Vendor Account</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5 font-bold">Supplier / Company Name <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Riyadh Wholesaler Ltd"
                    value={vendorName}
                    onChange={(e) => setVendorName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl outline-none text-stone-900 text-sm font-medium focus:border-stone-400 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5 font-bold">Contact Phone (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. 96651234567"
                    value={vendorPhone}
                    onChange={(e) => setVendorPhone(e.target.value)}
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl outline-none text-stone-900 text-sm font-sans focus:border-stone-400 focus:bg-white"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddVendorForm(false)}
                  className="px-4 py-2 text-stone-500 hover:text-stone-900 font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-stone-900 hover:bg-stone-800 disabled:bg-stone-500 text-white font-semibold text-xs rounded-lg transition"
                >
                  {actionLoading ? "Adding..." : "Register Vendor"}
                </button>
              </div>
            </motion.form>
          )}

          {/* Quick supply purchase form when not selected */}
          {showPurchaseForm && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              onSubmit={handlePurchaseSubmit}
              className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm space-y-4 overflow-hidden"
            >
              <h3 className="font-bold text-stone-900 text-base">Record Inbound Supplier Restock Cargo</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">Supplier / Vendor</label>
                  <select
                    value={purchaseVendorId}
                    onChange={(e) => setPurchaseVendorId(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl outline-none text-stone-900 text-sm font-medium focus:border-stone-400 focus:bg-white"
                  >
                    <option value="">-- Choose Vendor --</option>
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">Delivered Product</label>
                  <select
                    value={purchaseProductId}
                    onChange={(e) => handleProductChange(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl outline-none text-stone-900 text-sm font-medium focus:border-stone-400 focus:bg-white"
                  >
                    <option value="">-- Choose Item --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">Delivered Quantity</label>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    placeholder="e.g. 100"
                    value={purchaseQty}
                    onChange={(e) => setPurchaseQty(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl outline-none text-stone-900 text-sm font-medium focus:border-stone-400 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">Buying Cost Price/Item (SAR)</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="Auto-populated"
                    value={purchaseCost}
                    onChange={(e) => setPurchaseCost(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl outline-none text-stone-900 text-sm font-medium focus:border-stone-400 focus:bg-white font-mono"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-2 gap-3">
                <button
                  type="button"
                  onClick={() => setShowPurchaseForm(false)}
                  className="px-4 py-2 text-stone-500 hover:text-stone-900 font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-stone-900 hover:bg-stone-800 disabled:bg-stone-500 text-white font-semibold text-xs rounded-lg transition"
                >
                  {actionLoading ? "Processing restock..." : "Post to Supplier Ledger"}
                </button>
              </div>
            </motion.form>
          )}

          {/* Vendors directory card */}
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden" id="vendors-directory">
            <div className="p-5 border-b border-stone-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h3 className="font-bold text-stone-900 text-base">Suppliers Credit Ledger ("Udhar")</h3>
              <div className="relative w-full sm:w-72">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  placeholder="Query company/vendor name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl outline-none text-stone-900 text-xs font-medium focus:bg-white focus:border-stone-400 transition"
                />
              </div>
            </div>

            {loading ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-8 h-8 rounded-full border-2 border-stone-100 border-t-emerald-600 animate-spin mx-auto" />
                <span className="text-xs font-mono text-stone-400 uppercase tracking-wider block">Polling suppliers board...</span>
              </div>
            ) : filteredVendors.length === 0 ? (
              <div className="py-16 text-center text-stone-400 space-y-2">
                <Building2 size={36} className="text-stone-300 mx-auto" />
                <p className="text-sm font-semibold text-stone-700">No registered suppliers found</p>
                <p className="text-xs text-stone-400 max-w-xs mx-auto">Click "Add Vendor" to create accounts & record restocked shipments to establish margins.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-stone-900">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-100 font-bold text-stone-450 text-[10px] uppercase tracking-wider select-none">
                      <th scope="col" className="px-6 py-3.5">Vendor Name</th>
                      <th scope="col" className="px-6 py-3.5">Contact Phone</th>
                      <th scope="col" className="px-6 py-3.5 text-right font-sans">Outstanding Due We Owe</th>
                      <th scope="col" className="px-6 py-3.5 text-right w-24">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filteredVendors.map((v) => {
                      const isDebtor = v.balance > 0;
                      return (
                        <tr key={v.id} className="hover:bg-stone-50/40 transition-colors font-medium">
                          <td className="px-6 py-4.5 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <span className="w-8 h-8 rounded-lg bg-stone-100 text-stone-750 flex items-center justify-center font-bold text-xs">
                                {v.name.charAt(0).toUpperCase()}
                              </span>
                              <div>
                                <span className="text-stone-900 font-bold text-sm block">
                                  {v.name}
                                </span>
                                {v.openingBalance !== undefined && v.openingBalance !== 0 && (
                                  <span className="text-[10px] text-stone-450 block font-sans">Opening: {Math.round(v.openingBalance).toLocaleString()} SAR</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4.5 whitespace-nowrap text-stone-500 text-xs">
                            {v.phone || <em className="text-stone-400 font-sans">None</em>}
                          </td>
                          <td className="px-6 py-4.5 whitespace-nowrap text-right">
                            <span className={`text-sm font-extrabold ${isDebtor ? 'text-rose-600' : v.balance < 0 ? 'text-emerald-700' : 'text-stone-800'}`}>
                              {v.balance >= 0 ? `${Math.round(v.balance).toLocaleString()}` : `${Math.round(Math.abs(v.balance)).toLocaleString()}`} SAR
                              {v.balance < 0 && <span className="text-[10px] font-bold uppercase ml-1 block text-emerald-600 leading-none">Prepaid</span>}
                            </span>
                          </td>
                          <td className="px-6 py-4.5 whitespace-nowrap">
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => fetchVendorDetail(v.id)}
                                className="px-2.5 py-1.5 bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-850 rounded-lg text-xs font-bold transition flex items-center gap-1"
                              >
                                <span>Ledger</span>
                                <ChevronRight size={13} className="text-stone-400" />
                              </button>
                              
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditVendor(v);
                                  setEditVendorName(v.name || "");
                                  setEditVendorPhone(v.phone || "");
                                  setShowEditVendorModal(true);
                                }}
                                className="px-2.5 py-1.5 bg-stone-50 hover:bg-amber-50 hover:text-amber-800 text-stone-700 rounded-lg border border-stone-200 hover:border-amber-200 transition-colors inline-flex items-center gap-1 text-xs font-bold"
                              >
                                <Edit2 size={12} />
                                <span>Edit</span>
                              </button>
                              
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteVendor(v.id, v.name);
                                }}
                                className="px-2.5 py-1.5 bg-stone-50 hover:bg-rose-50 hover:text-rose-800 text-rose-655 rounded-lg border border-stone-200 hover:border-rose-200 transition-colors inline-flex items-center gap-1 text-xs font-bold"
                              >
                                <Trash2 size={12} />
                                <span>Delete</span>
                              </button>
                            </div>
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
      )}

      {/* Edit Vendor Dialogue / Dialog Modal */}
      <AnimatePresence>
        {showEditVendorModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 leading-normal text-stone-900">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-2xl p-6 shadow-xl border border-stone-100 space-y-4"
              id="edit-vendor-modal"
            >
              <div className="flex justify-between items-center pb-2 border-b border-stone-100">
                <h3 className="font-extrabold text-stone-905 text-base">✏️ Edit Supplier Profile</h3>
                <button
                  onClick={() => {
                    setShowEditVendorModal(false);
                    setEditVendor(null);
                  }}
                  className="text-stone-400 hover:text-stone-600 text-sm font-semibold"
                >
                  Close
                </button>
              </div>

              <form onSubmit={handleEditVendorSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5 font-bold">Supplier Name <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    value={editVendorName}
                    onChange={(e) => setEditVendorName(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-medium text-stone-900 text-sm outline-none focus:border-stone-400 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5 font-bold">Phone Connection</label>
                  <input
                    type="text"
                    value={editVendorPhone}
                    onChange={(e) => setEditVendorPhone(e.target.value)}
                    placeholder="e.g. 96651234567"
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-sans text-stone-900 text-sm outline-none focus:border-stone-400 focus:bg-white"
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditVendorModal(false);
                      setEditVendor(null);
                    }}
                    className="px-4 py-2 bg-stone-100 text-stone-600 font-semibold text-xs rounded-lg hover:bg-stone-200 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editVendorLoading}
                    className="px-5 py-2 bg-stone-900 text-white font-semibold text-xs rounded-lg hover:bg-stone-800 disabled:bg-stone-400 transition"
                  >
                    {editVendorLoading ? "Saving..." : "Save Changes"}
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
