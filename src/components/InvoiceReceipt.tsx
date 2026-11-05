"use client";

import React from "react";
import { Printer, Download, CheckCircle2, Phone, Calendar, Receipt, Utensils, X } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Order, Restaurant, TableSession } from "@/types";

interface InvoiceReceiptProps {
  restaurant: Restaurant | null;
  tableNumber: string;
  session?: TableSession | null;
  orders: Order[];
  customerPhone?: string | null;
  paymentMethod?: string | null;
  paymentStatus?: string | null;
  onClose?: () => void;
}

export function InvoiceReceipt({
  restaurant,
  tableNumber,
  session,
  orders,
  customerPhone,
  paymentMethod = "Cash",
  paymentStatus = "Paid",
  onClose,
}: InvoiceReceiptProps) {
  // Aggregate all items across all orders in this session
  const allItems: {
    id: string;
    name: string;
    quantity: number;
    price: number;
    total: number;
    notes?: string;
  }[] = [];

  orders.forEach((ord) => {
    ord.items.forEach((item) => {
      const existing = allItems.find((i) => i.name === item.nameSnapshot && i.price === item.priceSnapshot);
      if (existing) {
        existing.quantity += item.quantity;
        existing.total += item.lineTotal;
      } else {
        allItems.push({
          id: item.id,
          name: item.nameSnapshot,
          quantity: item.quantity,
          price: item.priceSnapshot,
          total: item.lineTotal,
          notes: item.specialInstructions,
        });
      }
    });
  });

  const subtotal = allItems.reduce((sum, i) => sum + i.total, 0);
  const taxRate = restaurant?.taxRate || 0.05;
  const totalTax = Math.round(subtotal * taxRate);
  const cgst = Math.round(totalTax / 2);
  const sgst = totalTax - cgst;
  const grandTotal = subtotal + totalTax;

  const invoiceNumber = `INV-${tableNumber}-${session?.id ? session.id.slice(-6).toUpperCase() : Date.now().toString().slice(-6)}`;
  const invoiceDate = session?.openedAt ? new Date(session.openedAt) : new Date();
  const phoneDisplay = customerPhone || session?.customerPhone || orders[0]?.customerPhone || "Guest";

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadTxt = () => {
    const textContent = `
========================================
       ${restaurant?.name || "GOURMET BISTRO & GRILL"}
       42 Culinary Avenue, Tech City
        GSTIN: 27AABCT2345Q1Z3
         FSSAI: 10019022009876
========================================
TAX INVOICE: ${invoiceNumber}
Date: ${invoiceDate.toLocaleString("en-IN")}
Table: ${tableNumber}
Customer Phone: ${phoneDisplay}
Payment Mode: ${paymentMethod?.toUpperCase() || "CASH"} (${paymentStatus?.toUpperCase() || "PAID"})
----------------------------------------
ITEM                QTY   PRICE    TOTAL
----------------------------------------
${allItems.map((i) => `${i.name.padEnd(20).slice(0, 20)} ${i.quantity.toString().padStart(2)}   ₹${i.price.toString().padStart(5)}   ₹${i.total.toString().padStart(6)}`).join("\n")}
----------------------------------------
Subtotal:                        ₹${subtotal}
CGST (2.5%):                     ₹${cgst}
SGST (2.5%):                     ₹${sgst}
----------------------------------------
GRAND TOTAL:                     ₹${grandTotal}
========================================
  Thank you for dining with us!
      Please visit again!
========================================
    `.trim();

    const element = document.createElement("a");
    const file = new Blob([textContent], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `${invoiceNumber}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col">
        {/* Modal Action Bar (Hidden in Print) */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center space-x-2">
            <Receipt className="w-4 h-4 text-emerald-400" />
            <span className="font-extrabold text-xs uppercase tracking-wider">Official Tax Invoice</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="p-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition active:scale-95 shadow-xs"
              title="Print Bill"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>

            <button
              onClick={handleDownloadTxt}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition active:scale-95"
              title="Download text receipt"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            {onClose && (
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-xs font-bold transition"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* PRINTABLE RECEIPT CONTAINER */}
        <div id="printable-receipt" className="p-6 text-slate-800 bg-white font-sans text-xs">
          {/* Restaurant Header */}
          <div className="text-center pb-4 border-b border-dashed border-slate-300">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center mx-auto mb-2 font-black shadow-sm">
              <Utensils className="w-5 h-5" />
            </div>
            <h2 className="text-base font-black text-slate-900 tracking-tight uppercase">
              {restaurant?.name || "Gourmet Bistro & Grill"}
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              42 Culinary Avenue, Tech City, India
            </p>
            <div className="text-[10px] text-slate-400 font-medium mt-1 space-x-2">
              <span>GSTIN: 27AABCT2345Q1Z3</span>
              <span>•</span>
              <span>FSSAI: 10019022009876</span>
            </div>
          </div>

          {/* Invoice Metadata */}
          <div className="py-3 border-b border-dashed border-slate-300 space-y-1.5 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-500">Invoice No:</span>
              <span className="font-mono font-bold text-slate-900">{invoiceNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Date &amp; Time:</span>
              <span className="font-medium text-slate-800">
                {invoiceDate.toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}{" "}
                {invoiceDate.toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Table:</span>
              <span className="font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                Table {tableNumber}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Customer Mobile:</span>
              <span className="font-bold text-slate-900 flex items-center gap-1">
                <Phone className="w-3 h-3 text-slate-400" />
                {phoneDisplay}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Payment Status:</span>
              <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 uppercase text-[10px]">
                {paymentStatus} ({paymentMethod})
              </span>
            </div>
          </div>

          {/* Itemized Table */}
          <div className="py-3 border-b border-dashed border-slate-300">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] uppercase font-bold text-slate-400 border-b border-slate-200 pb-1">
                  <th className="pb-1.5">Item</th>
                  <th className="text-center pb-1.5">Qty</th>
                  <th className="text-right pb-1.5">Rate</th>
                  <th className="text-right pb-1.5">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allItems.map((item, idx) => (
                  <tr key={idx} className="py-2">
                    <td className="py-1.5 pr-2">
                      <p className="font-bold text-slate-900 text-xs">{item.name}</p>
                      {item.notes && (
                        <p className="text-[9px] text-slate-400 italic font-medium">{item.notes}</p>
                      )}
                    </td>
                    <td className="py-1.5 text-center font-bold text-slate-700 text-xs">
                      {item.quantity}
                    </td>
                    <td className="py-1.5 text-right text-slate-500 font-medium">
                      {formatCurrency(item.price)}
                    </td>
                    <td className="py-1.5 text-right font-black text-slate-900">
                      {formatCurrency(item.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals & Tax Calculation */}
          <div className="py-3 border-b border-dashed border-slate-300 space-y-1.5 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>Item Subtotal ({allItems.reduce((s, i) => s + i.quantity, 0)} items)</span>
              <span className="font-bold text-slate-900">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-500">
              <span>Central GST (CGST 2.5%)</span>
              <span>{formatCurrency(cgst)}</span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-500">
              <span>State GST (SGST 2.5%)</span>
              <span>{formatCurrency(sgst)}</span>
            </div>
            <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-200">
              <span>Grand Total</span>
              <span className="text-blue-700 text-lg font-black">{formatCurrency(grandTotal)}</span>
            </div>
          </div>

          {/* Footer Note */}
          <div className="pt-4 text-center text-slate-400 text-[10px] space-y-1">
            <p className="font-bold text-slate-700">Thank you for dining with us!</p>
            <p>For feedback or queries: support@gourmetbistro.com</p>
            <p className="text-[9px] text-slate-400 pt-1">*** This is a computer generated tax invoice ***</p>
          </div>
        </div>
      </div>
    </div>
  );
}
