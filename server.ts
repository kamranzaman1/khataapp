import express from "express";
import path from "path";
import fs from "fs";
import AdmZip from "adm-zip";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  getDocs, 
  getDoc, 
  doc, 
  addDoc,
  updateDoc, 
  setDoc,
  deleteDoc,
  query, 
  where, 
  runTransaction 
} from "firebase/firestore/lite";

// Support ES modules __dirname and __filename
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read Firebase Config
let firebaseConfig: any = {};
const possiblePaths = [
  path.resolve(process.cwd(), "firebase-applet-config.json"),
  path.resolve(__dirname, "firebase-applet-config.json"),
  path.resolve(__dirname, "../firebase-applet-config.json"),
  path.resolve("/app/applet", "firebase-applet-config.json"),
  "./firebase-applet-config.json",
  "../firebase-applet-config.json"
];

let configLoaded = false;
for (const p of possiblePaths) {
  try {
    if (fs.existsSync(p)) {
      firebaseConfig = JSON.parse(fs.readFileSync(p, "utf-8"));
      console.log(`Successfully loaded Firebase config from: ${p}`);
      configLoaded = true;
      break;
    }
  } catch (err) {
    // try next
  }
}

if (!configLoaded) {
  console.warn("CRITICAL WARNING: firebase-applet-config.json was not found in any standard path!");
}

// Fallback to environment variables if projectId is not defined
const finalProjectId = firebaseConfig.projectId || process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT || process.env.GCLOUD_PROJECT || "";

// Initialize Firebase client with only standard options
const firebaseOptions = {
  apiKey: firebaseConfig.apiKey || process.env.FIREBASE_API_KEY || "",
  authDomain: firebaseConfig.authDomain || (finalProjectId ? `${finalProjectId}.firebaseapp.com` : ""),
  projectId: finalProjectId,
  storageBucket: firebaseConfig.storageBucket || (finalProjectId ? `${finalProjectId}.firebasestorage.app` : ""),
  messagingSenderId: firebaseConfig.messagingSenderId || "",
  appId: firebaseConfig.appId || ""
};

const firebaseApp = initializeApp(firebaseOptions);

// Initialize DB with custom database ID if available
const db = (firebaseConfig.firestoreDatabaseId)
  ? getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId)
  : getFirestore(firebaseApp);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // 0. Download Project ZIP API
  app.get("/api/download-zip", (req, res) => {
    try {
      const zip = new AdmZip();
      const workspaceRoot = process.cwd();

      // Read workspace root files/directories
      const items = fs.readdirSync(workspaceRoot);
      for (const item of items) {
        // Exclude unnecessary or sensitive items
        if (
          item === "node_modules" ||
          item === "dist" ||
          item === ".git" ||
          item === ".npm" ||
          item === ".cache" ||
          item === ".env"
        ) {
          continue;
        }
        const itemPath = path.join(workspaceRoot, item);
        const stat = fs.statSync(itemPath);
        if (stat.isDirectory()) {
          zip.addLocalFolder(itemPath, item);
        } else {
          zip.addLocalFile(itemPath);
        }
      }

      const zipBuffer = zip.toBuffer();
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", "attachment; filename=udhar-book-project.zip");
      res.send(zipBuffer);
    } catch (err: any) {
      console.error("ZIP creation error:", err);
      res.status(500).send(`Failed to create ZIP: ${err.message}`);
    }
  });

  // Seed default products if empty
  async function seedProducts() {
    try {
      const pCol = collection(db, "products");
      const snapshot = await getDocs(pCol);
      if (snapshot.empty) {
        console.log("Seeding default products...");
        const defaultProducts = [
          { name: "Pepsi", price: 5 },
          { name: "Coca Cola", price: 6 },
          { name: "Samosa", price: 3 },
          { name: "Tea (Chai)", price: 2 },
          { name: "Water (Bottle)", price: 1.5 },
          { name: "Pepsi Glass", price: 5.5 },
          { name: "Milk Pack", price: 8 }
        ];
        for (const p of defaultProducts) {
          await addDoc(pCol, p);
        }
        console.log("Products seeded successfully.");
      }
    } catch (err) {
      console.error("Error seeding products:", err);
    }
  }
  await seedProducts();

  // 1. Customers API
  // POST /api/customers
  app.post("/api/customers", async (req, res) => {
    try {
      const { id, name, phone, openingBalance, pin } = req.body;
      if (!name) {
        return res.status(400).json({ error: "Customer name is required" });
      }
      
      const opBal = Number(openingBalance || 0);
      const customerData = {
        name,
        phone: phone || "",
        openingBalance: opBal,
        balance: opBal,
        pin: pin ? String(pin).trim() : "",
        createdAt: new Date().toISOString()
      };

      let customId = id ? id.trim() : "";
      if (!customId) {
        // Auto-generate easy memorable ID (e.g. NAME-101) instead of random Firebase ID
        const prefix = name
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]/g, "")
          .substring(0, 6)
          .toUpperCase() || "CUST";

        const cleanPhone = (phone || "").trim().replace(/[^\d]/g, "");
        const last4 = cleanPhone.length >= 4 ? cleanPhone.slice(-4) : "";

        // Try Name-Phone first
        let candidateId = "";
        if (last4) {
          const phoneCandidate = `${prefix}-${last4}`;
          const phoneSnap = await getDoc(doc(db, "customers", phoneCandidate));
          if (!phoneSnap.exists()) {
            candidateId = phoneCandidate;
          }
        }

        // Try Name-Sequential
        if (!candidateId) {
          let seq = 101;
          while (seq < 2000) {
            const seqCandidate = `${prefix}-${seq}`;
            const seqSnap = await getDoc(doc(db, "customers", seqCandidate));
            if (!seqSnap.exists()) {
              candidateId = seqCandidate;
              break;
            }
            seq++;
          }
        }

        // Fallback to random short ID if both failed
        if (!candidateId) {
          candidateId = `${prefix}-${Math.floor(100 + Math.random() * 900)}`;
        }
        customId = candidateId;
      }

      const custRef = doc(db, "customers", customId);
      const custSnap = await getDoc(custRef);
      if (custSnap.exists()) {
        return res.status(400).json({ error: "This Unique ID is already taken. Please choose another one." });
      }
      await setDoc(custRef, customerData);
      res.status(201).json({ id: customId, ...customerData });
    } catch (err: any) {
      console.error("Create customer error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // PUT /api/customers/:id
  app.put("/api/customers/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { name, phone, openingBalance, pin } = req.body;
      if (!name) {
        return res.status(400).json({ error: "Customer name is required" });
      }

      const result = await runTransaction(db, async (transaction) => {
        const custRef = doc(db, "customers", id);
        const custSnap = await transaction.get(custRef);
        if (!custSnap.exists()) {
          throw new Error("Customer not found");
        }

        const currentData = custSnap.data();
        const oldOpening = Number(currentData.openingBalance || 0);
        const newOpening = Number(openingBalance || 0);
        const openingDiff = newOpening - oldOpening;

        const currentBalance = Number(currentData.balance || 0);
        const newBalance = currentBalance + openingDiff;

        const updatedData = {
          name,
          phone: phone || "",
          openingBalance: newOpening,
          balance: newBalance,
          pin: pin ? String(pin).trim() : ""
        };

        transaction.update(custRef, updatedData);
        return { id, ...updatedData };
      });

      res.json(result);
    } catch (err: any) {
      console.error("Update customer error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE /api/customers/:id
  app.delete("/api/customers/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const custRef = doc(db, "customers", id);
      const custSnap = await getDoc(custRef);
      if (!custSnap.exists()) {
        return res.status(404).json({ error: "Customer not found" });
      }

      await deleteDoc(custRef);
      res.json({ success: true, id });
    } catch (err: any) {
      console.error("Delete customer error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/public/customer-ledger?query=xxx (Secure public ledger lookup by Customer ID or exact Phone Number)
  app.get("/api/public/customer-ledger", async (req, res) => {
    try {
      const { query: searchQuery } = req.query;
      if (!searchQuery || typeof searchQuery !== "string") {
        return res.status(400).json({ error: "Customer ID or Phone number is required" });
      }

      const cleanQuery = searchQuery.trim();
      let customerDoc: any = null;
      let customerId: string = "";

      // 1. Try retrieving directly by Document ID first
      const custDocRef = doc(db, "customers", cleanQuery);
      const custDocSnap = await getDoc(custDocRef);
      if (custDocSnap.exists()) {
        customerDoc = { id: custDocSnap.id, ...custDocSnap.data() };
        customerId = custDocSnap.id;
      } else {
        // 2. Try querying by exact Phone Number matches
        const phoneQuery = query(collection(db, "customers"), where("phone", "==", cleanQuery));
        const phoneSnap = await getDocs(phoneQuery);
        if (!phoneSnap.empty) {
          const firstDoc = phoneSnap.docs[0];
          customerDoc = { id: firstDoc.id, ...firstDoc.data() };
          customerId = firstDoc.id;
        }
      }

      if (!customerDoc) {
        return res.status(404).json({ error: "No customer account found with that ID or Phone number." });
      }

      // 3. Retrieve Transactions for this customer
      const transSnapshot = await getDocs(query(collection(db, "transactions"), where("customer_id", "==", customerId)));
      const transactionsList: any[] = [];
      transSnapshot.forEach(docSnap => {
        transactionsList.push({ id: docSnap.id, ...docSnap.data() });
      });
      transactionsList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // 4. Retrieve Payments for this customer
      const paySnapshot = await getDocs(query(collection(db, "payments"), where("customer_id", "==", customerId)));
      const paymentsList: any[] = [];
      paySnapshot.forEach(docSnap => {
        paymentsList.push({ id: docSnap.id, ...docSnap.data() });
      });
      paymentsList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // 5. Retrieve Loans for this customer if any
      const loansSnapshot = await getDocs(query(collection(db, "loan_transactions"), where("partner_id", "==", customerId)));
      const loansList: any[] = [];
      loansSnapshot.forEach(docSnap => {
        loansList.push({ id: docSnap.id, ...docSnap.data() });
      });
      loansList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      res.json({
        customer: customerDoc,
        transactions: transactionsList,
        payments: paymentsList,
        loans: loansList
      });
    } catch (err: any) {
      console.error("Public customer ledger lookup error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/public/customer-login
  app.post("/api/public/customer-login", async (req, res) => {
    try {
      const { query: searchQuery, pin } = req.body;
      if (!searchQuery) {
        return res.status(400).json({ error: "Customer ID or Phone number is required" });
      }

      const cleanQuery = searchQuery.trim();
      let customerDoc: any = null;

      // 1. Try retrieving directly by Document ID first
      const custDocRef = doc(db, "customers", cleanQuery);
      const custDocSnap = await getDoc(custDocRef);
      if (custDocSnap.exists()) {
        customerDoc = { id: custDocSnap.id, ...custDocSnap.data() };
      } else {
        // 2. Try querying by exact Phone Number matches
        const phoneQuery = query(collection(db, "customers"), where("phone", "==", cleanQuery));
        const phoneSnap = await getDocs(phoneQuery);
        if (!phoneSnap.empty) {
          const firstDoc = phoneSnap.docs[0];
          customerDoc = { id: firstDoc.id, ...firstDoc.data() };
        }
      }

      if (!customerDoc) {
        return res.status(404).json({ error: "No customer account found with that ID or Phone number." });
      }

      const dbPin = customerDoc.pin ? String(customerDoc.pin).trim() : "";
      const userPin = pin ? String(pin).trim() : "";

      if (dbPin) {
        if (dbPin !== userPin) {
          return res.status(401).json({ error: "Incorrect PIN/Password. (پاس ورڈ غلط ہے)" });
        }
        return res.json({ authenticated: true, customer: customerDoc });
      } else {
        // If customer has no PIN set, we allow entry but warn them to set one.
        return res.json({ authenticated: true, customer: customerDoc, warning: "no-pin" });
      }
    } catch (err: any) {
      console.error("Public customer login error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/public/orders
  app.post("/api/public/orders", async (req, res) => {
    try {
      const { customer_id, items, notes } = req.body;
      if (!customer_id || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "customer_id and non-empty items are required" });
      }

      // Verify customer exists
      const custRef = doc(db, "customers", customer_id);
      const custSnap = await getDoc(custRef);
      if (!custSnap.exists()) {
        return res.status(404).json({ error: "Customer not found" });
      }
      const customerData: any = custSnap.data();

      let orderTotal = 0;
      const orderItemsList = [];

      for (const item of items) {
        const { product_id, quantity } = item;
        if (!product_id || !quantity || isNaN(Number(quantity))) {
          return res.status(400).json({ error: "Valid product_id and numeric quantity are required for all items" });
        }

        const prodSnap = await getDoc(doc(db, "products", product_id));
        if (!prodSnap.exists()) {
          return res.status(404).json({ error: `Product not found: ${product_id}` });
        }

        const productData: any = prodSnap.data();
        const price = Number(productData.price);
        const qty = Number(quantity);
        const item_total = price * qty;
        orderTotal += item_total;

        orderItemsList.push({
          product_id,
          product_name: productData.name,
          quantity: qty,
          price,
          total_amount: item_total
        });
      }

      const orderData = {
        customer_id,
        customer_name: customerData.name,
        customer_phone: customerData.phone || "",
        items: orderItemsList,
        total_amount: orderTotal,
        status: "pending",
        notes: notes ? String(notes).trim() : "",
        date: new Date().toISOString()
      };

      const orderDocRef = await addDoc(collection(db, "orders"), orderData);
      res.status(201).json({ id: orderDocRef.id, ...orderData });
    } catch (err: any) {
      console.error("Create order error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/orders (Admin only)
  app.get("/api/orders", async (req, res) => {
    try {
      const snapshot = await getDocs(collection(db, "orders"));
      const list: any[] = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      res.json(list);
    } catch (err: any) {
      console.error("Get orders error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/public/customer-orders (Customer specific)
  app.get("/api/public/customer-orders", async (req, res) => {
    try {
      const { customer_id } = req.query;
      if (!customer_id || typeof customer_id !== "string") {
        return res.status(400).json({ error: "customer_id is required" });
      }

      const q = query(collection(db, "orders"), where("customer_id", "==", customer_id));
      const snapshot = await getDocs(q);
      const list: any[] = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      res.json(list);
    } catch (err: any) {
      console.error("Get customer orders error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/orders/:id/execute (Admin executes pending order)
  app.post("/api/orders/:id/execute", async (req, res) => {
    try {
      const { id } = req.params;

      const result = await runTransaction(db, async (transaction) => {
        const orderRef = doc(db, "orders", id);
        const orderSnap = await transaction.get(orderRef);
        if (!orderSnap.exists()) {
          throw new Error("Order not found");
        }

        const orderData: any = orderSnap.data();
        if (orderData.status !== "pending") {
          throw new Error(`Order has already been processed (current status: ${orderData.status})`);
        }

        const { customer_id, items, total_amount } = orderData;

        // Fetch customer balance
        const custRef = doc(db, "customers", customer_id);
        const custSnap = await transaction.get(custRef);
        if (!custSnap.exists()) {
          throw new Error("Customer not found");
        }

        const currentBalance = Number(custSnap.data()?.balance || 0);
        const newBalance = currentBalance + Number(total_amount);

        // Update customer balance in DB
        transaction.update(custRef, { balance: newBalance });

        // Create transaction entries for each item
        for (const item of items) {
          const transactionRecord = {
            customer_id,
            product_id: item.product_id,
            product_name: item.product_name,
            quantity: Number(item.quantity),
            price: Number(item.price),
            total_amount: Number(item.total_amount),
            date: new Date().toISOString(),
            notes: "Placed via self-service portal"
          };

          const transDocRef = doc(collection(db, "transactions"));
          transaction.set(transDocRef, transactionRecord);
        }

        // Update order status to executed
        transaction.update(orderRef, { status: "executed" });

        return { success: true, new_balance: newBalance };
      });

      res.json(result);
    } catch (err: any) {
      console.error("Execute order error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/orders/:id/cancel (Admin cancels pending order)
  app.post("/api/orders/:id/cancel", async (req, res) => {
    try {
      const { id } = req.params;
      const orderRef = doc(db, "orders", id);
      const orderSnap = await getDoc(orderRef);
      if (!orderSnap.exists()) {
        return res.status(404).json({ error: "Order not found" });
      }

      const orderData: any = orderSnap.data();
      if (orderData.status !== "pending") {
        return res.status(400).json({ error: "Can only cancel pending orders" });
      }

      await updateDoc(orderRef, { status: "cancelled" });
      res.json({ success: true, status: "cancelled" });
    } catch (err: any) {
      console.error("Cancel order error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/customers
  app.get("/api/customers", async (req, res) => {
    try {
      const snapshot = await getDocs(collection(db, "customers"));
      const list: any[] = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      res.json(list);
    } catch (err: any) {
      console.error("Get customers error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/customers/:id (includes transactions and payments history)
  app.get("/api/customers/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const custDocRef = doc(db, "customers", id);
      const custDocSnap = await getDoc(custDocRef);
      if (!custDocSnap.exists()) {
        return res.status(404).json({ error: "Customer not found" });
      }

      const customerData = { id, ...custDocSnap.data() };

      // Transactions
      const transSnapshot = await getDocs(query(collection(db, "transactions"), where("customer_id", "==", id)));
      const transactionsList: any[] = [];
      transSnapshot.forEach(docSnap => {
        transactionsList.push({ id: docSnap.id, ...docSnap.data() });
      });
      // Sort desc by date
      transactionsList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Payments
      const paySnapshot = await getDocs(query(collection(db, "payments"), where("customer_id", "==", id)));
      const paymentsList: any[] = [];
      paySnapshot.forEach(docSnap => {
        paymentsList.push({ id: docSnap.id, ...docSnap.data() });
      });
      // Sort desc by date
      paymentsList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Loan Transactions
      const loansSnapshot = await getDocs(query(collection(db, "loan_transactions"), where("partner_id", "==", id)));
      const loansList: any[] = [];
      loansSnapshot.forEach(docSnap => {
        loansList.push({ id: docSnap.id, ...docSnap.data() });
      });
      // Sort desc by date
      loansList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      res.json({
        customer: customerData,
        transactions: transactionsList,
        payments: paymentsList,
        loans: loansList
      });
    } catch (err: any) {
      console.error("Get customer detail error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // 2. Products API
  // GET /api/products
  app.get("/api/products", async (req, res) => {
    try {
      const snapshot = await getDocs(collection(db, "products"));
      const list: any[] = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      res.json(list);
    } catch (err: any) {
      console.error("Get products error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/products
  app.post("/api/products", async (req, res) => {
    try {
      const { name, price, costPrice, hideInPortal } = req.body;
      if (!name || isNaN(Number(price))) {
        return res.status(400).json({ error: "name and numeric price are required" });
      }
      
      const prc = Number(price);
      const cst = costPrice !== undefined && !isNaN(Number(costPrice)) 
        ? Number(costPrice) 
        : Math.round(prc * 0.7 * 100) / 100;

      const productData = {
        name,
        price: prc,
        costPrice: cst,
        hideInPortal: !!hideInPortal
      };

      const docRef = await addDoc(collection(db, "products"), productData);
      res.status(201).json({ id: docRef.id, ...productData });
    } catch (err: any) {
      console.error("Create product error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // PUT /api/products/:id
  app.put("/api/products/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { name, price, costPrice, hideInPortal } = req.body;
      if (!name || isNaN(Number(price))) {
        return res.status(400).json({ error: "name and numeric price are required" });
      }

      const prodRef = doc(db, "products", id);
      const prodSnap = await getDoc(prodRef);
      if (!prodSnap.exists()) {
        return res.status(404).json({ error: "Product not found" });
      }

      const prc = Number(price);
      const cst = costPrice !== undefined && !isNaN(Number(costPrice)) 
        ? Number(costPrice) 
        : Math.round(prc * 0.7 * 100) / 100;

      const updatedData = {
        name,
        price: prc,
        costPrice: cst,
        hideInPortal: !!hideInPortal
      };

      await updateDoc(prodRef, updatedData);
      res.json({ id, ...updatedData });
    } catch (err: any) {
      console.error("Update product error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/transactions
  app.get("/api/transactions", async (req, res) => {
    try {
      const snapshot = await getDocs(collection(db, "transactions"));
      const list: any[] = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      res.json(list);
    } catch (err: any) {
      console.error("Get transactions error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // --- SETTINGS (OPENING BALANCES) API ---

  // GET /api/settings
  app.get("/api/settings", async (req, res) => {
    try {
      const snap = await getDoc(doc(db, "settings", "opening_balances"));
      if (snap.exists()) {
        res.json(snap.data());
      } else {
        res.json({ bankOpeningBalance: 0, cashOpeningBalance: 0 });
      }
    } catch (err: any) {
      console.error("Get settings error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/settings
  app.post("/api/settings", async (req, res) => {
    try {
      const { bankOpeningBalance, cashOpeningBalance } = req.body;
      const data = {
        bankOpeningBalance: Number(bankOpeningBalance) || 0,
        cashOpeningBalance: Number(cashOpeningBalance) || 0,
        updatedAt: new Date().toISOString()
      };
      await setDoc(doc(db, "settings", "opening_balances"), data);
      res.json(data);
    } catch (err: any) {
      console.error("Post settings error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/expenses
  app.get("/api/expenses", async (req, res) => {
    try {
      const snapshot = await getDocs(collection(db, "expenses"));
      const list: any[] = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      res.json(list);
    } catch (err: any) {
      console.error("Get expenses error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/expenses
  app.post("/api/expenses", async (req, res) => {
    try {
      const { category, amount, date, description, account } = req.body;
      if (!category || isNaN(Number(amount))) {
        return res.status(400).json({ error: "category and numeric amount are required" });
      }

      const expenseData = {
        category,
        amount: Number(amount),
        account: account || "cash",
        date: date || new Date().toISOString(),
        description: description || ""
      };

      const docRef = await addDoc(collection(db, "expenses"), expenseData);
      res.status(201).json({ id: docRef.id, ...expenseData });
    } catch (err: any) {
      console.error("Create expense error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE /api/expenses/:id
  app.delete("/api/expenses/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const expRef = doc(db, "expenses", id);
      const expSnap = await getDoc(expRef);
      if (!expSnap.exists()) {
        return res.status(404).json({ error: "Expense not found" });
      }

      await deleteDoc(expRef);
      res.json({ success: true, id });
    } catch (err: any) {
      console.error("Delete expense error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // 3. Transactions (purchase) API
  // POST /api/transactions
  app.post("/api/transactions", async (req, res) => {
    try {
      const { customer_id, product_id, quantity } = req.body;
      if (!customer_id || !product_id || !quantity || isNaN(Number(quantity))) {
        return res.status(400).json({ error: "customer_id, product_id, and quantity are required" });
      }

      const qty = Number(quantity);

      // Perform a transaction to ensure atomicity
      const result = await runTransaction(db, async (transaction) => {
        // 1. Get Customer Doc
        const custRef = doc(db, "customers", customer_id);
        const custSnap = await transaction.get(custRef);
        if (!custSnap.exists()) {
          throw new Error("Customer not found");
        }

        // 2. Get Product Doc to get price
        const prodRef = doc(db, "products", product_id);
        const prodSnap = await transaction.get(prodRef);
        if (!prodSnap.exists()) {
          throw new Error("Product not found");
        }

        const productData: any = prodSnap.data();
        const price = Number(productData.price);
        const total_amount = qty * price;

        // 3. Calculate and update customer balance
        const currentBalance = Number(custSnap.data()?.balance || 0);
        const newBalance = currentBalance + total_amount;

        // 4. Update customer balance in DB
        transaction.update(custRef, { balance: newBalance });

        // 5. Create transaction record
        const transactionRecord = {
          customer_id,
          product_id,
          product_name: productData.name,
          quantity: qty,
          price: price,
          total_amount,
          date: new Date().toISOString()
        };

        const transDocRef = doc(collection(db, "transactions"));
        transaction.set(transDocRef, transactionRecord);

        return { id: transDocRef.id, ...transactionRecord, new_balance: newBalance };
      });

      res.status(201).json(result);
    } catch (err: any) {
      console.error("Create transaction error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/transactions/bulk
  app.post("/api/transactions/bulk", async (req, res) => {
    try {
      const { customer_id, items } = req.body;
      if (!customer_id || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "customer_id and non-empty items array are required" });
      }

      const result = await runTransaction(db, async (transaction) => {
        // 1. Get Customer Doc
        const custRef = doc(db, "customers", customer_id);
        const custSnap = await transaction.get(custRef);
        if (!custSnap.exists()) {
          throw new Error("Customer not found");
        }

        let total_invoice_amount = 0;
        const transactionRecords = [];

        // 2. Loop products and prepare records
        for (const item of items) {
          const { product_id, quantity } = item;
          if (!product_id || !quantity || isNaN(Number(quantity))) {
            throw new Error("Each item must have a valid product_id and numeric quantity");
          }
          const qty = Number(quantity);

          const prodRef = doc(db, "products", product_id);
          const prodSnap = await transaction.get(prodRef);
          if (!prodSnap.exists()) {
            throw new Error(`Product not found for ID: ${product_id}`);
          }

          const productData: any = prodSnap.data();
          const price = Number(productData.price);
          const total_amount = qty * price;
          total_invoice_amount += total_amount;

          transactionRecords.push({
            customer_id,
            product_id,
            product_name: productData.name,
            quantity: qty,
            price: price,
            total_amount,
            date: new Date().toISOString()
          });
        }

        // 3. Calculate and update customer balance
        const currentBalance = Number(custSnap.data()?.balance || 0);
        const newBalance = currentBalance + total_invoice_amount;

        // 4. Update customer balance in DB
        transaction.update(custRef, { balance: newBalance });

        // 5. Create transaction records in DB
        const createdRecords = [];
        for (const record of transactionRecords) {
          const transDocRef = doc(collection(db, "transactions"));
          transaction.set(transDocRef, record);
          createdRecords.push({ id: transDocRef.id, ...record });
        }

        return { success: true, count: createdRecords.length, total_amount: total_invoice_amount, new_balance: newBalance };
      });

      res.status(201).json(result);
    } catch (err: any) {
      console.error("Create bulk transactions error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // 4. Payments API
  // POST /api/payments
  app.post("/api/payments", async (req, res) => {
    try {
      const { customer_id, amount, account } = req.body;
      if (!customer_id || isNaN(Number(amount))) {
        return res.status(400).json({ error: "customer_id and numeric amount are required" });
      }

      const payAmt = Number(amount);
      const payAcc = account || "cash";

      // Perform a transaction to ensure atomicity
      const result = await runTransaction(db, async (transaction) => {
        // 1. Get Customer Doc
        const custRef = doc(db, "customers", customer_id);
        const custSnap = await transaction.get(custRef);
        if (!custSnap.exists()) {
          throw new Error("Customer not found");
        }

        // 2. Calculate and update customer balance
        const currentBalance = Number(custSnap.data()?.balance || 0);
        const newBalance = currentBalance - payAmt;

        // 3. Update customer balance in DB
        transaction.update(custRef, { balance: newBalance });

        // 4. Create payment record
        const paymentRecord = {
          customer_id,
          amount: payAmt,
          account: payAcc,
          date: new Date().toISOString()
        };

        const payDocRef = doc(collection(db, "payments"));
        transaction.set(payDocRef, paymentRecord);

        return { id: payDocRef.id, ...paymentRecord, new_balance: newBalance };
      });

      res.status(201).json(result);
    } catch (err: any) {
      console.error("Create payment error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/payments
  app.get("/api/payments", async (req, res) => {
    try {
      const snapshot = await getDocs(collection(db, "payments"));
      const list: any[] = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      res.json(list);
    } catch (err: any) {
      console.error("Get payments error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // PUT /api/payments/:id
  app.put("/api/payments/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { amount, account } = req.body;
      if (isNaN(Number(amount))) {
        return res.status(400).json({ error: "Numeric amount is required" });
      }

      const newAmt = Number(amount);
      const newAcc = account || "cash";

      const result = await runTransaction(db, async (transaction) => {
        // 1. Get Payment Doc
        const payRef = doc(db, "payments", id);
        const paySnap = await transaction.get(payRef);
        if (!paySnap.exists()) {
          throw new Error("Payment not found");
        }

        const paymentData: any = paySnap.data();
        const oldAmt = Number(paymentData.amount || 0);
        const customer_id = paymentData.customer_id;

        // 2. Get Customer Doc
        const custRef = doc(db, "customers", customer_id);
        const custSnap = await transaction.get(custRef);
        if (!custSnap.exists()) {
          throw new Error("Customer not found for this payment");
        }

        const currentBalance = Number(custSnap.data()?.balance || 0);
        const newBalance = currentBalance + oldAmt - newAmt;

        // 3. Update customer balance in DB
        transaction.update(custRef, { balance: newBalance });

        // 4. Update payment record
        const updatedPayment = {
          ...paymentData,
          amount: newAmt,
          account: newAcc,
          lastEditedAt: new Date().toISOString()
        };
        transaction.update(payRef, updatedPayment);

        return { id, ...updatedPayment, new_balance: newBalance };
      });

      res.json(result);
    } catch (err: any) {
      console.error("Update payment error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE /api/payments/:id
  app.delete("/api/payments/:id", async (req, res) => {
    try {
      const { id } = req.params;

      const result = await runTransaction(db, async (transaction) => {
        // 1. Get Payment Doc
        const payRef = doc(db, "payments", id);
        const paySnap = await transaction.get(payRef);
        if (!paySnap.exists()) {
          throw new Error("Payment not found");
        }

        const paymentData: any = paySnap.data();
        const amt = Number(paymentData.amount || 0);
        const customer_id = paymentData.customer_id;

        // 2. Get Customer Doc
        const custRef = doc(db, "customers", customer_id);
        const custSnap = await transaction.get(custRef);
        if (!custSnap.exists()) {
          throw new Error("Customer not found for this payment");
        }

        const currentBalance = Number(custSnap.data()?.balance || 0);
        const newBalance = currentBalance + amt;

        // 3. Update customer balance in DB
        transaction.update(custRef, { balance: newBalance });

        // 4. Delete payment record
        transaction.delete(payRef);

        return { success: true, id, new_balance: newBalance };
      });

      res.json(result);
    } catch (err: any) {
      console.error("Delete payment error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // --- VENDORS API ---
  // POST /api/vendors
  app.post("/api/vendors", async (req, res) => {
    try {
      const { name, phone, openingBalance } = req.body;
      if (!name) {
        return res.status(400).json({ error: "Vendor name is required" });
      }
      
      const opBal = Number(openingBalance || 0);
      const vendorData = {
        name,
        phone: phone || "",
        openingBalance: opBal,
        balance: opBal,
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, "vendors"), vendorData);
      res.status(201).json({ id: docRef.id, ...vendorData });
    } catch (err: any) {
      console.error("Create vendor error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // PUT /api/vendors/:id
  app.put("/api/vendors/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { name, phone, openingBalance } = req.body;
      if (!name) {
        return res.status(400).json({ error: "Vendor name is required" });
      }

      const result = await runTransaction(db, async (transaction) => {
        const vendRef = doc(db, "vendors", id);
        const vendSnap = await transaction.get(vendRef);
        if (!vendSnap.exists()) {
          throw new Error("Vendor not found");
        }

        const currentData = vendSnap.data();
        const oldOpening = Number(currentData.openingBalance || 0);
        const newOpening = Number(openingBalance || 0);
        const openingDiff = newOpening - oldOpening;

        const currentBalance = Number(currentData.balance || 0);
        const newBalance = currentBalance + openingDiff;

        const updatedData = {
          name,
          phone: phone || "",
          openingBalance: newOpening,
          balance: newBalance
        };

        transaction.update(vendRef, updatedData);
        return { id, ...updatedData };
      });

      res.json(result);
    } catch (err: any) {
      console.error("Update vendor error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE /api/vendors/:id
  app.delete("/api/vendors/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const vendRef = doc(db, "vendors", id);
      const vendSnap = await getDoc(vendRef);
      if (!vendSnap.exists()) {
        return res.status(404).json({ error: "Vendor not found" });
      }

      await deleteDoc(vendRef);
      res.json({ success: true, id });
    } catch (err: any) {
      console.error("Delete vendor error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/vendors
  app.get("/api/vendors", async (req, res) => {
    try {
      const snapshot = await getDocs(collection(db, "vendors"));
      const list: any[] = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      res.json(list);
    } catch (err: any) {
      console.error("Get vendors error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/vendor-purchases (retrieves all purchases across vendors to calculate inventory)
  app.get("/api/vendor-purchases", async (req, res) => {
    try {
      const snapshot = await getDocs(collection(db, "vendor_purchases"));
      const list: any[] = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      res.json(list);
    } catch (err: any) {
      console.error("Get all vendor purchases error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/vendors/:id (retrieves vendor purchases and payment history)
  app.get("/api/vendors/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const vendRef = doc(db, "vendors", id);
      const vendSnap = await getDoc(vendRef);
      if (!vendSnap.exists()) {
        return res.status(404).json({ error: "Vendor not found" });
      }

      const vendorData = { id, ...vendSnap.data() };

      // Vendor Purchases
      const vpSnapshot = await getDocs(query(collection(db, "vendor_purchases"), where("vendor_id", "==", id)));
      const purchasesList: any[] = [];
      vpSnapshot.forEach(docSnap => {
        purchasesList.push({ id: docSnap.id, ...docSnap.data() });
      });
      purchasesList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Vendor Payments
      const vpaySnapshot = await getDocs(query(collection(db, "vendor_payments"), where("vendor_id", "==", id)));
      const paymentsList: any[] = [];
      vpaySnapshot.forEach(docSnap => {
        paymentsList.push({ id: docSnap.id, ...docSnap.data() });
      });
      paymentsList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      res.json({
        vendor: vendorData,
        purchases: purchasesList,
        payments: paymentsList
      });
    } catch (err: any) {
      console.error("Get vendor details error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/vendor-purchases
  app.post("/api/vendor-purchases", async (req, res) => {
    try {
      const { vendor_id, product_id, quantity, cost_price, is_return } = req.body;
      if (!vendor_id || !product_id || !quantity || isNaN(Number(quantity)) || isNaN(Number(cost_price))) {
        return res.status(400).json({ error: "vendor_id, product_id, quantity, and cost_price are required" });
      }

      const isReturn = !!is_return;
      const qty = isReturn ? -Math.abs(Number(quantity)) : Number(quantity);
      const cost = Number(cost_price);
      const total_amount = qty * cost;

      const result = await runTransaction(db, async (transaction) => {
        // 1. Get Vendor Doc
        const vendRef = doc(db, "vendors", vendor_id);
        const vendSnap = await transaction.get(vendRef);
        if (!vendSnap.exists()) {
          throw new Error("Vendor not found");
        }

        // 2. Get Product Doc to update costPrice dynamically
        const prodRef = doc(db, "products", product_id);
        const prodSnap = await transaction.get(prodRef);
        if (!prodSnap.exists()) {
          throw new Error("Product not found");
        }

        const productData: any = prodSnap.data();

        // 3. Calculate and update vendor balance (what we owe them increases or, for return, decreases)
        const currentBalance = Number(vendSnap.data()?.balance || 0);
        const newBalance = currentBalance + total_amount;

        // 4. Update vendor balance
        transaction.update(vendRef, { balance: newBalance });

        // 5. Update Product's costPrice to our last purchase price (buying rate) - only if it is not a return
        if (!isReturn) {
          transaction.update(prodRef, { costPrice: cost });
        }

        // 6. Create vendor purchase record
        const purchaseRecord = {
          vendor_id,
          product_id,
          product_name: productData.name,
          quantity: qty,
          cost_price: cost,
          total_amount,
          is_return: isReturn,
          date: new Date().toISOString()
        };

        const vDocRef = doc(collection(db, "vendor_purchases"));
        transaction.set(vDocRef, purchaseRecord);

        return { id: vDocRef.id, ...purchaseRecord, new_balance: newBalance };
      });

      res.status(201).json(result);
    } catch (err: any) {
      console.error("Create vendor purchase error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // PUT /api/vendor-purchases/:id (edit supply purchase/restock)
  app.put("/api/vendor-purchases/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { quantity, cost_price } = req.body;

      if (!quantity || isNaN(Number(quantity)) || isNaN(Number(cost_price))) {
        return res.status(400).json({ error: "quantity and cost_price are required" });
      }

      const result = await runTransaction(db, async (transaction) => {
        const purchaseRef = doc(db, "vendor_purchases", id);
        const purchaseSnap = await transaction.get(purchaseRef);
        if (!purchaseSnap.exists()) {
          throw new Error("Vendor purchase record not found");
        }

        const purchaseData = purchaseSnap.data();
        const old_total = Number(purchaseData.total_amount || 0);
        const isReturn = !!purchaseData.is_return || Number(purchaseData.quantity || 0) < 0;
        const vendor_id = purchaseData.vendor_id;
        const product_id = purchaseData.product_id;

        const qty = isReturn ? -Math.abs(Number(quantity)) : Number(quantity);
        const cost = Number(cost_price);
        const new_total = qty * cost;

        const vendRef = doc(db, "vendors", vendor_id);
        const vendSnap = await transaction.get(vendRef);
        if (!vendSnap.exists()) {
          throw new Error("Vendor not found");
        }

        const prodRef = doc(db, "products", product_id);

        const currentBalance = Number(vendSnap.data()?.balance || 0);
        const adjustedBalance = currentBalance - old_total + new_total;

        transaction.update(vendRef, { balance: adjustedBalance });
        if (!isReturn) {
          transaction.update(prodRef, { costPrice: cost });
        }
        transaction.update(purchaseRef, {
          quantity: qty,
          cost_price: cost,
          total_amount: new_total
        });

        return { id, quantity: qty, cost_price: cost, total_amount: new_total, new_balance: adjustedBalance };
      });

      res.json(result);
    } catch (err: any) {
      console.error("Update vendor purchase error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/vendor-payments
  app.post("/api/vendor-payments", async (req, res) => {
    try {
      const { vendor_id, amount, account } = req.body;
      if (!vendor_id || isNaN(Number(amount))) {
        return res.status(400).json({ error: "vendor_id and numeric amount are required" });
      }

      const payAmt = Number(amount);
      const payAcc = account || "cash";

      const result = await runTransaction(db, async (transaction) => {
        // 1. Get Vendor Doc
        const vendRef = doc(db, "vendors", vendor_id);
        const vendSnap = await transaction.get(vendRef);
        if (!vendSnap.exists()) {
          throw new Error("Vendor not found");
        }

        // 2. Calculate and update vendor balance (what we owe them decreases)
        const currentBalance = Number(vendSnap.data()?.balance || 0);
        const newBalance = currentBalance - payAmt;

        // 3. Update Vendor Balance
        transaction.update(vendRef, { balance: newBalance });

        // 5. Create Vendor Payment record
        const paymentRecord = {
          vendor_id,
          amount: payAmt,
          account: payAcc,
          date: new Date().toISOString()
        };

        const vpayDocRef = doc(collection(db, "vendor_payments"));
        transaction.set(vpayDocRef, paymentRecord);

        return { id: vpayDocRef.id, ...paymentRecord, new_balance: newBalance };
      });

      res.status(201).json(result);
    } catch (err: any) {
      console.error("Create vendor payment error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // PUT /api/vendor-payments/:id
  app.put("/api/vendor-payments/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { amount, account } = req.body;

      if (!amount || isNaN(Number(amount))) {
        return res.status(400).json({ error: "amount is required and must be numeric" });
      }

      const newAmt = Number(amount);
      const newAcc = account || "cash";

      const result = await runTransaction(db, async (transaction) => {
        const paymentRef = doc(db, "vendor_payments", id);
        const paymentSnap = await transaction.get(paymentRef);
        if (!paymentSnap.exists()) {
          throw new Error("Vendor payment record not found");
        }

        const paymentData = paymentSnap.data();
        const oldAmt = Number(paymentData.amount || 0);
        const vendor_id = paymentData.vendor_id;

        const vendRef = doc(db, "vendors", vendor_id);
        const vendSnap = await transaction.get(vendRef);
        if (!vendSnap.exists()) {
          throw new Error("Vendor not found");
        }

        const currentBalance = Number(vendSnap.data()?.balance || 0);
        // We revert the old paid amount (+oldAmt) and subtract the new paid amount (-newAmt)
        const adjustedBalance = currentBalance + oldAmt - newAmt;

        transaction.update(vendRef, { balance: adjustedBalance });
        transaction.update(paymentRef, {
          amount: newAmt,
          account: newAcc
        });

        return { id, amount: newAmt, account: newAcc, new_balance: adjustedBalance };
      });

      res.json(result);
    } catch (err: any) {
      console.error("Update vendor payment error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/vendor-payments
  app.get("/api/vendor-payments", async (req, res) => {
    try {
      const snapshot = await getDocs(collection(db, "vendor_payments"));
      const list: any[] = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      res.json(list);
    } catch (err: any) {
      console.error("Get vendor payments error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // --- LOANS API ---

  // GET /api/loans/partners
  app.get("/api/loans/partners", async (req, res) => {
    try {
      const snapshot = await getDocs(collection(db, "customers"));
      const list: any[] = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      list.sort((a, b) => b.name.localeCompare(a.name));
      res.json(list);
    } catch (err: any) {
      console.error("Get loan partners error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/loans/partners/:id
  app.get("/api/loans/partners/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const ref = doc(db, "customers", id);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.json({ id: snap.id, ...snap.data() });
    } catch (err: any) {
      console.error("Get loan partner detail error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/loans/partners
  app.post("/api/loans/partners", async (req, res) => {
    try {
      const { name, phone, openingBalance } = req.body;
      if (!name) {
        return res.status(400).json({ error: "Customer name is required" });
      }

      const opBal = Number(openingBalance) || 0;
      const customerData = {
        name: name.trim(),
        phone: phone ? phone.trim() : "",
        openingBalance: opBal,
        balance: opBal,
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, "customers"), customerData);
      res.status(201).json({ id: docRef.id, ...customerData });
    } catch (err: any) {
      console.error("Create loan partner error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // PUT /api/loans/partners/:id
  app.put("/api/loans/partners/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { name, phone } = req.body;
      if (!name) {
        return res.status(400).json({ error: "partner name is required" });
      }

      const ref = doc(db, "customers", id);
      await updateDoc(ref, {
        name: name.trim(),
        phone: phone ? phone.trim() : ""
      });

      res.json({ id, name, phone });
    } catch (err: any) {
      console.error("Update loan partner error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE /api/loans/partners/:id
  app.delete("/api/loans/partners/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await deleteDoc(doc(db, "customers", id));
      res.json({ success: true, message: "Customer deleted successfully" });
    } catch (err: any) {
      console.error("Delete loan partner error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/loans/transactions
  app.get("/api/loans/transactions", async (req, res) => {
    try {
      const snapshot = await getDocs(collection(db, "loan_transactions"));
      const list: any[] = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      res.json(list);
    } catch (err: any) {
      console.error("Get loan transactions error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/loans/transactions
  app.post("/api/loans/transactions", async (req, res) => {
    try {
      const { partner_id, type, amount, account, date, description } = req.body;
      if (!partner_id || !type || isNaN(Number(amount)) || !account) {
        return res.status(400).json({ error: "partner_id, type, numeric amount, and account are required" });
      }

      const txAmt = Number(amount);

      const result = await runTransaction(db, async (transaction) => {
        // 1. Fetch Loan Partner (from customers collection)
        const partnerRef = doc(db, "customers", partner_id);
        const partnerSnap = await transaction.get(partnerRef);
        if (!partnerSnap.exists()) {
          throw new Error("Customer not found");
        }

        const partnerData = partnerSnap.data();
        const currentBalance = Number(partnerData?.balance || 0);
        let newBalance = currentBalance;

        // Balance logic: positive = we gave loan (they owe us), negative = we took loan (we owe them)
        // type: "given" | "taken" | "repayment_sent" | "repayment_received"
        if (type === "given") {
          newBalance += txAmt;
        } else if (type === "repayment_received") {
          newBalance -= txAmt;
        } else if (type === "taken") {
          newBalance -= txAmt;
        } else if (type === "repayment_sent") {
          newBalance += txAmt;
        } else {
          throw new Error("Invalid transaction type");
        }

        // 2. Update customer balance
        transaction.update(partnerRef, { balance: newBalance });

        // 3. Create Loan Transaction record
        const txRecord = {
          partner_id,
          partner_name: partnerData?.name || "Unknown",
          type,
          amount: txAmt,
          account,
          date: date || new Date().toISOString(),
          description: description || ""
        };

        const txDocRef = doc(collection(db, "loan_transactions"));
        transaction.set(txDocRef, txRecord);

        return { id: txDocRef.id, ...txRecord, new_balance: newBalance };
      });

      res.status(201).json(result);
    } catch (err: any) {
      console.error("Create loan transaction error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE /api/loans/transactions/:id
  app.delete("/api/loans/transactions/:id", async (req, res) => {
    try {
      const { id } = req.params;

      const result = await runTransaction(db, async (transaction) => {
        const txRef = doc(db, "loan_transactions", id);
        const txSnap = await transaction.get(txRef);
        if (!txSnap.exists()) {
          throw new Error("Transaction not found");
        }

        const txData = txSnap.data();
        const { partner_id, type, amount } = txData;
        const txAmt = Number(amount);

        const partnerRef = doc(db, "customers", partner_id);
        const partnerSnap = await transaction.get(partnerRef);
        if (partnerSnap.exists()) {
          const currentBalance = Number(partnerSnap.data()?.balance || 0);
          let restoredBalance = currentBalance;

          if (type === "given") {
            restoredBalance -= txAmt;
          } else if (type === "repayment_received") {
            restoredBalance += txAmt;
          } else if (type === "taken") {
            restoredBalance += txAmt;
          } else if (type === "repayment_sent") {
            restoredBalance -= txAmt;
          }

          transaction.update(partnerRef, { balance: restoredBalance });
        }

        transaction.delete(txRef);
        return { success: true };
      });

      res.json(result);
    } catch (err: any) {
      console.error("Delete loan transaction error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Vite Integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
