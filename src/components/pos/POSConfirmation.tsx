import { useState } from "react";
import { motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import {
  Check, X, Mail, MessageSquare, QrCode, Printer,
  ArrowLeft, Copy, Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type ReceiptItem = {
  name: string;
  quantity: number;
  price: number;
};

type ConfirmationProps = {
  orderNumber: number;
  items: ReceiptItem[];
  subtotal: number;
  tax: number;
  taxLabel?: string;
  taxInclusive?: boolean;
  tip: number;
  total: number;
  paymentMethod: string;
  cashTendered?: number;
  changeDue?: number;
  orderId: string;
  surchargeAmount?: number;
  surchargeLabel?: string;
  onDone: () => void;
};

export default function POSConfirmation({
  orderNumber, items, subtotal, tax, taxLabel, taxInclusive, tip, total,
  paymentMethod, cashTendered, changeDue, orderId, surchargeAmount, surchargeLabel, onDone,
}: ConfirmationProps) {
  const [receiptMode, setReceiptMode] = useState<null | "qr" | "email" | "sms">(null);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const receiptUrl = `${window.location.origin}/receipt/${orderId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(receiptUrl);
    toast.success("Receipt link copied!");
  };

  const handleEmailReceipt = async () => {
    if (!email.trim() || !email.includes("@")) {
      toast.error("Enter a valid email");
      return;
    }
    // For now, copy link and inform — full email integration coming
    navigator.clipboard.writeText(receiptUrl);
    toast.success("Receipt link copied! Email delivery coming soon.");
    setReceiptMode(null);
  };

  const handleSmsReceipt = async () => {
    if (!phone.trim() || phone.length < 10) {
      toast.error("Enter a valid phone number");
      return;
    }
    navigator.clipboard.writeText(receiptUrl);
    toast.success("Receipt link copied! SMS delivery coming soon.");
    setReceiptMode(null);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/50 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md mx-4 rounded-3xl bg-card border-2 border-border shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Success Header */}
        <div className="bg-success/10 px-6 py-6 text-center border-b-2 border-success/20 shrink-0">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-success mx-auto mb-3"
          >
            <Check className="h-8 w-8 text-success-foreground" />
          </motion.div>
          <h2 className="text-2xl font-black text-card-foreground">Order #{orderNumber}</h2>
          <p className="text-sm text-muted-foreground font-semibold mt-1">Payment received</p>
        </div>

        {/* Receipt Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Items */}
          <div className="space-y-2">
            {items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  <span className="font-black text-card-foreground">{item.quantity}×</span> {item.name}
                </span>
                <span className="font-bold text-card-foreground">${(item.price * item.quantity).toFixed(1)}</span>
              </div>
            ))}
          </div>

          <div className="border-t-2 border-border pt-3 space-y-1.5">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Subtotal</span>
              <span className="font-semibold">${subtotal.toFixed(1)}</span>
            </div>
            {taxInclusive ? (
              tax > 0 && (
                <div className="flex justify-between text-xs text-muted-foreground/70 italic">
                  <span>Includes {taxLabel || "Tax"}</span>
                  <span>${tax.toFixed(1)}</span>
                </div>
              )
            ) : (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{taxLabel || "Tax"}</span>
                <span className="font-semibold">${tax.toFixed(1)}</span>
              </div>
            )}
            {tip > 0 && (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Tip</span>
                <span className="font-semibold text-success">${tip.toFixed(1)}</span>
              </div>
            )}
            {(surchargeAmount ?? 0) > 0 && (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{surchargeLabel || "Non-Cash Adjustment"}</span>
                <span className="font-semibold">${(surchargeAmount ?? 0).toFixed(1)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-black text-card-foreground pt-2 border-t-2 border-border">
              <span>Total</span>
              <span>${total.toFixed(1)}</span>
            </div>
          </div>

          {/* Payment details */}
          <div className="rounded-xl bg-secondary/50 p-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Payment</span>
              <span className="font-bold text-card-foreground capitalize">{paymentMethod}</span>
            </div>
            {cashTendered != null && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cash tendered</span>
                  <span className="font-bold text-card-foreground">${cashTendered.toFixed(2)}</span>
                </div>
                {changeDue != null && changeDue > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Change</span>
                    <span className="font-black text-success">${changeDue.toFixed(2)}</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Receipt Actions */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Send Receipt</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { mode: "qr" as const, icon: QrCode, label: "QR Code" },
                { mode: "email" as const, icon: Mail, label: "Email" },
                { mode: "sms" as const, icon: MessageSquare, label: "Text" },
              ].map(({ mode, icon: Icon, label }) => (
                <button
                  key={mode}
                  onClick={() => setReceiptMode(receiptMode === mode ? null : mode)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 text-xs font-bold transition-all active:scale-95 touch-manipulation ${
                    receiptMode === mode
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {label}
                </button>
              ))}
            </div>

            {/* QR Code */}
            {receiptMode === "qr" && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                className="flex flex-col items-center gap-3 rounded-xl border-2 border-border p-4 bg-white"
              >
                <QRCodeSVG value={receiptUrl} size={180} level="M" />
                <p className="text-xs text-muted-foreground text-center">
                  Customer scans to view receipt
                </p>
                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
                >
                  <Copy className="h-3.5 w-3.5" /> Copy link
                </button>
              </motion.div>
            )}

            {/* Email */}
            {receiptMode === "email" && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                className="flex gap-2"
              >
                <Input
                  type="email"
                  placeholder="customer@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 rounded-xl border-2 h-12 text-base"
                />
                <Button onClick={handleEmailReceipt} className="h-12 px-5 rounded-xl font-bold">
                  Send
                </Button>
              </motion.div>
            )}

            {/* SMS */}
            {receiptMode === "sms" && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                className="flex gap-2"
              >
                <Input
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="flex-1 rounded-xl border-2 h-12 text-base"
                />
                <Button onClick={handleSmsReceipt} className="h-12 px-5 rounded-xl font-bold">
                  Send
                </Button>
              </motion.div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t-2 border-border shrink-0">
          <Button
            size="lg"
            className="w-full h-14 text-base font-black rounded-xl active:scale-95 touch-manipulation"
            onClick={onDone}
          >
            New Order
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
