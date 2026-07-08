import React, { useState } from "react";
import { Order } from "../types";
import { 
  Clock, CheckCircle, XCircle, ShoppingBag, Calendar, 
  Phone, ClipboardList, Check, X, Tag, Trash2, ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface OrdersListProps {
  orders: Order[];
  onExecuteOrder: (id: string) => Promise<boolean>;
  onCancelOrder: (id: string) => Promise<boolean>;
  onRefreshOrders: () => void;
}

export default function OrdersList({ 
  orders, 
  onExecuteOrder, 
  onCancelOrder,
  onRefreshOrders 
}: OrdersListProps) {
  const [activeTab, setActiveTab] = useState<"pending" | "executed" | "cancelled">("pending");
  const [loadingOrderId, setLoadingOrderId] = useState<string | null>(null);

  // Filters
  const pendingOrders = orders.filter(o => o.status === "pending");
  const executedOrders = orders.filter(o => o.status === "executed");
  const cancelledOrders = orders.filter(o => o.status === "cancelled");

  const handleAction = async (id: string, action: "execute" | "cancel") => {
    setLoadingOrderId(id);
    try {
      const res = action === "execute" 
        ? await onExecuteOrder(id) 
        : await onCancelOrder(id);

      if (res) {
        onRefreshOrders();
      } else {
        alert(`Failed to ${action} order.`);
      }
    } catch (err: any) {
      alert(`Error processing order: ${err.message || err}`);
    } finally {
      setLoadingOrderId(null);
    }
  };

  const currentTabOrders = activeTab === "pending" 
    ? pendingOrders 
    : activeTab === "executed" 
      ? executedOrders 
      : cancelledOrders;

  return (
    <div className="space-y-6">
      
      {/* Visual Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-stone-900 tracking-tight flex items-center gap-2">
            <ShoppingBag size={22} className="text-emerald-600" />
            <span>Order Bookings Inbox (آرڈر بکنگز)</span>
          </h2>
          <p className="text-stone-500 text-xs mt-1">
            Review self-service portal bookings placed by customers. Approve/Execute to automatically debit their ledger balances.
          </p>
        </div>

        {/* Tab switchers with counts */}
        <div className="flex bg-stone-100 p-1.5 rounded-xl border border-stone-200/40">
          <button
            onClick={() => setActiveTab("pending")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === "pending" ? "bg-stone-900 text-white shadow-xs" : "text-stone-500 hover:text-stone-900"}`}
          >
            <Clock size={13} />
            <span>Pending ({pendingOrders.length})</span>
            {pendingOrders.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("executed")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === "executed" ? "bg-stone-900 text-white shadow-xs" : "text-stone-500 hover:text-stone-900"}`}
          >
            <CheckCircle size={13} />
            <span>Executed ({executedOrders.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("cancelled")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === "cancelled" ? "bg-stone-900 text-white shadow-xs" : "text-stone-500 hover:text-stone-900"}`}
          >
            <XCircle size={13} />
            <span>Cancelled ({cancelledOrders.length})</span>
          </button>
        </div>
      </div>

      {/* Orders Grid/List */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ duration: 0.12 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-5"
        >
          {currentTabOrders.length === 0 ? (
            <div className="col-span-full bg-white border border-stone-150 py-16 px-6 rounded-2xl text-center text-stone-400">
              <ClipboardList size={40} className="mx-auto text-stone-300 mb-3" />
              <p className="font-extrabold text-sm text-stone-600">No {activeTab} orders found.</p>
              <p className="text-xs text-stone-400 mt-1">
                {activeTab === "pending" 
                  ? "When customers submit order requests from their portal, they will instantly appear here with notification badges." 
                  : `No orders in the ${activeTab} log.`}
              </p>
            </div>
          ) : (
            currentTabOrders.map((order) => {
              const dateObj = new Date(order.date);
              const isPending = order.status === "pending";
              const whatsAppLink = order.customer_phone 
                ? `https://wa.me/${order.customer_phone.replace(/[^\d]/g, "")}` 
                : null;

              return (
                <div 
                  key={order.id} 
                  className="bg-white rounded-2xl border border-stone-200 shadow-xs hover:shadow-md hover:border-stone-300 transition-all flex flex-col justify-between overflow-hidden"
                >
                  {/* Card Header */}
                  <div className="p-5 border-b border-stone-100 flex justify-between items-start bg-stone-50/40">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-extrabold text-stone-950 text-base">{order.customer_name}</h4>
                        <span className="text-[10px] text-stone-400 bg-stone-150 px-1.5 py-0.2 rounded font-mono font-bold">
                          Code: {order.customer_id}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2.5 mt-2 flex-wrap">
                        <span className="text-[10px] text-stone-400 font-semibold font-mono flex items-center gap-1">
                          <Calendar size={11} />
                          {dateObj.toLocaleString()}
                        </span>
                        {whatsAppLink && (
                          <a 
                            href={whatsAppLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[10px] text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1 transition"
                          >
                            <Phone size={10} />
                            <span>Chat on WhatsApp</span>
                          </a>
                        )}
                      </div>
                    </div>

                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      order.status === "pending" 
                        ? "bg-amber-50 text-amber-700 border border-amber-100" 
                        : order.status === "executed" 
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                          : "bg-stone-100 text-stone-500 border border-stone-200"
                    }`}>
                      {order.status === "pending" ? "Pending Approval" : order.status === "executed" ? "Ledger updated" : "Cancelled"}
                    </span>
                  </div>

                  {/* Order Items */}
                  <div className="p-5 flex-1 space-y-4">
                    <div className="space-y-2">
                      <span className="text-[10px] font-extrabold text-stone-400 uppercase tracking-widest block">Ordered Items</span>
                      <div className="bg-stone-50/70 rounded-xl p-3 border border-stone-100/60 divide-y divide-stone-100 font-medium">
                        {order.items.map((item, i) => (
                          <div key={i} className="py-2 flex justify-between text-xs text-stone-800 first:pt-0 last:pb-0">
                            <span>{item.quantity} × {item.product_name}</span>
                            <span className="font-mono text-stone-500">{Math.round(item.total_amount).toLocaleString()} SAR</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {order.notes && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-extrabold text-stone-400 uppercase tracking-widest block">Customer Instructions</span>
                        <p className="text-xs text-stone-500 italic bg-amber-50/30 border border-amber-100/30 p-2.5 rounded-lg">
                          "{order.notes}"
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Card Footer */}
                  <div className="p-5 pt-0 bg-stone-50/20 border-t border-stone-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-stone-400 font-bold block uppercase tracking-wide">Grand Total</span>
                      <span className="text-lg font-black text-emerald-700 font-mono">{Math.round(order.total_amount).toLocaleString()} SAR</span>
                    </div>

                    {isPending ? (
                      <div className="flex gap-2.5">
                        <button
                          onClick={() => handleAction(order.id, "cancel")}
                          disabled={loadingOrderId !== null}
                          className="px-3.5 py-2 bg-stone-100 hover:bg-rose-50 hover:text-rose-700 text-stone-700 border border-stone-200 hover:border-rose-200 rounded-xl text-xs font-extrabold flex items-center gap-1 transition cursor-pointer"
                        >
                          <X size={13} />
                          <span>Cancel Booking</span>
                        </button>
                        <button
                          onClick={() => handleAction(order.id, "execute")}
                          disabled={loadingOrderId !== null}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-stone-300 text-white rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5 transition cursor-pointer uppercase tracking-wider"
                        >
                          {loadingOrderId === order.id ? (
                            <div className="w-3.5 h-3.5 border-2 border-white/35 border-t-white rounded-full animate-spin"></div>
                          ) : (
                            <>
                              <Check size={14} />
                              <span>Execute & Deliver</span>
                            </>
                          )}
                        </button>
                      </div>
                    ) : (
                      <div className="text-xs text-stone-400 font-semibold flex items-center gap-1">
                        <span>Done</span>
                        <ArrowRight size={12} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
