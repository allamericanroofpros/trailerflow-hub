import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DollarSign, CreditCard, Banknote, Smartphone, ArrowLeft,
  Loader2, Check, Percent,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type CartItem = {
  menu_item_id: string;
  name: string;
  price: number;
  quantity: number;
};

type CheckoutProps = {
  cart: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  onComplete: (data: {
    paymentMethod: "cash" | "card" | "digital";
    tip: number;
    cashTendered?: number;
  }) => Promise<void>;
  onCancel: () => void;
  isPending: boolean;
};

type Step = "tip" | "payment" | "cash" | "processing";

const tipPresets = [0, 15, 18, 20, 25];

export default function POSCheckoutFlow({
  cart, subtotal, tax, total, onComplete, onCancel, isPending,
}: CheckoutProps) {
  const [step, setStep] = useState<Step>("tip");
  const [tipType, setTipType] = useState<"percent" | "dollar">("percent");
  const [tipPercent, setTipPercent] = useState(0);
  const [tipDollar, setTipDollar] = useState("");
  const [cashTendered, setCashTendered] = useState("");
  const [selectedPayment, setSelectedPayment] = useState<"cash" | "card" | "digital" | null>(null);

  const tipAmount = tipType === "percent"
    ? subtotal * (tipPercent / 100)
    : Number(tipDollar) || 0;
  const grandTotal = total + tipAmount;
  const changeDue = Number(cashTendered) - grandTotal;

  const handlePaymentSelect = async (method: "cash" | "card" | "digital") => {
    setSelectedPayment(method);
    if (method === "cash") {
      setStep("cash");
    } else {
      setStep("processing");
      await onComplete({ paymentMethod: method, tip: tipAmount });
    }
  };

  const handleCashComplete = async () => {
    if (Number(cashTendered) < grandTotal) return;
    setStep("processing");
    await onComplete({
      paymentMethod: "cash",
      tip: tipAmount,
      cashTendered: Number(cashTendered),
    });
  };

  // Quick cash buttons
  const cashQuick = [
    Math.ceil(grandTotal),
    Math.ceil(grandTotal / 5) * 5,
    Math.ceil(grandTotal / 10) * 10,
    Math.ceil(grandTotal / 20) * 20,
  ].filter((v, i, a) => a.indexOf(v) === i && v >= grandTotal).slice(0, 4);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/50 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-lg mx-4 rounded-3xl bg-card border-2 border-border shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-border bg-secondary/30">
          <button
            onClick={step === "payment" ? () => setStep("tip") : step === "cash" ? () => setStep("payment") : onCancel}
            className="flex items-center gap-1.5 text-sm font-bold text-muted-foreground hover:text-foreground active:scale-95 transition-all touch-manipulation"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <div className="text-right">
            <p className="text-xs text-muted-foreground font-semibold">Total</p>
            <p className="text-xl font-black text-card-foreground">${grandTotal.toFixed(2)}</p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* ── TIP STEP ── */}
          {step === "tip" && (
            <motion.div
              key="tip"
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -50, opacity: 0 }}
              className="p-6 space-y-5"
            >
              <div className="text-center">
                <h3 className="text-lg font-black text-card-foreground">Add Tip</h3>
                <p className="text-sm text-muted-foreground mt-1">Subtotal: ${subtotal.toFixed(2)}</p>
              </div>

              {/* Tip type toggle */}
              <div className="flex rounded-xl bg-secondary p-1 gap-1">
                <button
                  onClick={() => setTipType("percent")}
                  className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition-all touch-manipulation ${
                    tipType === "percent" ? "bg-card shadow text-card-foreground" : "text-muted-foreground"
                  }`}
                >
                  <Percent className="h-4 w-4 inline mr-1" /> Percentage
                </button>
                <button
                  onClick={() => setTipType("dollar")}
                  className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition-all touch-manipulation ${
                    tipType === "dollar" ? "bg-card shadow text-card-foreground" : "text-muted-foreground"
                  }`}
                >
                  <DollarSign className="h-4 w-4 inline mr-1" /> Dollar
                </button>
              </div>

              {tipType === "percent" ? (
                <div className="grid grid-cols-5 gap-2">
                  {tipPresets.map((pct) => (
                    <button
                      key={pct}
                      onClick={() => setTipPercent(pct)}
                      className={`rounded-xl py-4 text-center font-black transition-all active:scale-95 touch-manipulation border-2 ${
                        tipPercent === pct
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background text-card-foreground hover:border-primary/40"
                      }`}
                    >
                      <p className="text-lg">{pct}%</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        ${(subtotal * pct / 100).toFixed(2)}
                      </p>
                    </button>
                  ))}
                </div>
              ) : (
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Enter tip amount"
                  value={tipDollar}
                  onChange={(e) => setTipDollar(e.target.value)}
                  className="text-center text-2xl font-black h-16 rounded-xl border-2"
                />
              )}

              {tipAmount > 0 && (
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    Tip: <span className="font-black text-success">${tipAmount.toFixed(2)}</span>
                    {" · "}New total: <span className="font-black text-card-foreground">${grandTotal.toFixed(2)}</span>
                  </p>
                </div>
              )}

              <Button
                size="lg"
                className="w-full h-14 text-base font-black rounded-xl active:scale-95 touch-manipulation"
                onClick={() => setStep("payment")}
              >
                {tipAmount > 0 ? `Continue · $${grandTotal.toFixed(2)}` : "No Tip · Continue"}
              </Button>
            </motion.div>
          )}

          {/* ── PAYMENT STEP ── */}
          {step === "payment" && (
            <motion.div
              key="payment"
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -50, opacity: 0 }}
              className="p-6 space-y-4"
            >
              <div className="text-center">
                <h3 className="text-lg font-black text-card-foreground">Payment Method</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Charge <span className="font-black text-card-foreground">${grandTotal.toFixed(2)}</span>
                </p>
              </div>

              <div className="space-y-3">
                {[
                  { method: "cash" as const, icon: Banknote, label: "Cash", desc: "Accept cash payment" },
                  { method: "card" as const, icon: CreditCard, label: "Card", desc: "Credit or debit card" },
                  { method: "digital" as const, icon: Smartphone, label: "Digital", desc: "Apple Pay, Google Pay, Venmo" },
                ].map(({ method, icon: Icon, label, desc }) => (
                  <button
                    key={method}
                    onClick={() => handlePaymentSelect(method)}
                    disabled={isPending}
                    className="w-full flex items-center gap-4 rounded-2xl border-2 border-border bg-background p-5 hover:border-primary/40 hover:shadow-md active:scale-[0.98] transition-all touch-manipulation text-left"
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-7 w-7" />
                    </div>
                    <div>
                      <p className="text-base font-black text-card-foreground">{label}</p>
                      <p className="text-sm text-muted-foreground">{desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── CASH TENDERED ── */}
          {step === "cash" && (
            <motion.div
              key="cash"
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -50, opacity: 0 }}
              className="p-6 space-y-5"
            >
              <div className="text-center">
                <h3 className="text-lg font-black text-card-foreground">Cash Tendered</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Amount due: <span className="font-black text-card-foreground">${grandTotal.toFixed(2)}</span>
                </p>
              </div>

              {/* Quick amounts */}
              <div className="grid grid-cols-4 gap-2">
                {cashQuick.map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setCashTendered(amt.toString())}
                    className={`rounded-xl py-3 text-center font-black transition-all active:scale-95 touch-manipulation border-2 ${
                      Number(cashTendered) === amt
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-card-foreground"
                    }`}
                  >
                    ${amt}
                  </button>
                ))}
              </div>

              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="Enter amount"
                value={cashTendered}
                onChange={(e) => setCashTendered(e.target.value)}
                className="text-center text-3xl font-black h-20 rounded-xl border-2"
                autoFocus
              />

              {Number(cashTendered) >= grandTotal && (
                <div className="rounded-2xl bg-success/10 border-2 border-success/30 p-4 text-center">
                  <p className="text-sm text-muted-foreground font-semibold">Change Due</p>
                  <p className="text-4xl font-black text-success">${changeDue.toFixed(2)}</p>
                </div>
              )}

              <Button
                size="lg"
                className="w-full h-14 text-base font-black rounded-xl active:scale-95 touch-manipulation"
                onClick={handleCashComplete}
                disabled={Number(cashTendered) < grandTotal || isPending}
              >
                {isPending ? (
                  <><Loader2 className="h-5 w-5 animate-spin mr-2" /> Processing...</>
                ) : (
                  `Complete Sale · $${grandTotal.toFixed(2)}`
                )}
              </Button>
            </motion.div>
          )}

          {/* ── PROCESSING ── */}
          {step === "processing" && (
            <motion.div
              key="processing"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="p-12 flex flex-col items-center justify-center"
            >
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-lg font-black text-card-foreground">Processing payment...</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
