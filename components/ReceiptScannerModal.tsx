// components/ReceiptScannerModal.tsx
"use client";

import { useState } from "react";

interface ReceiptScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ReceiptScannerModal({ isOpen, onClose }: ReceiptScannerModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleScan = async () => {
    if (!selectedFile) return;
    
    setIsScanning(true);
    // TODO: Send to backend API
    setTimeout(() => {
      alert("Receipt scanning will be implemented soon!");
      setIsScanning(false);
      onClose();
    }, 1000);
  };

  const handleClose = () => {
    setSelectedFile(null);
    setPreview(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Scan Receipt</h2>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          {/* Upload Section */}
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
            {preview ? (
              <div className="space-y-3">
                <img src={preview} alt="Receipt preview" className="max-h-48 mx-auto rounded" />
                <button
                  onClick={() => {
                    setSelectedFile(null);
                    setPreview(null);
                  }}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Choose different image
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-4xl">📄</div>
                <p className="text-sm text-slate-600">Upload a receipt image</p>
                <label className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition-colors">
                  Choose File
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>

          {/* Camera Option (Placeholder) */}
          <div className="border border-slate-300 rounded-lg p-4 bg-slate-50">
            <div className="flex items-center gap-3">
              <div className="text-2xl">📷</div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-700">Use Camera</p>
                <p className="text-xs text-slate-500">Coming soon for mobile devices</p>
              </div>
              <button
                disabled
                className="px-3 py-1 bg-slate-300 text-slate-500 rounded-lg text-sm cursor-not-allowed"
              >
                Soon
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              disabled={isScanning}
            >
              Cancel
            </button>
            <button
              onClick={handleScan}
              disabled={!selectedFile || isScanning}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isScanning ? "Scanning..." : "Scan Receipt"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
