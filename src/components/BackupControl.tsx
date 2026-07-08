import React from "react";
import { Customer, Product, Vendor } from "../types";
import { 
  X, Download, FileSpreadsheet, Database, Users, Building2, Package, ShoppingCart, Calendar 
} from "lucide-react";
import { motion } from "motion/react";

interface BackupControlProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  products: Product[];
  vendors: Vendor[];
  allTransactions: any[];
  allVendorPurchases: any[];
  allPayments?: any[];
}

export default function BackupControl({
  isOpen,
  onClose,
  customers = [],
  products = [],
  vendors = [],
  allTransactions = [],
  allVendorPurchases = [],
  allPayments = [],
}: BackupControlProps) {
  if (!isOpen) return null;

  const num = (v: any) => (typeof v === "number" ? v : Number(v) || 0);

  const escapeXml = (str: any) => {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  };

  const getCustomerLedgerStats = (customerId: string, balance: number) => {
    const custTx = allTransactions
      .filter(t => t.customer_id === customerId)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const custPay = allPayments
      .filter(p => p.customer_id === customerId)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const oldestPurchaseDate = custTx[0]?.date ? new Date(custTx[0].date).toLocaleDateString() : "No Purchase";
    const lastPurchaseDate = custTx[custTx.length - 1]?.date ? new Date(custTx[custTx.length - 1].date).toLocaleDateString() : "No Purchase";
    const lastPaymentDate = custPay[custPay.length - 1]?.date ? new Date(custPay[custPay.length - 1].date).toLocaleDateString() : "No Payment";

    let daysPending = 0;
    if (balance > 0 && custTx[0]?.date) {
      daysPending = Math.floor((new Date().getTime() - new Date(custTx[0].date).getTime()) / (1000 * 60 * 60 * 24));
    }

    return {
      oldestPurchaseDate,
      lastPurchaseDate,
      lastPaymentDate,
      daysPending: daysPending > 0 ? `${daysPending} Days` : "0 Days",
      daysPendingNum: daysPending
    };
  };

  const triggerDownload = (content: string, filename: string, contentType: string) => {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 1. Download Master Multi-Sheet XML Excel Workbook
  const downloadMultiSheetExcel = () => {
    const creationDate = new Date().toISOString();

    // XML header for SpreadsheetML
    let xml = `<?xml version="1.0" encoding="utf-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
  <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
    <Author>Udhar Khata Book</Author>
    <LastAuthor>Udhar Khata Book</LastAuthor>
    <Created>${creationDate}</Created>
    <Version>16.00</Version>
  </DocumentProperties>
  <Styles>
    <Style ss:ID="Default" ss:Name="Normal">
      <Alignment ss:Vertical="Bottom"/>
      <Borders/>
      <Font ss:FontName="Calibri" x:CharSet="1" x:Family="Swiss" ss:Size="11" ss:Color="#000000"/>
      <Interior/>
      <NumberFormat/>
      <Protection/>
    </Style>
    <Style ss:ID="Header">
      <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF" />
      <Interior ss:Color="#1C1917" ss:Pattern="Solid" />
      <Alignment ss:Horizontal="Center" ss:Vertical="Center" />
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#444444"/>
      </Borders>
    </Style>
    <Style ss:ID="Title">
      <Font ss:FontName="Calibri" ss:Size="14" ss:Bold="1" ss:Color="#0C0A09" />
    </Style>
    <Style ss:ID="Summary">
      <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#000000" />
      <Interior ss:Color="#F5F5F4" ss:Pattern="Solid" />
      <Borders>
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D6D3D1"/>
      </Borders>
    </Style>
  </Styles>
  `;

    // SHEET 1: Customers Outstanding Summary
    xml += `
  <Worksheet ss:Name="Customers Outstanding">
    <Table>
      <Column ss:Width="180"/>
      <Column ss:Width="120"/>
      <Column ss:Width="130"/>
      <Column ss:Width="130"/>
      <Column ss:Width="130"/>
      <Column ss:Width="110"/>
      <Column ss:Width="130"/>
      <Column ss:Width="130"/>
      <Row ss:Height="26">
        <Cell><Data ss:Type="String">Customers Credit Ledger (Outstanding Khata)</Data></Cell>
      </Row>
      <Row ss:Height="22" ss:StyleID="Header">
        <Cell><Data ss:Type="String">Customer Name</Data></Cell>
        <Cell><Data ss:Type="String">Phone Number</Data></Cell>
        <Cell><Data ss:Type="String">Outstanding Balance (SAR)</Data></Cell>
        <Cell><Data ss:Type="String">Opening Balance (SAR)</Data></Cell>
        <Cell><Data ss:Type="String">Oldest Udhar Date</Data></Cell>
        <Cell><Data ss:Type="String">Days Pending</Data></Cell>
        <Cell><Data ss:Type="String">Last Purchase Date</Data></Cell>
        <Cell><Data ss:Type="String">Last Payment Date</Data></Cell>
      </Row>`;
    
    let totalBalances = 0;
    customers.forEach(c => {
      totalBalances += num(c.balance);
      const stats = getCustomerLedgerStats(c.id, num(c.balance));
      xml += `
      <Row ss:Height="20">
        <Cell><Data ss:Type="String">${escapeXml(c.name)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXml(c.phone)}</Data></Cell>
        <Cell><Data ss:Type="Number">${num(c.balance)}</Data></Cell>
        <Cell><Data ss:Type="Number">${num(c.openingBalance)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXml(stats.oldestPurchaseDate)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXml(stats.daysPending)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXml(stats.lastPurchaseDate)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXml(stats.lastPaymentDate)}</Data></Cell>
      </Row>`;
    });

    xml += `
      <Row ss:Height="22" ss:StyleID="Summary">
        <Cell><Data ss:Type="String">Total Outstanding Credit</Data></Cell>
        <Cell><Data ss:Type="String"></Data></Cell>
        <Cell><Data ss:Type="Number">${totalBalances}</Data></Cell>
        <Cell><Data ss:Type="String"></Data></Cell>
        <Cell><Data ss:Type="String"></Data></Cell>
        <Cell><Data ss:Type="String"></Data></Cell>
        <Cell><Data ss:Type="String"></Data></Cell>
        <Cell><Data ss:Type="String"></Data></Cell>
      </Row>
    </Table>
  </Worksheet>`;

    // SHEET 2: Sales transactions logs
    xml += `
  <Worksheet ss:Name="Sales Transactions Journal">
    <Table>
      <Column ss:Width="150"/>
      <Column ss:Width="160"/>
      <Column ss:Width="180"/>
      <Column ss:Width="100"/>
      <Column ss:Width="100"/>
      <Column ss:Width="130"/>
      <Row ss:Height="26">
        <Cell><Data ss:Type="String">Customer Sales Transactions Log (Credit Book)</Data></Cell>
      </Row>
      <Row ss:Height="22" ss:StyleID="Header">
        <Cell><Data ss:Type="String">Date &amp; Time</Data></Cell>
        <Cell><Data ss:Type="String">Customer Name</Data></Cell>
        <Cell><Data ss:Type="String">Product Name</Data></Cell>
        <Cell><Data ss:Type="String">Quantity</Data></Cell>
        <Cell><Data ss:Type="String">Price Rate (SAR)</Data></Cell>
        <Cell><Data ss:Type="String">Total Amount (SAR)</Data></Cell>
      </Row>`;

    let totalSalesAmt = 0;
    let totalSalesQty = 0;
    allTransactions.forEach(t => {
      const c = customers.find(cust => cust.id === t.customer_id);
      const cName = c ? c.name : "Walking Customer/Direct";
      totalSalesAmt += num(t.total_amount);
      totalSalesQty += num(t.quantity);
      
      const formattedDate = t.date 
        ? new Date(t.date).toLocaleDateString("en-US") + " " + new Date(t.date).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
        : "N/A";

      xml += `
      <Row ss:Height="20">
        <Cell><Data ss:Type="String">${escapeXml(formattedDate)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXml(cName)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXml(t.product_name)}</Data></Cell>
        <Cell><Data ss:Type="Number">${num(t.quantity)}</Data></Cell>
        <Cell><Data ss:Type="Number">${num(t.price)}</Data></Cell>
        <Cell><Data ss:Type="Number">${num(t.total_amount)}</Data></Cell>
      </Row>`;
    });

    xml += `
      <Row ss:Height="22" ss:StyleID="Summary">
        <Cell><Data ss:Type="String">Total Sum</Data></Cell>
        <Cell><Data ss:Type="String"></Data></Cell>
        <Cell><Data ss:Type="String"></Data></Cell>
        <Cell><Data ss:Type="Number">${totalSalesQty}</Data></Cell>
        <Cell><Data ss:Type="String"></Data></Cell>
        <Cell><Data ss:Type="Number">${totalSalesAmt}</Data></Cell>
      </Row>
    </Table>
  </Worksheet>`;

    // SHEET 3: Vendors & Supplier Ledgers
    xml += `
  <Worksheet ss:Name="Suppliers Payables">
    <Table>
      <Column ss:Width="180"/>
      <Column ss:Width="120"/>
      <Column ss:Width="130"/>
      <Column ss:Width="130"/>
      <Row ss:Height="26">
        <Cell><Data ss:Type="String">Supplier &amp; Vendor Outstanding Ledger</Data></Cell>
      </Row>
      <Row ss:Height="22" ss:StyleID="Header">
        <Cell><Data ss:Type="String">Vendor/Supplier Name</Data></Cell>
        <Cell><Data ss:Type="String">Phone Number</Data></Cell>
        <Cell><Data ss:Type="String">Payable Balance (SAR)</Data></Cell>
        <Cell><Data ss:Type="String">Opening Balance (SAR)</Data></Cell>
      </Row>`;

    let totalPayables = 0;
    vendors.forEach(v => {
      totalPayables += num(v.balance);
      xml += `
      <Row ss:Height="20">
        <Cell><Data ss:Type="String">${escapeXml(v.name)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXml(v.phone)}</Data></Cell>
        <Cell><Data ss:Type="Number">${num(v.balance)}</Data></Cell>
        <Cell><Data ss:Type="Number">${num(v.openingBalance)}</Data></Cell>
      </Row>`;
    });

    xml += `
      <Row ss:Height="22" ss:StyleID="Summary">
        <Cell><Data ss:Type="String">Total Supplier Payables</Data></Cell>
        <Cell><Data ss:Type="String"></Data></Cell>
        <Cell><Data ss:Type="Number">${totalPayables}</Data></Cell>
        <Cell><Data ss:Type="String"></Data></Cell>
      </Row>
    </Table>
  </Worksheet>`;

    // SHEET 4: Products Stock Catalog
    xml += `
  <Worksheet ss:Name="Store Products Inventory">
    <Table>
      <Column ss:Width="250"/>
      <Column ss:Width="150"/>
      <Column ss:Width="150"/>
      <Row ss:Height="26">
        <Cell><Data ss:Type="String">Registered Store Catalog &amp; Retail Pricing</Data></Cell>
      </Row>
      <Row ss:Height="22" ss:StyleID="Header">
        <Cell><Data ss:Type="String">Product Name</Data></Cell>
        <Cell><Data ss:Type="String">Selling Price Rate (SAR)</Data></Cell>
        <Cell><Data ss:Type="String">Buying Cost Rate (SAR)</Data></Cell>
      </Row>`;

    products.forEach(p => {
      xml += `
      <Row ss:Height="20">
        <Cell><Data ss:Type="String">${escapeXml(p.name)}</Data></Cell>
        <Cell><Data ss:Type="Number">${num(p.price)}</Data></Cell>
        <Cell><Data ss:Type="Number">${num(p.costPrice)}</Data></Cell>
      </Row>`;
    });

    xml += `
    </Table>
  </Worksheet>`;

    // SHEET 5: Recent Supplies Stock Purchases
    xml += `
  <Worksheet ss:Name="Restock Supplies History">
    <Table>
      <Column ss:Width="150"/>
      <Column ss:Width="160"/>
      <Column ss:Width="180"/>
      <Column ss:Width="100"/>
      <Column ss:Width="110"/>
      <Column ss:Width="130"/>
      <Row ss:Height="26">
        <Cell><Data ss:Type="String">Vendor Restock Supplies &amp; Bill Purchases History</Data></Cell>
      </Row>
      <Row ss:Height="22" ss:StyleID="Header">
        <Cell><Data ss:Type="String">Date Recorded</Data></Cell>
        <Cell><Data ss:Type="String">Vendor/Supplier</Data></Cell>
        <Cell><Data ss:Type="String">Material Item/Product</Data></Cell>
        <Cell><Data ss:Type="String">Quantity</Data></Cell>
        <Cell><Data ss:Type="String">Cost Price Rate (SAR)</Data></Cell>
        <Cell><Data ss:Type="String">Total Bill (SAR)</Data></Cell>
      </Row>`;

    let totalRestockAmt = 0;
    let totalRestockQty = 0;
    allVendorPurchases.forEach(vp => {
      const ven = vendors.find(vend => vend.id === vp.vendor_id);
      const venName = ven ? ven.name : "System / Correction";
      totalRestockAmt += num(vp.total_amount);
      totalRestockQty += num(vp.quantity);
      
      const formattedDate = vp.date 
        ? new Date(vp.date).toLocaleDateString("en-US") + " " + new Date(vp.date).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
        : "N/A";

      xml += `
      <Row ss:Height="20">
        <Cell><Data ss:Type="String">${escapeXml(formattedDate)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXml(venName)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXml(vp.product_name)}</Data></Cell>
        <Cell><Data ss:Type="Number">${num(vp.quantity)}</Data></Cell>
        <Cell><Data ss:Type="Number">${num(vp.cost_price)}</Data></Cell>
        <Cell><Data ss:Type="Number">${num(vp.total_amount)}</Data></Cell>
      </Row>`;
    });

    xml += `
      <Row ss:Height="22" ss:StyleID="Summary">
        <Cell><Data ss:Type="String">Total Sum</Data></Cell>
        <Cell><Data ss:Type="String"></Data></Cell>
        <Cell><Data ss:Type="String"></Data></Cell>
        <Cell><Data ss:Type="Number">${totalRestockQty}</Data></Cell>
        <Cell><Data ss:Type="String"></Data></Cell>
        <Cell><Data ss:Type="Number">${totalRestockAmt}</Data></Cell>
      </Row>
    </Table>
  </Worksheet>
</Workbook>`;

    const dStr = new Date().toISOString().split("T")[0];
    triggerDownload(xml, `Khata_Book_Master_Backup_${dStr}.xls`, "application/vnd.ms-excel;charset=utf-8");
  };

  // CSV Single Download triggers with UTF-8 support
  const downloadCustomersCsv = () => {
    const headers = [
      "Customer ID", 
      "Customer Name", 
      "Phone", 
      "Outstanding Balance (SAR)", 
      "Opening Balance (SAR)",
      "Oldest Udhar Date",
      "Days Pending",
      "Last Purchase Date",
      "Last Payment Date"
    ];
    const rows = customers.map(c => {
      const stats = getCustomerLedgerStats(c.id, num(c.balance));
      return [
        c.id || "",
        c.name,
        c.phone,
        String(c.balance || 0),
        String(c.openingBalance || 0),
        stats.oldestPurchaseDate,
        stats.daysPending,
        stats.lastPurchaseDate,
        stats.lastPaymentDate
      ];
    });
    const fileDate = new Date().toISOString().split("T")[0];
    triggerCsvDownload(headers, rows, `Customers_Contact_Balances_${fileDate}.csv`);
  };

  const downloadSalesCsv = () => {
    const headers = ["Transaction Date", "Customer Name", "Phone", "Product Sold", "Quantity", "Price Rate (SAR)", "Total Debit (SAR)"];
    const rows = allTransactions.map(t => {
      const c = customers.find(cust => cust.id === t.customer_id);
      return [
        t.date ? new Date(t.date).toLocaleString() : "No Date",
        c ? c.name : "Walking Customer",
        c ? c.phone : "",
        t.product_name || "",
        String(t.quantity || 0),
        String(t.price || 0),
        String(t.total_amount || 0)
      ];
    });
    const fileDate = new Date().toISOString().split("T")[0];
    triggerCsvDownload(headers, rows, `Credit_Sales_Journal_${fileDate}.csv`);
  };

  const downloadVendorsCsv = () => {
    const headers = ["Vendor ID", "Vendor/Supplier Name", "Phone Support", "Outstanding Payable (SAR)", "Opening Debts (SAR)"];
    const rows = vendors.map(v => [
      v.id || "",
      v.name,
      v.phone || "",
      String(v.balance || 0),
      String(v.openingBalance || 0)
    ]);
    const fileDate = new Date().toISOString().split("T")[0];
    triggerCsvDownload(headers, rows, `Vendors_Supplier_Balances_${fileDate}.csv`);
  };

  const downloadSuppliesCsv = () => {
    const headers = ["Restock Date", "Vendor Name", "Material Item Name", "Quantity Units", "Cost Price Rate (SAR)", "Total Paid/Owed Bill (SAR)"];
    const rows = allVendorPurchases.map(vp => {
      const ven = vendors.find(v => v.id === vp.vendor_id);
      return [
        vp.date ? new Date(vp.date).toLocaleString() : "No Date",
        ven ? ven.name : "System Correction",
        vp.product_name || "Listed Item",
        String(vp.quantity || 0),
        String(vp.cost_price || 0),
        String(vp.total_amount || 0)
      ];
    });
    const fileDate = new Date().toISOString().split("T")[0];
    triggerCsvDownload(headers, rows, `Supply_Inventory_Purchases_${fileDate}.csv`);
  };

  const triggerCsvDownload = (headers: string[], rows: string[][], filename: string) => {
    const csvContent = [
      headers.map(h => `"${h.replace(/"/g, '""')}"`).join(","),
      ...rows.map(row => row.map(cell => `"${(cell || "").replace(/"/g, '""')}"`).join(","))
    ].join("\r\n");

    const bom = "\uFEFF"; // Prepend Byte Order Mark for Excel Unicode formatting
    triggerDownload(bom + csvContent, filename, "text/csv;charset=utf-8;");
  };

  return (
    <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-3xl shadow-2xl border border-stone-200 w-full max-w-2xl overflow-hidden"
        id="excel-backup-dialog"
      >
        {/* Banner/Header */}
        <div className="bg-stone-950 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-6 right-6 text-stone-400 hover:text-white transition cursor-pointer p-1.5 hover:bg-stone-850 rounded-xl"
            title="Close Dialog"
            id="btn-close-backup-config"
          >
            <X size={18} />
          </button>
          
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-emerald-500 text-stone-950 rounded-2xl flex items-center justify-center">
              <FileSpreadsheet size={22} className="stroke-[2.5px]" />
            </span>
            <div>
              <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
                Excel Ledger Backup Tool
              </h1>
              <p className="text-stone-400 text-xs mt-0.5">Export all account statements, sales, suppliers, and stock levels to offline files.</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Main Excel Multi-Sheet Export Trigger */}
          <div className="bg-emerald-50/50 rounded-2xl border border-emerald-100 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-extrabold uppercase tracking-widest">
                Recommended Choice
              </span>
              <h3 className="font-extrabold text-stone-900 text-base mt-2">Combined Multi-Tab Excel Spreadsheet</h3>
              <p className="text-xs text-stone-600">
                Downloads a single high-quality <strong>Workbook (.xls)</strong> containing 5 styled tabs: Customers list, Credit Sales, Suppliers ledger, Material orders, and store inventory.
              </p>
            </div>
            
            <button
              onClick={downloadMultiSheetExcel}
              id="btn-download-master-excel"
              className="px-5 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition shadow-lg shadow-emerald-600/15 cursor-pointer whitespace-nowrap"
            >
              <Download size={14} className="stroke-[2.5]" />
              <span>Full Excel Backup</span>
            </button>
          </div>

          {/* Full ZIP Codebase Backup */}
          <div className="bg-stone-50 rounded-2xl border border-stone-200 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <span className="text-[10px] bg-stone-200 text-stone-800 px-2 py-0.5 rounded-full font-extrabold uppercase tracking-widest">
                Source Code Download
              </span>
              <h3 className="font-extrabold text-stone-900 text-base mt-2">Download Entire App as ZIP</h3>
              <p className="text-xs text-stone-600">
                Exports the complete project source code including React components, Express server, configuration, styles, and instructions to run locally.
              </p>
            </div>
            
            <a
              href="/api/download-zip"
              download="udhar-book-project.zip"
              id="btn-download-project-zip"
              className="px-5 py-3.5 bg-stone-950 hover:bg-stone-850 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition shadow-lg shadow-stone-950/15 cursor-pointer whitespace-nowrap flex items-center justify-center"
            >
              <Download size={14} className="stroke-[2.5]" />
              <span>Download ZIP</span>
            </a>
          </div>

          {/* Section Divider */}
          <div className="flex items-center gap-3">
            <div className="h-[1px] bg-stone-200 flex-1"></div>
            <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest bg-stone-50 px-2 py-0.5 rounded border border-stone-100">
              Download Individual CSV Tables
            </span>
            <div className="h-[1px] bg-stone-200 flex-1"></div>
          </div>

          {/* Grid of Individual CSV Files */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Customers list */}
            <div className="border border-stone-150 p-4 rounded-2xl bg-stone-50/40 hover:bg-stone-50 transition flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 bg-stone-100 text-stone-600 rounded-xl flex items-center justify-center">
                  <Users size={16} />
                </span>
                <div>
                  <h4 className="font-extrabold text-stone-900 text-xs">Customers Ledger</h4>
                  <p className="text-[10px] text-stone-450 mt-0.5">{customers.length} Accounts &bull; Balances</p>
                </div>
              </div>
              <button
                onClick={downloadCustomersCsv}
                className="p-2 text-stone-500 hover:text-emerald-600 bg-white hover:bg-emerald-50 rounded-xl transition border border-stone-200 cursor-pointer"
                title="Download Customers CSV Table"
              >
                <Download size={13} />
              </button>
            </div>

            {/* Sales ledger */}
            <div className="border border-stone-150 p-4 rounded-2xl bg-stone-50/40 hover:bg-stone-50 transition flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 bg-stone-100 text-stone-600 rounded-xl flex items-center justify-center">
                  <ShoppingCart size={16} />
                </span>
                <div>
                  <h4 className="font-extrabold text-stone-900 text-xs">Credit Sales Journal</h4>
                  <p className="text-[10px] text-stone-450 mt-0.5">{allTransactions.length} Sales ledger logs</p>
                </div>
              </div>
              <button
                onClick={downloadSalesCsv}
                className="p-2 text-stone-500 hover:text-emerald-600 bg-white hover:bg-emerald-50 rounded-xl transition border border-stone-200 cursor-pointer"
                title="Download Sales Credit CSV Table"
              >
                <Download size={13} />
              </button>
            </div>

            {/* Vendors ledger */}
            <div className="border border-stone-150 p-4 rounded-2xl bg-stone-50/40 hover:bg-stone-50 transition flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 bg-stone-100 text-stone-600 rounded-xl flex items-center justify-center">
                  <Building2 size={16} />
                </span>
                <div>
                  <h4 className="font-extrabold text-stone-900 text-xs">Suppliers Payables</h4>
                  <p className="text-[10px] text-stone-450 mt-0.5">{vendors.length} Vendor Profiles</p>
                </div>
              </div>
              <button
                onClick={downloadVendorsCsv}
                className="p-2 text-stone-500 hover:text-emerald-600 bg-white hover:bg-emerald-50 rounded-xl transition border border-stone-200 cursor-pointer"
                title="Download Vendors CSV Table"
              >
                <Download size={13} />
              </button>
            </div>

            {/* Restock purchases list */}
            <div className="border border-stone-150 p-4 rounded-2xl bg-stone-50/40 hover:bg-stone-50 transition flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 bg-stone-100 text-stone-600 rounded-xl flex items-center justify-center">
                  <Package size={16} />
                </span>
                <div>
                  <h4 className="font-extrabold text-stone-900 text-xs">Restocks Purchase Log</h4>
                  <p className="text-[10px] text-stone-450 mt-0.5">{allVendorPurchases.length} Purchase receipts</p>
                </div>
              </div>
              <button
                onClick={downloadSuppliesCsv}
                className="p-2 text-stone-500 hover:text-emerald-600 bg-white hover:bg-emerald-50 rounded-xl transition border border-stone-200 cursor-pointer"
                title="Download Supplies Restocks CSV Table"
              >
                <Download size={13} />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-stone-50 px-6 py-4.5 border-t border-stone-150 flex flex-col sm:flex-row justify-between items-center gap-2">
          <span className="text-[11px] text-stone-450 font-bold flex items-center gap-1.5">
            <Database size={11} className="text-emerald-500" /> Auto-encoded with Unicode UTF-8 UTF bom (Safe for Excel characters)
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-750 font-bold text-xs rounded-xl cursor-pointer transition"
          >
            Done
          </button>
        </div>
      </motion.div>
    </div>
  );
}
