export interface Customer {
  id: string;
  name: string;
  phone: string;
  balance: number;
  openingBalance?: number;
  pin?: string; // PIN password for customer portal login
  createdAt?: string;
}

export interface OrderItem {
  product_id: string;
  product_name: string;
  quantity: number;
  price: number;
  total_amount: number;
}

export interface Order {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_phone?: string;
  items: OrderItem[];
  total_amount: number;
  status: "pending" | "executed" | "cancelled";
  notes?: string;
  date: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  costPrice?: number;
  hideInPortal?: boolean;
}

export interface Expense {
  id: string;
  category: string;
  amount: number;
  date: string;
  description: string;
  account?: "cash" | "bank";
}

export interface Transaction {
  id: string;
  customer_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  price: number;
  total_amount: number;
  date: string;
}

export interface Payment {
  id: string;
  customer_id: string;
  amount: number;
  date: string;
  account?: "cash" | "bank";
}

export interface CustomerDetailData {
  customer: Customer;
  transactions: Transaction[];
  payments: Payment[];
  loans?: LoanTransaction[];
}

export interface Vendor {
  id: string;
  name: string;
  phone: string;
  balance: number; // Positive is what we owe them
  openingBalance?: number;
  createdAt?: string;
}

export interface VendorPurchase {
  id: string;
  vendor_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  cost_price: number;
  total_amount: number;
  date: string;
}

export interface VendorPayment {
  id: string;
  vendor_id: string;
  amount: number;
  date: string;
  account?: "cash" | "bank";
}

export interface VendorDetailData {
  vendor: Vendor;
  purchases: VendorPurchase[];
  payments: VendorPayment[];
}

export interface LoanPartner {
  id: string;
  name: string;
  phone: string;
  balance: number; // positive = we gave loan (they owe us), negative = we took loan (we owe them)
  createdAt?: string;
}

export interface LoanTransaction {
  id: string;
  partner_id: string;
  partner_name: string;
  type: "given" | "taken" | "repayment_sent" | "repayment_received";
  amount: number;
  account: "cash" | "bank";
  date: string;
  description: string;
}
