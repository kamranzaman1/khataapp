import React, { useState } from "react";
import { Product, Vendor, Customer } from "../types";
import { 
  PlusCircle, ShoppingBag, DollarSign, Tag, Check, 
  AlertCircle, Pencil, X, Save, Layers, Search, Sliders,
  Calendar, User, ListOrdered, ArrowUpDown, Info, Printer
} from "lucide-react";
import { motion } from "motion/react";

interface ProductsListProps {
  products: Product[];
  customers?: Customer[];
  onAddProduct: (name: string, price: number, costPrice?: number, hideInPortal?: boolean) => Promise<boolean>;
  onUpdateProduct: (id: string, name: string, price: number, costPrice?: number, hideInPortal?: boolean) => Promise<boolean>;
  allTransactions?: any[];
  allVendorPurchases?: any[];
  activeTab?: "catalog" | "inventory" | "ledger";
  setActiveTab?: (tab: "catalog" | "inventory" | "ledger") => void;
  onNavigateToVendors?: () => void;
  onNavigateToSales?: () => void;
  vendors?: Vendor[];
  onRefreshData?: () => Promise<void>;
}

export default function ProductsList({ 
  products = [], 
  customers = [],
  onAddProduct, 
  onUpdateProduct,
  allTransactions = [],
  allVendorPurchases = [],
  activeTab = "catalog",
  setActiveTab,
  onNavigateToVendors,
  onNavigateToSales,
  vendors = [],
  onRefreshData
}: ProductsListProps) {
  // New Product Form State
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [hideInPortal, setHideInPortal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  // Search inside Inventory
  const [inventorySearch, setInventorySearch] = useState("");

  // Stock Ledger Filters State
  const [ledgerSearch, setLedgerSearch] = useState("");
  const [ledgerProductIdFilter, setLedgerProductIdFilter] = useState("all");
  const [ledgerCustomerIdFilter, setLedgerCustomerIdFilter] = useState("all");
  const [ledgerFromDate, setLedgerFromDate] = useState("");
  const [ledgerToDate, setLedgerToDate] = useState("");
  const [ledgerSortNewest, setLedgerSortNewest] = useState(true);

  // Editing state
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editCostPrice, setEditCostPrice] = useState("");
  const [editHideInPortal, setEditHideInPortal] = useState(false);

  // Stock Adjustment States
  const [adjustingProduct, setAdjustingProduct] = useState<{
    product: Product;
    available: number;
    currentCost: number;
  } | null>(null);
  const [adjustType, setAdjustType] = useState<"set" | "add" | "remove">("set");
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustCost, setAdjustCost] = useState("");
  const [adjustVendorId, setAdjustVendorId] = useState("system");
  const [adjustLoading, setAdjustLoading] = useState(false);

  const handleOpenStockAdjust = (p: Product, available: number, currentCost: number) => {
    setAdjustingProduct({ product: p, available, currentCost });
    setAdjustType("set");
    setAdjustQty(available.toString());
    setAdjustCost(currentCost.toString());
    setAdjustVendorId("system");
    setSuccess("");
    setError("");
  };

  const handleSaveStockAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProduct) return;
    setSuccess("");
    setError("");

    const qtyVal = Number(adjustQty);
    if (isNaN(qtyVal) || qtyVal < 0) {
      setError("Please enter a valid stock/quantity value.");
      return;
    }

    const costVal = Number(adjustCost);
    if (isNaN(costVal) || costVal < 0) {
      setError("Please enter a valid buying cost rate.");
      return;
    }

    let delta = 0;
    if (adjustType === "set") {
      delta = qtyVal - adjustingProduct.available;
    } else if (adjustType === "add") {
      delta = qtyVal;
    } else if (adjustType === "remove") {
      delta = -qtyVal;
    }

    if (delta === 0) {
      setError("Adjusted stock level is the same as current. No changes needed.");
      return;
    }

    setAdjustLoading(true);

    try {
      let finalVendorId = adjustVendorId;

      // Handle system adjustment vendor check & automatic creation if choosing system
      if (adjustVendorId === "system") {
        const sysVendor = vendors.find(v => 
          v.name.toLowerCase().includes("system stock correction") || 
          v.name.toLowerCase().includes("system stock adjustment")
        );

        if (sysVendor) {
          finalVendorId = sysVendor.id;
        } else {
          // Create System Stock Correction vendor doc
          const sysRes = await fetch("/api/vendors", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: "System Stock Correction",
              phone: "0000",
              openingBalance: 0
            })
          });

          if (!sysRes.ok) {
            throw new Error("Unable to create default system adjustment supplier ledger.");
          }

          const newSysVendor = await sysRes.json();
          finalVendorId = newSysVendor.id;
        }
      }

      // Record vendor purchase (Stock Adjustment entry)
      const res = await fetch("/api/vendor-purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendor_id: finalVendorId,
          product_id: adjustingProduct.product.id,
          quantity: delta,
          cost_price: costVal
        })
      });

      if (res.ok) {
        setSuccess(`Stock updated! Recorded ${delta > 0 ? "+" : ""}${delta} units for "${adjustingProduct.product.name}".`);
        setAdjustingProduct(null);
        setAdjustQty("");
        setAdjustCost("");
        if (onRefreshData) {
          await onRefreshData();
        }
        setTimeout(() => setSuccess(""), 4000);
      } else {
        const errData = await res.json();
        setError(errData.error || "Failed to submit stock level update.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during stock saving.");
    } finally {
      setAdjustLoading(false);
    }
  };

  const startEdit = (p: Product) => {
    setEditingProductId(p.id);
    setEditName(p.name);
    setEditPrice(p.price.toString());
    setEditCostPrice((p.costPrice ?? Math.round(p.price * 0.7 * 100) / 100).toString());
    setEditHideInPortal(!!p.hideInPortal);
    setSuccess("");
    setError("");
  };

  const cancelEdit = () => {
    setEditingProductId(null);
    setEditName("");
    setEditPrice("");
    setEditCostPrice("");
    setEditHideInPortal(false);
  };

  const handleSaveEdit = async (id: string) => {
    setSuccess("");
    setError("");

    const pAmt = Number(editPrice);
    const cAmt = Number(editCostPrice);
    if (!editName.trim() || isNaN(pAmt) || pAmt <= 0) {
      setError("Please provide a valid name and positive price.");
      return;
    }
    if (isNaN(cAmt) || cAmt < 0) {
      setError("Please provide a valid cost price (0 or positive).");
      return;
    }

    setLoading(true);
    try {
      const ok = await onUpdateProduct(id, editName.trim(), pAmt, cAmt, editHideInPortal);
      if (ok) {
        setSuccess("Product updated successfully!");
        setEditingProductId(null);
        setTimeout(() => setSuccess(""), 3000);
      } else {
        setError("Failed to update product.");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess("");
    setError("");

    const pAmt = Number(price);
    const cAmt = costPrice ? Number(costPrice) : Math.round(pAmt * 0.7 * 100) / 100;
    if (!name.trim() || isNaN(pAmt) || pAmt <= 0) {
      setError("Please provide a valid name and positive price.");
      return;
    }
    if (isNaN(cAmt) || cAmt < 0) {
      setError("Please provide a valid cost price.");
      return;
    }

    setLoading(true);
    try {
      const ok = await onAddProduct(name.trim(), pAmt, cAmt, hideInPortal);
      if (ok) {
        setSuccess("Product added successfully!");
        setName("");
        setPrice("");
        setCostPrice("");
        setHideInPortal(false);
        setShowAddForm(false);
        setTimeout(() => setSuccess(""), 3000);
      } else {
        setError("Failed to add product.");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  // Derive real stock quantity & value logic
  const productStocks = products.map((p) => {
    const productCost = p.costPrice ?? Math.round(p.price * 0.7 * 100) / 100;
    
    // Add cumulative vendor purchases
    const totalIn = allVendorPurchases
      .filter(vp => vp.product_id === p.id)
      .reduce((sum, vp) => sum + Number(vp.quantity || 0), 0);
      
    // Subtract cumulative sold transactions
    const totalOut = allTransactions
      .filter(t => t.product_id === p.id)
      .reduce((sum, t) => sum + Number(t.quantity || 0), 0);
      
    const available = totalIn - totalOut;
    const value = available > 0 ? (available * productCost) : 0;
    
    return {
      product: p,
      cost: productCost,
      totalIn,
      totalOut,
      available,
      value
    };
  });

  const totalInStoreQuantity = productStocks.reduce((sum, ps) => sum + (ps.available > 0 ? ps.available : 0), 0);
  const totalInventoryValue = productStocks.reduce((sum, ps) => sum + ps.value, 0);
  const lowStockProductsCount = productStocks.filter(ps => ps.available <= 10).length;

  const filteredInventory = productStocks.filter(ps => 
    ps.product.name.toLowerCase().includes(inventorySearch.toLowerCase())
  );

  // Map customers for fast lookup
  const customerMap = React.useMemo(() => {
    const map: Record<string, Customer> = {};
    customers.forEach(c => {
      map[c.id] = c;
    });
    return map;
  }, [customers]);

  // Map products for fast lookup
  const productMap = React.useMemo(() => {
    const map: Record<string, Product> = {};
    products.forEach(p => {
      map[p.id] = p;
    });
    return map;
  }, [products]);

  // Compute ledger entries
  const ledgerEntries = React.useMemo(() => {
    if (!allTransactions) return [];

    let filtered = allTransactions.map(t => {
      const cust = customerMap[t.customer_id];
      const prod = productMap[t.product_id];
      return {
        ...t,
        customerName: cust ? cust.name : "Unknown Customer",
        customerPhone: cust ? cust.phone : "",
        realProductName: prod ? prod.name : (t.product_name || "Unknown Product"),
        unitPrice: t.price || (prod ? prod.price : 0)
      };
    });

    // Apply search filter (Customer Name, Customer Phone, Product Name)
    if (ledgerSearch.trim()) {
      const searchLower = ledgerSearch.toLowerCase();
      filtered = filtered.filter(entry => 
        entry.customerName.toLowerCase().includes(searchLower) ||
        entry.customerPhone.includes(searchLower) ||
        entry.realProductName.toLowerCase().includes(searchLower)
      );
    }

    // Apply product ID filter
    if (ledgerProductIdFilter !== "all") {
      filtered = filtered.filter(entry => entry.product_id === ledgerProductIdFilter);
    }

    // Apply customer ID filter
    if (ledgerCustomerIdFilter !== "all") {
      filtered = filtered.filter(entry => entry.customer_id === ledgerCustomerIdFilter);
    }

    // Apply From Date
    if (ledgerFromDate) {
      filtered = filtered.filter(entry => {
        const entryDate = entry.date ? entry.date.split("T")[0] : "";
        return entryDate >= ledgerFromDate;
      });
    }

    // Apply To Date
    if (ledgerToDate) {
      filtered = filtered.filter(entry => {
        const entryDate = entry.date ? entry.date.split("T")[0] : "";
        return entryDate <= ledgerToDate;
      });
    }

    // Sort by Date
    filtered.sort((a, b) => {
      const dateA = new Date(a.date || 0).getTime();
      const dateB = new Date(b.date || 0).getTime();
      return ledgerSortNewest ? (dateB - dateA) : (dateA - dateB);
    });

    return filtered;
  }, [allTransactions, customerMap, productMap, ledgerSearch, ledgerProductIdFilter, ledgerCustomerIdFilter, ledgerFromDate, ledgerToDate, ledgerSortNewest]);

  // Stats for the current ledger entries
  const totalLedgerQty = ledgerEntries.reduce((sum, entry) => sum + Number(entry.quantity || 0), 0);
  const totalLedgerSales = ledgerEntries.reduce((sum, entry) => sum + Number(entry.total_amount || 0), 0);
  const uniqueLedgerCustomers = new Set(ledgerEntries.map(entry => entry.customer_id)).size;

  const handlePrintLedger = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow popups to print the ledger!");
      return;
    }

    const rowsHtml = ledgerEntries.map((entry, index) => {
      const formattedDate = entry.date 
        ? new Date(entry.date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric"
          }) 
        : "-";
      return `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 10px; font-size: 13px; font-weight: bold;">${index + 1}</td>
          <td style="padding: 10px; font-size: 13px;">${formattedDate}</td>
          <td style="padding: 10px; font-size: 13px; font-weight: bold; color: #1e293b;">${entry.customerName}</td>
          <td style="padding: 10px; font-size: 13px; color: #64748b;">${entry.customerPhone || "-"}</td>
          <td style="padding: 10px; font-size: 13px; font-weight: 500;">${entry.realProductName}</td>
          <td style="padding: 10px; font-size: 13px; text-align: right; font-family: monospace;">${Math.round(entry.unitPrice).toLocaleString()} SAR</td>
          <td style="padding: 10px; font-size: 13px; text-align: center; font-weight: bold;">${entry.quantity}</td>
          <td style="padding: 10px; font-size: 13px; text-align: right; font-weight: bold; font-family: monospace; color: #15803d;">${Math.round(entry.total_amount).toLocaleString()} SAR</td>
        </tr>
      `;
    }).join("");

    printWindow.document.write(`
      <html>
        <head>
          <title>Stock Sales Ledger Report</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; color: #1e293b; padding: 24px; }
            .header { margin-bottom: 24px; border-bottom: 2px solid #0f172a; padding-bottom: 16px; }
            .title { font-size: 24px; font-weight: 800; }
            .subtitle { font-size: 14px; color: #64748b; margin-top: 4px; }
            .summary-box { display: flex; gap: 24px; margin-bottom: 24px; background: #f8fafc; padding: 16px; border-radius: 12px; border: 1px solid #e2e8f0; }
            .summary-item { flex: 1; }
            .summary-label { font-size: 10px; font-weight: 800; text-transform: uppercase; color: #64748b; }
            .summary-value { font-size: 18px; font-weight: 800; color: #0f172a; margin-top: 2px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th { text-align: left; padding: 12px 10px; background: #f1f5f9; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #475569; border-bottom: 2px solid #cbd5e1; }
            th.text-right { text-align: right; }
            th.text-center { text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">📋 Stock Sales Ledger (سٹاک فروخت لیجر)</div>
            <div class="subtitle">Generated on ${new Date().toLocaleDateString()} - Real-time stock distribution tracking sheet</div>
          </div>
          <div class="summary-box">
            <div class="summary-item">
              <div class="summary-label">Total Transactions Count</div>
              <div class="summary-value">${ledgerEntries.length} Records</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Total Sold Quantity</div>
              <div class="summary-value">${totalLedgerQty.toLocaleString()} Units</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Total Sales Value</div>
              <div class="summary-value">${Math.round(totalLedgerSales).toLocaleString()} SAR</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Unique Buyer Profiles</div>
              <div class="summary-value">${uniqueLedgerCustomers} Customers</div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Sale Date</th>
                <th>Sold To (Customer)</th>
                <th>Phone</th>
                <th>Product Item</th>
                <th class="text-right">Rate</th>
                <th class="text-center">Qty Sold</th>
                <th class="text-right">Total Amount</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || '<tr><td colspan="8" style="padding: 24px; text-align: center; color: #64748b;">No sales records found for current filter selection.</td></tr>'}
            </tbody>
          </table>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-stone-900 tracking-tight">Products & Live Stock</h1>
          <p className="text-stone-500 text-sm mt-1">Manage standard rates catalog and observe actual live inventory quantities in hand.</p>
        </div>
        <div className="flex gap-2">
          {activeTab === "catalog" && (
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white font-semibold rounded-xl text-sm transition-all flex items-center gap-1.5"
            >
              <PlusCircle size={16} />
              <span>{showAddForm ? "Hide Form" : "New Product"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Tab Selector */}
      <div className="flex border-b border-stone-200">
        <button
          onClick={() => setActiveTab && setActiveTab("catalog")}
          className={`px-5 py-3 text-xs font-extrabold tracking-wider uppercase border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "catalog"
              ? "border-stone-900 text-stone-900"
              : "border-transparent text-stone-400 hover:text-stone-600"
          }`}
        >
          <Tag size={13} />
          <span>📋 Product Catalog & Rates</span>
        </button>
        <button
          onClick={() => setActiveTab && setActiveTab("inventory")}
          className={`px-5 py-3 text-xs font-extrabold tracking-wider uppercase border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "inventory"
              ? "border-emerald-600 text-emerald-700"
              : "border-transparent text-stone-400 hover:text-stone-600"
          }`}
        >
          <Layers size={13} />
          <span>📦 Live Store Stock Sheet</span>
        </button>
        <button
          onClick={() => setActiveTab && setActiveTab("ledger")}
          className={`px-5 py-3 text-xs font-extrabold tracking-wider uppercase border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "ledger"
              ? "border-indigo-600 text-indigo-700"
              : "border-transparent text-stone-400 hover:text-stone-600"
          }`}
          id="tab-btn-stock-sales-ledger"
        >
          <ListOrdered size={13} />
          <span>📜 Stock Sales Ledger (سٹاک لیجر)</span>
        </button>
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

      {activeTab === "catalog" && (
        <>
          {showAddForm && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              onSubmit={handleSubmit}
              className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm space-y-4 overflow-hidden"
            >
              <h3 className="font-bold text-stone-900 text-base">Add Product to Inventory</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">Product Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Sprite Can 330ml"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl outline-none text-stone-900 text-sm font-medium transition focus:border-stone-400 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">Selling Price (SAR)</label>
                  <input
                    type="number"
                    step="any"
                    min="0.1"
                    placeholder="e.g. 5"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl outline-none text-stone-900 text-sm font-medium transition focus:border-stone-400 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">Cost Price / Buying Rate (SAR)</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="e.g. 3.5 (Default: 70%)"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl outline-none text-stone-900 text-sm font-medium transition focus:border-stone-400 focus:bg-white"
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-2 py-1 bg-stone-50/50 p-3.5 rounded-xl border border-stone-100 max-w-lg">
                <input
                  type="checkbox"
                  id="hide-in-portal-check"
                  checked={!hideInPortal}
                  onChange={(e) => setHideInPortal(!e.target.checked)}
                  className="w-4 h-4 text-stone-900 border-stone-300 rounded focus:ring-stone-500 accent-stone-900 cursor-pointer"
                />
                <label htmlFor="hide-in-portal-check" className="text-xs font-bold text-stone-700 cursor-pointer flex flex-col select-none">
                  <span className="flex items-center gap-1.5">Show in Customer Portal <span className="text-emerald-600 font-sans font-bold">آرڈر پورٹل پر دکھائیں</span></span>
                  <span className="text-[10px] text-stone-400 font-normal mt-0.5">If unchecked, customers will not see this item in their self-service order portal.</span>
                </label>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-semibold text-xs rounded-lg transition"
                >
                  {loading ? "Adding..." : "Register Product"}
                </button>
              </div>
            </motion.form>
          )}

          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-stone-100">
              <thead className="bg-stone-50">
                <tr>
                  <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-stone-400 uppercase tracking-wider">
                    Product Name
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-center text-xs font-bold text-stone-400 uppercase tracking-wider w-36">
                    Portal Status <span className="text-emerald-600">(پورٹل)</span>
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-right text-xs font-bold text-stone-400 uppercase tracking-wider">
                    Buying Rate (Cost)
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-right text-xs font-bold text-stone-400 uppercase tracking-wider">
                    Catalog Rate (Price)
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-right text-xs font-bold text-stone-400 uppercase tracking-wider w-28">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {products.map((p) => {
                  const isEditing = editingProductId === p.id;
                  const productCost = p.costPrice ?? Math.round(p.price * 0.7 * 100) / 100;
                  return (
                    <tr key={p.id} className="hover:bg-stone-50/40 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-stone-50 rounded-lg flex items-center justify-center text-stone-500 shrink-0">
                            <ShoppingBag size={14} />
                          </div>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg outline-none text-stone-900 text-sm font-medium w-full max-w-xs focus:border-stone-400 focus:bg-white"
                            />
                          ) : (
                            <span className="text-stone-900 font-semibold text-sm">{p.name}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-1.5 bg-stone-50 p-1 rounded-xl border border-stone-200 max-w-[140px] mx-auto">
                            <input
                              type="checkbox"
                              id={`edit-hide-${p.id}`}
                              checked={!editHideInPortal}
                              onChange={(e) => setEditHideInPortal(!e.target.checked)}
                              className="w-4 h-4 text-stone-900 border-stone-300 rounded focus:ring-stone-500 accent-stone-900 cursor-pointer"
                            />
                            <label htmlFor={`edit-hide-${p.id}`} className="text-xs text-stone-700 font-bold select-none cursor-pointer">
                              Show Portal
                            </label>
                          </div>
                        ) : (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${!p.hideInPortal ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-stone-100 text-stone-500 border border-stone-200"}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${!p.hideInPortal ? "bg-emerald-500 animate-pulse" : "bg-stone-400"}`}></span>
                            {!p.hideInPortal ? "Visible (آرڈر)" : "Hidden (چھپا)"}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <input
                              type="number"
                              step="any"
                              min="0"
                              value={editCostPrice}
                              onChange={(e) => setEditCostPrice(e.target.value)}
                              className="px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg outline-none text-stone-900 text-sm font-medium w-24 text-right focus:border-stone-400 focus:bg-white"
                            />
                            <span className="text-xs text-stone-500 font-medium">SAR</span>
                          </div>
                        ) : (
                          <span className="text-stone-500 font-medium text-sm font-mono">{Math.round(productCost).toLocaleString()} SAR</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <input
                              type="number"
                              step="any"
                              min="0.1"
                              value={editPrice}
                              onChange={(e) => setEditPrice(e.target.value)}
                              className="px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg outline-none text-stone-900 text-sm font-medium w-24 text-right focus:border-stone-400 focus:bg-white"
                            />
                            <span className="text-xs text-stone-500 font-medium">SAR</span>
                          </div>
                        ) : (
                          <span className="text-stone-900 font-extrabold text-sm">{Math.round(p.price).toLocaleString()} SAR</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleSaveEdit(p.id)}
                              disabled={loading}
                              className="p-1 px-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold rounded-lg text-xs flex items-center gap-1 transition-all cursor-pointer"
                              title="Save Changes"
                            >
                              <Save size={13} />
                              <span>{loading ? "..." : "Save"}</span>
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="p-1 px-2 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-lg text-xs flex items-center gap-1 transition-all cursor-pointer"
                              title="Cancel"
                            >
                              <X size={13} />
                              <span>Cancel</span>
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEdit(p)}
                            className="p-1 px-2.5 bg-stone-50 hover:bg-stone-100 text-stone-600 border border-stone-200 rounded-xl text-xs font-bold flex items-center gap-1 inline-flex transition-all cursor-pointer"
                            title="Edit name/price"
                          >
                            <Pencil size={11} />
                            <span>Edit</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === "inventory" && (
        <div className="space-y-6">
          {/* Bento metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-stone-100 shadow-xs">
              <span className="text-stone-400 font-bold text-[10px] uppercase tracking-wider block">Products Monitored</span>
              <h4 className="text-2xl font-black text-stone-900 mt-1 font-mono">{products.length} Items</h4>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-stone-100 shadow-xs">
              <span className="text-emerald-700 font-bold text-[10px] uppercase tracking-wider block font-sans">In-Store Quantity</span>
              <h4 className="text-2xl font-black text-emerald-700 mt-1 font-mono">{Math.round(totalInStoreQuantity).toLocaleString()} Units</h4>
            </div>
            <div className="bg-[#f0f9f4] p-4 rounded-2xl border border-emerald-100 shadow-xs">
              <span className="text-emerald-900 font-bold text-[10px] uppercase tracking-wider block font-sans">Est. Stock Net Value</span>
              <h4 className="text-2xl font-black text-emerald-950 mt-1 font-mono">{Math.round(totalInventoryValue).toLocaleString()} SAR</h4>
            </div>
            <div className={`p-4 rounded-2xl border shadow-xs ${lowStockProductsCount > 0 ? "bg-amber-50 border-amber-100 text-amber-900" : "bg-white border-stone-100"}`}>
              <span className="text-amber-800 font-bold text-[10px] uppercase tracking-wider block font-sans">Low / Out alert limit</span>
              <h4 className="text-2xl font-black text-amber-800 mt-1 font-mono">{lowStockProductsCount} Products</h4>
            </div>
          </div>

          {/* Stock Adjustment Panel Overlay */}
          {adjustingProduct && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-amber-50/70 border border-amber-200 p-6 rounded-2xl shadow-sm space-y-4"
              id="stock-adjust-form-container"
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-black text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Stock Adjustment Mode
                  </span>
                  <h3 className="font-extrabold text-stone-900 text-base mt-1">
                    Adjust Stock Level for <span className="underline">{adjustingProduct.product.name}</span>
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Current calculated stock in hand: <strong className="text-stone-950">{adjustingProduct.available} units</strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAdjustingProduct(null)}
                  className="p-1 px-2 border border-stone-200 bg-white hover:bg-stone-50 text-stone-500 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1 transition-all"
                >
                  <X size={12} />
                  <span>Cancel</span>
                </button>
              </div>

              <form onSubmit={handleSaveStockAdjust} className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4 items-end bg-white p-5 rounded-xl border border-amber-100 shadow-inner">
                {/* Method selector */}
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">Adjustment Method</label>
                  <select
                    value={adjustType}
                    onChange={(e: any) => {
                      setAdjustType(e.target.value);
                      if (e.target.value === "set") {
                        setAdjustQty(adjustingProduct.available.toString());
                      } else {
                        setAdjustQty("");
                      }
                    }}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl outline-none text-stone-900 text-xs font-semibold focus:border-stone-400 focus:bg-white cursor-pointer"
                  >
                    <option value="set">💯 Overwrite (Set Exact Count)</option>
                    <option value="add">➕ Quick Add (New Supply)</option>
                    <option value="remove">➖ Subtract (Wastage / Correction)</option>
                  </select>
                </div>

                {/* Amount field */}
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">
                    {adjustType === "set" ? "New Live Count" : adjustType === "add" ? "Units to Add" : "Units to Subtract"}
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 5"
                    value={adjustQty}
                    onChange={(e) => setAdjustQty(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl outline-none text-stone-900 text-xs font-semibold font-mono focus:border-stone-400 focus:bg-white"
                  />
                </div>

                {/* Rate field */}
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">Cost Price Rate (SAR)</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="Rate per unit"
                    value={adjustCost}
                    onChange={(e) => setAdjustCost(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl outline-none text-stone-900 text-xs font-semibold font-mono focus:border-stone-400 focus:bg-white"
                  />
                </div>

                {/* Associated Vendor list */}
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">Linked Supplier Ledger</label>
                  <select
                    value={adjustVendorId}
                    onChange={(e) => setAdjustVendorId(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl outline-none text-stone-900 text-xs font-semibold focus:border-stone-400 focus:bg-white cursor-pointer"
                  >
                    <option value="system">🏢 System Correction (No Vendor Offset)</option>
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>🏭 {v.name}</option>
                    ))}
                  </select>
                </div>

                {/* Trigger */}
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={adjustLoading}
                    className="w-full px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center justify-center gap-1 min-h-[36px]"
                  >
                    <Sliders size={13} />
                    <span>{adjustLoading ? "Saving..." : "Apply Adjust"}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* Search bar inside Inventory */}
          <div className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="w-full md:max-w-md relative">
              <Search className="absolute left-3.5 top-3 text-stone-400" size={16} />
              <input
                type="text"
                placeholder="Search inventory by product name..."
                value={inventorySearch}
                onChange={(e) => setInventorySearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl outline-none text-stone-900 text-sm focus:bg-white focus:border-stone-400 transition-all font-sans"
              />
            </div>
            <div className="flex gap-2.5 w-full md:w-auto justify-end">
              <button
                onClick={onNavigateToVendors}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl border border-stone-200 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
              >
                📥 Buy From Supplier
              </button>
              <button
                onClick={onNavigateToSales}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
              >
                🏷️ Sell to Customer
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-stone-100">
              <thead className="bg-stone-50">
                <tr>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-stone-400 uppercase tracking-wider">
                    Product Name
                  </th>
                  <th scope="col" className="px-4 py-4 text-center text-xs font-bold text-stone-400 uppercase tracking-wider">
                    Buying Price (Cost)
                  </th>
                  <th scope="col" className="px-4 py-4 text-center text-xs font-bold text-stone-400 uppercase tracking-wider">
                    Add Qty (Stock-In)
                  </th>
                  <th scope="col" className="px-4 py-4 text-center text-xs font-bold text-stone-400 uppercase tracking-wider">
                    Sold Qty (Stock-Out)
                  </th>
                  <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-stone-400 uppercase tracking-wider">
                    Quantity In Hand
                  </th>
                  <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-stone-400 uppercase tracking-wider">
                    Inventory Value
                  </th>
                  <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-stone-400 uppercase tracking-wider w-24">
                    Stock Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-sm">
                {filteredInventory.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-stone-450 font-mono text-xs font-bold">
                      No products found matching "{inventorySearch}". Try creating one under the Catalog tab.
                    </td>
                  </tr>
                ) : (
                  filteredInventory.map(({ product, cost, totalIn, totalOut, available, value }) => {
                    const isOut = available <= 0;
                    const isLow = available <= 10 && available > 0;
                    return (
                      <tr key={product.id} className="hover:bg-stone-50/40 transition-colors">
                        <td className="px-6 py-4">
                          <span className="font-extrabold text-stone-900 block">{product.name}</span>
                          <span className="text-[10px] text-stone-400 font-mono font-bold uppercase tracking-wider block mt-0.5">ID: {product.id}</span>
                        </td>
                        <td className="px-4 py-4 text-center font-mono text-stone-600">
                          {Math.round(cost).toLocaleString()} SAR
                        </td>
                        <td className="px-4 py-4 text-center font-mono text-emerald-600 font-bold">
                          +{totalIn}
                        </td>
                        <td className="px-4 py-4 text-center font-mono text-rose-600 font-bold">
                          -{totalOut}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span
                             className={`px-3 py-1 rounded-xl text-xs font-mono font-bold inline-flex items-center gap-1.5 ${
                              isOut
                                ? "bg-rose-50 text-rose-700 border border-rose-100"
                                : isLow
                                ? "bg-amber-50 text-amber-700 border border-amber-100"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${isOut ? "bg-rose-500" : isLow ? "bg-amber-500" : "bg-emerald-500"}`}></span>
                            {available} {isOut ? "Out of Stock" : isLow ? "Low Stock" : "In Stock"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-black text-stone-900">
                          {Math.round(value).toLocaleString()} SAR
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleOpenStockAdjust(product, available, cost)}
                            className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                            title="Manage or edit stock in hand directly"
                          >
                            <Sliders size={11} className="text-white" />
                            <span>Adjust</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "ledger" && (
        <div className="space-y-6">
          {/* Bento metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-stone-200/60 shadow-xs">
              <span className="text-stone-400 font-extrabold text-[10px] uppercase tracking-wider block">Sales Transactions</span>
              <h4 className="text-2xl font-black text-stone-900 mt-1 font-mono">{ledgerEntries.length} Sold Records</h4>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-stone-200/60 shadow-xs">
              <span className="text-indigo-600 font-extrabold text-[10px] uppercase tracking-wider block">Total Sold Volume</span>
              <h4 className="text-2xl font-black text-indigo-700 mt-1 font-mono">{totalLedgerQty.toLocaleString()} Units</h4>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-stone-200/60 shadow-xs">
              <span className="text-emerald-700 font-extrabold text-[10px] uppercase tracking-wider block">Total Sales Value</span>
              <h4 className="text-2xl font-black text-emerald-700 mt-1 font-mono">{Math.round(totalLedgerSales).toLocaleString()} SAR</h4>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-stone-200/60 shadow-xs">
              <span className="text-amber-700 font-extrabold text-[10px] uppercase tracking-wider block">Unique Buyers Served</span>
              <h4 className="text-2xl font-black text-amber-800 mt-1 font-mono">{uniqueLedgerCustomers} Customers</h4>
            </div>
          </div>

          {/* Filtering Section */}
          <div className="bg-white p-5 rounded-2xl border border-stone-200/60 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h3 className="font-extrabold text-stone-900 text-sm flex items-center gap-2">
                  <Sliders size={16} className="text-indigo-600" />
                  <span>Ledger Filters & Report Extraction</span>
                </h3>
                <p className="text-[11px] text-stone-500 font-medium">Search customers or products, filter by specific date ranges, and export.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handlePrintLedger}
                  id="btn-print-sales-ledger"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-sm shadow-indigo-100 cursor-pointer"
                >
                  <Printer size={13} />
                  <span>🖨️ Print Sales Ledger</span>
                </button>
                {(ledgerSearch || ledgerProductIdFilter !== "all" || ledgerCustomerIdFilter !== "all" || ledgerFromDate || ledgerToDate) && (
                  <button
                    type="button"
                    onClick={() => {
                      setLedgerSearch("");
                      setLedgerProductIdFilter("all");
                      setLedgerCustomerIdFilter("all");
                      setLedgerFromDate("");
                      setLedgerToDate("");
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
              {/* Text Search */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold text-stone-500 uppercase tracking-wider">Search Name/Phone/Product</label>
                <div className="flex items-center bg-stone-50 border border-stone-200 focus-within:border-stone-400 rounded-xl px-3 py-2 transition-all">
                  <Search size={14} className="text-stone-400" />
                  <input
                    type="text"
                    placeholder="Search ledger..."
                    value={ledgerSearch}
                    onChange={(e) => setLedgerSearch(e.target.value)}
                    className="w-full pl-2 bg-transparent text-xs text-stone-900 outline-none placeholder-stone-400 font-semibold"
                  />
                </div>
              </div>

              {/* Product selector */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold text-stone-500 uppercase tracking-wider">Filter by Product</label>
                <select
                  value={ledgerProductIdFilter}
                  onChange={(e) => setLedgerProductIdFilter(e.target.value)}
                  className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-800 focus:border-stone-400 outline-none cursor-pointer"
                >
                  <option value="all">All Products (تمام اشیاء)</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Customer selector */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold text-stone-500 uppercase tracking-wider">Filter by Customer</label>
                <select
                  value={ledgerCustomerIdFilter}
                  onChange={(e) => setLedgerCustomerIdFilter(e.target.value)}
                  className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-800 focus:border-stone-400 outline-none cursor-pointer"
                >
                  <option value="all">All Customers (تمام گاہک)</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Sorting and Date Ordering */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold text-stone-500 uppercase tracking-wider">Sort Order</label>
                <button
                  type="button"
                  onClick={() => setLedgerSortNewest(!ledgerSortNewest)}
                  className="w-full px-3 py-2 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-xl text-xs font-semibold text-stone-800 flex items-center justify-between transition-all cursor-pointer"
                >
                  <span>{ledgerSortNewest ? "📅 Newest First" : "📅 Oldest First"}</span>
                  <ArrowUpDown size={12} className="text-stone-500" />
                </button>
              </div>
            </div>

            {/* Date Range Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold text-stone-500 uppercase tracking-wider flex items-center gap-1">
                  <Calendar size={11} className="text-indigo-600" />
                  <span>Sales Date: From (تاریخ سے)</span>
                </label>
                <input
                  type="date"
                  value={ledgerFromDate}
                  onChange={(e) => setLedgerFromDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-800 outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold text-stone-500 uppercase tracking-wider flex items-center gap-1">
                  <Calendar size={11} className="text-indigo-600" />
                  <span>Sales Date: To (تاریخ تک)</span>
                </label>
                <input
                  type="date"
                  value={ledgerToDate}
                  onChange={(e) => setLedgerToDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-800 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Table displaying ledger */}
          <div className="bg-white rounded-2xl border border-stone-200/60 shadow-xs overflow-hidden">
            <div className="px-6 py-4 bg-stone-50/50 border-b border-stone-100 flex items-center justify-between">
              <h3 className="font-extrabold text-stone-900 text-sm flex items-center gap-2">
                <ListOrdered size={16} className="text-indigo-600" />
                <span>Sales Log & Stock Distribution (فروخت کا ریکارڈ)</span>
              </h3>
              <span className="text-[10px] font-extrabold px-2.5 py-1 bg-stone-100 text-stone-600 rounded-full font-mono">
                Showing {ledgerEntries.length} entries
              </span>
            </div>

            <table className="min-w-full divide-y divide-stone-100">
              <thead className="bg-stone-50">
                <tr>
                  <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-stone-400 uppercase tracking-wider">
                    Customer Details (کسٹمر)
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-stone-400 uppercase tracking-wider">
                    Product Item (چیز)
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-stone-400 uppercase tracking-wider">
                    Sale Date
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-right text-xs font-bold text-stone-400 uppercase tracking-wider">
                    Selling Rate
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-center text-xs font-bold text-stone-400 uppercase tracking-wider">
                    Quantity Sold
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-right text-xs font-bold text-stone-400 uppercase tracking-wider">
                    Total Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-sm">
                {ledgerEntries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-stone-400 font-mono text-xs font-semibold">
                      No stock distribution / sales transactions found matching selected filters.
                    </td>
                  </tr>
                ) : (
                  ledgerEntries.map((entry) => {
                    const formattedDate = entry.date 
                      ? new Date(entry.date).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric"
                        }) 
                      : "-";
                    return (
                      <tr key={entry.id} className="hover:bg-stone-50/40 transition-colors">
                        <td className="px-6 py-4.5 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 bg-indigo-50 text-indigo-700 rounded-full flex items-center justify-center font-bold text-xs shrink-0">
                              <User size={13} />
                            </div>
                            <div>
                              <span className="font-extrabold text-stone-900 block">{entry.customerName}</span>
                              {entry.customerPhone && (
                                <span className="text-[10px] text-stone-400 font-mono block font-bold">{entry.customerPhone}</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4.5 whitespace-nowrap">
                          <span className="text-stone-800 font-semibold">{entry.realProductName}</span>
                          <span className="text-[10px] text-stone-400 block font-mono">ID: {entry.product_id}</span>
                        </td>
                        <td className="px-6 py-4.5 whitespace-nowrap text-stone-600 text-xs font-semibold">
                          {formattedDate}
                        </td>
                        <td className="px-6 py-4.5 whitespace-nowrap text-right font-mono text-stone-500 font-semibold text-xs">
                          {Math.round(entry.unitPrice).toLocaleString()} SAR
                        </td>
                        <td className="px-6 py-4.5 whitespace-nowrap text-center">
                          <span className="inline-flex items-center gap-1 font-black text-stone-900 text-sm bg-stone-100 px-2.5 py-0.5 rounded-lg">
                            {entry.quantity}
                          </span>
                        </td>
                        <td className="px-6 py-4.5 whitespace-nowrap text-right font-mono font-black text-emerald-700 text-sm">
                          {Math.round(entry.total_amount).toLocaleString()} SAR
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
