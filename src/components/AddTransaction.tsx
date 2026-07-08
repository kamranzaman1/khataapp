import React, { useState } from "react";
import { Customer, Product } from "../types";
import { ShoppingBag, ArrowRight, UserPlus, HelpCircle, Check, AlertTriangle, Plus, Trash2, ShoppingCart } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface AddTransactionProps {
  customers: Customer[];
  products: Product[];
  onAddTransaction: (customer_id: string, product_id: string, quantity: number) => Promise<boolean>;
  onAddBulkTransactions: (customer_id: string, items: { product_id: string, quantity: number }[]) => Promise<boolean>;
  onSuccess: () => void;
}

interface CartItem {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  total: number;
}

export default function AddTransaction({
  customers,
  products,
  onAddTransaction,
  onAddBulkTransactions,
  onSuccess
}: AddTransactionProps) {
  const [customerId, setCustomerId] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const selectedProduct = products.find(p => p.id === productId);
  const currentPrice = selectedProduct ? selectedProduct.price : 0;
  const autoTotal = currentPrice * quantity;
  const grandTotal = cart.reduce((sum, item) => sum + item.total, 0);

  const handleAddToCart = () => {
    setErrorMsg("");
    if (!productId) {
      setErrorMsg("Please select a product first.");
      return;
    }
    if (quantity <= 0) {
      setErrorMsg("Quantity must be at least 1.");
      return;
    }

    const prod = products.find(p => p.id === productId);
    if (!prod) return;

    const existingIndex = cart.findIndex(item => item.product_id === productId);
    if (existingIndex > -1) {
      const updated = [...cart];
      updated[existingIndex].quantity += quantity;
      updated[existingIndex].total = updated[existingIndex].quantity * updated[existingIndex].price;
      setCart(updated);
    } else {
      setCart([
        ...cart,
        {
          product_id: productId,
          name: prod.name,
          price: prod.price,
          quantity: quantity,
          total: quantity * prod.price
        }
      ]);
    }

    // Clear product selection fields but keep customer
    setProductId("");
    setQuantity(1);
  };

  const handleRemoveFromCart = (index: number) => {
    const updated = [...cart];
    updated.splice(index, 1);
    setCart(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!customerId) {
      setErrorMsg("Please select a customer.");
      return;
    }

    let finalItems: { product_id: string, quantity: number }[] = [];

    if (cart.length > 0) {
      finalItems = cart.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity
      }));
    } else {
      // Single product selection fallback (so single product flow is still instant without manual adding to cart)
      if (!productId) {
        setErrorMsg("Please add at least one item to the list or select a product.");
        return;
      }
      if (quantity <= 0) {
        setErrorMsg("Quantity must be at least 1.");
        return;
      }
      finalItems = [{ product_id: productId, quantity }];
    }

    setLoading(true);
    try {
      const ok = await onAddBulkTransactions(customerId, finalItems);
      if (ok) {
        setSuccessMsg(`Purchase of ${finalItems.length} item(s) recorded successfully! Customer balance updated.`);
        setCustomerId("");
        setProductId("");
        setQuantity(1);
        setCart([]);
        setTimeout(() => {
          setSuccessMsg("");
          onSuccess(); // Redirect to dashboard
        }, 2000);
      } else {
        setErrorMsg("Failed to add transactions. Please try again.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-stone-900 tracking-tight">New purchase entry</h1>
        <p className="text-stone-500 text-sm mt-1">Record items bought on credit (udhar). Select multiple products at a time to build a customer invoice.</p>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 text-emerald-800 text-xs px-4 py-3 rounded-xl border border-emerald-100 flex items-center gap-2 font-semibold">
          <Check size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-50 text-rose-800 text-xs px-4 py-3 rounded-xl border border-rose-100 flex items-center gap-2 font-semibold">
          <AlertTriangle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Input Selection Form */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-stone-100 shadow-sm space-y-6 h-fit">
          <h2 className="font-extrabold text-stone-900 text-sm uppercase tracking-wider border-b border-stone-100 pb-2">Select Items</h2>

          {/* Customer Dropdown */}
          <div>
            <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-2">
              Select Customer <span className="text-rose-500">*</span>
            </label>
            {customers.length === 0 ? (
              <div className="p-3 bg-amber-50 text-amber-800 rounded-xl border border-amber-100 text-xs">
                No customers registered yet. Please add a customer first.
              </div>
            ) : (
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                required
                className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 focus:border-stone-400 rounded-xl outline-none text-stone-900 text-xs font-medium transition-colors"
              >
                <option value="">-- Choose Customer --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name || "Unnamed Customer"} (Current: {Math.round(c.balance ?? 0).toLocaleString()} SAR)
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Product Dropdown */}
          <div>
            <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-2">
              Select Product
            </label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 focus:border-stone-400 rounded-xl outline-none text-stone-900 text-xs font-medium transition-colors"
            >
              <option value="">-- Choose Product --</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} - {p.price} SAR
                </option>
              ))}
            </select>
          </div>

          {/* Quantity Input */}
          <div>
            <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-2">
              Quantity
            </label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 focus:border-stone-400 rounded-xl outline-none text-stone-900 text-xs font-medium transition-colors"
            />
          </div>

          {/* Add to List Button */}
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={!productId}
            className="w-full py-2.5 bg-indigo-50 hover:bg-indigo-100 disabled:bg-stone-50 disabled:text-stone-400 text-indigo-700 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-indigo-200/50 disabled:border-stone-200/30"
          >
            <Plus size={14} className="stroke-[2.5]" />
            <span>Add Item to Purchase List</span>
          </button>

          {/* Individual item calculation box */}
          {selectedProduct && (
            <div className="p-3 bg-indigo-50/30 border border-indigo-100/50 rounded-xl flex justify-between items-center text-xs">
              <div>
                <p className="text-stone-500 font-medium">Active Item Rate</p>
                <p className="font-mono text-stone-600 mt-0.5">{quantity} × {currentPrice} SAR</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-stone-400 font-bold block mb-0.5">Item Total</span>
                <span className="font-black text-indigo-700 font-mono text-sm">
                  {Math.round(autoTotal).toLocaleString()} SAR
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Active Cart / Bill Summary */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-stone-100 shadow-sm flex flex-col justify-between min-h-[350px]">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-2">
              <h2 className="font-extrabold text-stone-900 text-sm uppercase tracking-wider flex items-center gap-1.5">
                <ShoppingCart size={15} className="text-stone-500" />
                <span>Purchase Items List</span>
              </h2>
              <span className="text-[10px] bg-stone-100 text-stone-700 px-2 py-0.5 rounded-full font-bold">
                {cart.length} unique items
              </span>
            </div>

            {cart.length === 0 ? (
              <div className="py-12 text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 bg-stone-50 text-stone-400 rounded-full flex items-center justify-center mb-3">
                  <ShoppingCart size={20} />
                </div>
                <p className="text-stone-500 font-medium text-xs">No items added to the cart list yet.</p>
                <p className="text-stone-400 text-[10px] mt-1 max-w-[250px]">
                  Use the left form to select products and add them, or simply select a product and click Submit directly for a quick single-item entry.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[280px] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-stone-100 text-stone-400 font-bold uppercase text-[10px] tracking-wider">
                      <th className="pb-2">Product</th>
                      <th className="pb-2 text-center">Qty</th>
                      <th className="pb-2 text-right">Price</th>
                      <th className="pb-2 text-right">Total</th>
                      <th className="pb-2 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-50">
                    <AnimatePresence>
                      {cart.map((item, idx) => (
                        <motion.tr
                          key={item.product_id}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          className="text-stone-800 font-medium"
                        >
                          <td className="py-2.5 max-w-[150px] truncate">{item.name}</td>
                          <td className="py-2.5 text-center font-mono">{item.quantity}</td>
                          <td className="py-2.5 text-right font-mono">{item.price} SAR</td>
                          <td className="py-2.5 text-right font-mono text-rose-600 font-bold">{item.total} SAR</td>
                          <td className="py-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveFromCart(idx)}
                              className="p-1 hover:bg-rose-50 text-stone-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="pt-6 border-t border-stone-100 mt-4 space-y-4">
            {/* Grand Total Box */}
            <div className="p-4 bg-stone-50 rounded-xl flex justify-between items-center">
              <div>
                <p className="text-stone-400 text-[10px] font-bold uppercase tracking-wider">Invoice Grand Total</p>
                <p className="text-stone-500 text-[10px] mt-0.5">
                  {cart.length > 0 ? "Sum of all active item cards" : "No items listed yet"}
                </p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-rose-600 font-mono">
                  {Math.round(cart.length > 0 ? grandTotal : autoTotal).toLocaleString()} SAR
                </span>
              </div>
            </div>

            {/* Submission triggers */}
            <form onSubmit={handleSubmit} className="flex justify-end">
              <button
                type="submit"
                disabled={loading || !customerId || (cart.length === 0 && !productId)}
                className="w-full sm:w-auto px-6 py-3 bg-stone-900 hover:bg-stone-850 disabled:bg-stone-200 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-stone-900/10 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShoppingBag size={15} />
                <span>
                  {loading 
                    ? "Recording purchases..." 
                    : cart.length > 0 
                      ? `Record Purchase of ${cart.length} Items` 
                      : "Record Quick Single Purchase"
                  }
                </span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
