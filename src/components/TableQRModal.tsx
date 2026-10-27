"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Download, ExternalLink, X, QrCode } from "lucide-react";

interface TableQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  tableNumber: string;
  publicId: string;
  displayName: string;
}

export function TableQRModal({
  isOpen,
  onClose,
  tableNumber,
  publicId,
  displayName,
}: TableQRModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [origin, setOrigin] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  const menuUrl = `${origin}/menu/${publicId}`;

  useEffect(() => {
    if (isOpen && publicId) {
      QRCode.toDataURL(menuUrl, {
        width: 340,
        margin: 2,
        color: {
          dark: "#1e3a8a", // deep blue QR code
          light: "#ffffff",
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error("QR Code generation error", err));
    }
  }, [isOpen, publicId, menuUrl]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-6 text-slate-800 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center mb-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold mb-2">
            <QrCode className="w-3.5 h-3.5" />
            Table {tableNumber} QR
          </div>
          <h3 className="text-lg font-extrabold text-slate-900">{displayName}</h3>
          <p className="text-xs text-slate-500 mt-1">
            Guests scan to view menu and place live orders
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200/80 p-5 rounded-2xl flex items-center justify-center my-4 shadow-inner">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt={`QR Code for Table ${tableNumber}`} className="w-56 h-56 rounded-xl shadow-xs" />
          ) : (
            <div className="w-56 h-56 flex items-center justify-center text-slate-400">
              Generating QR...
            </div>
          )}
        </div>

        <div className="bg-blue-50/60 p-2.5 rounded-xl border border-blue-100 text-center mb-5 break-all text-[11px] text-blue-800 font-mono">
          {menuUrl}
        </div>

        <div className="flex gap-2.5">
          {qrDataUrl && (
            <a
              href={qrDataUrl}
              download={`Table-${tableNumber}-QR.png`}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs transition shadow-sm shadow-blue-500/20"
            >
              <Download className="w-4 h-4" />
              Download PNG
            </a>
          )}
          <a
            href={`/menu/${publicId}`}
            target="_blank"
            rel="noreferrer"
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition border border-slate-200"
          >
            <ExternalLink className="w-4 h-4" />
            Open Portal
          </a>
        </div>
      </div>
    </div>
  );
}
