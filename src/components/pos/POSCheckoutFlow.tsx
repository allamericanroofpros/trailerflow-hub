import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DollarSign, CreditCard, Banknote, Smartphone, ArrowLeft,
  Loader2, Percent,
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
  surchargeSettings?: { enabled: boolean; label: string; percent: number; flat: number | null; cap: number | null };
  onComplete: (data: {
    paymentMethod: "cash" | "card" | "digital";
    tip: number;
    cashTendered?: number;
    surchargeAmount?: number;
    surchargeLabel?: string;
  }) => Promise<void>;
  onCancel: () => void;
  isPending: boolean;
};

type Step = "payment" | "tip" | "cash" | "processing" | "card-done";

const tipPresets = [0, 15, 18, 20, 25];

import { supabase } from "@/integrations/supabase/client";

const processStripePayment = async (amount: number): Promise<{ success: boolean; chargeId?: string; paymentIntentId?: string }> => {
  const { data, error } = await supabase.functions.invoke("create-payment-intent", {
    body: { amount, description: "POS Sale" },
  });
  if (error || data?.error) {
    throw new Error(data?.error || error?.message || "Payment failed");
  }
  // Payment intent created — in a web POS without a physical terminal,
  // the intent is created and we treat it as successful for now.
  // Full Stripe Elements integration can be added for on-screen card entry.
  return { success: true, chargeId: data.paymentIntentId, paymentIntentId: data.paymentIntentId };
};

export default function POSCheckoutFlow({
  cart, subtotal, tax, total, surchargeSettings, onComplete, onCancel, isPending,
}: CheckoutProps) {
  const [step, setStep] = useState<Step>("payment");
  const [tipType, setTipType] = useState<"percent" | "dollar">("percent");
  const [tipPercent, setTipPercent] = useState(0);
  const [tipDollar, setTipDollar] = useState("");
  const [cashTendered, setCashTendered] = useState("");
  const [selectedPayment, setSelectedPayment] = useState<"cash" | "card" | "digital" | null>(null);

  // Calculate surcharge for card payments
  const calcSurchargeAmount = (method: "cash" | "card" | "digital" | null): number => {
    if (!surchargeSettings?.enabled || method !== "card") return 0;
    let amt = subtotal * (surchargeSettings.percent / 100);
    if (surchargeSettings.flat) amt += surchargeSettings.flat;
    if (surchargeSettings.cap && amt > surchargeSettings.cap) amt = surchargeSettings.cap;
    return Math.round(amt * 100) / 100;
  };

  const surchargeAmount = calcSurchargeAmount(selectedPayment);

  const tipAmount = tipType === "percent"
    ? subtotal * (tipPercent / 100)
    : Number(tipDollar) || 0;

  // Grand total: base total + surcharge (card only) + tip (card only)
  const currentTotal = selectedPayment === "card" ? total + surchargeAmount + tipAmount : total;
  const changeDue = Number(cashTendered) - total;

  const handlePaymentSelect = async (method: "cash" | "card" | "digital") => {
    setSelectedPayment(method);
    if (method === "card") {
      // Card → process payment first, then ask for tip
      setStep("processing");
      const result = await processStripePayment(total);
      if (result.success) {
        setStep("tip");
      }
    } else if (method === "cash") {
      setStep("cash");
    } else {
      // Digital (Apple Pay, etc.) → process immediately, no tip
      setStep("processing");
      await onComplete({ paymentMethod: method, tip: 0 });
    }
  };

  const handleTipComplete = async () => {
    setStep("processing");
    await onComplete({
      paymentMethod: "card",
      tip: tipAmount,
      surchargeAmount: surchargeAmount > 0 ? surchargeAmount : undefined,
      surchargeLabel: surchargeAmount > 0 ? surchargeSettings?.label : undefined,
    });
  };

  const handleCashComplete = async () => {
    if (Number(cashTendered) < total) return;
    setStep("processing");
    await onComplete({
      paymentMethod: "cash",
      tip: 0,
      cashTendered: Number(cashTendered),
    });
  };

  // Quick cash buttons
  const cashQuick = [
    Math.ceil(total),
    Math.ceil(total / 5) * 5,
    Math.ceil(total / 10) * 10,
    Math.ceil(total / 20) * 20,
  ].filter((v, i, a) => a.indexOf(v) === i && v >= total).slice(0, 4);

  const getBackAction = () => {
    switch (step) {
      case "payment": return onCancel;
      case "tip": return () => setStep("payment");
      case "cash": return () => setStep("payment");
      default: return onCancel;
    }
  };

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
            onClick={getBackAction()}
            className="flex items-center gap-1.5 text-sm font-bold text-muted-foreground hover:text-foreground active:scale-95 transition-all touch-manipulation"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <div className="text-right">
            <p className="text-xs text-muted-foreground font-semibold">Total</p>
            <p className="text-xl font-black text-card-foreground">${currentTotal.toFixed(2)}</p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* ── PAYMENT METHOD STEP (now first) ── */}
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
                  Charge <span className="font-black text-card-foreground">${total.toFixed(2)}</span>
                </p>
              </div>

              <div className="space-y-3">
                {[
                  { method: "cash" as const, icon: Banknote, label: "Cash", desc: "Accept cash payment" },
                  { method: "card" as const, icon: CreditCard, label: "Card", desc: "Credit or debit card (Stripe)" },
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

          {/* ── TIP STEP (card only) ── */}
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
                    {" · "}New total: <span className="font-black text-card-foreground">${(total + tipAmount).toFixed(2)}</span>
                  </p>
                </div>
              )}

              <Button
                size="lg"
                className="w-full h-14 text-base font-black rounded-xl active:scale-95 touch-manipulation"
                onClick={handleTipComplete}
                disabled={isPending}
              >
                {tipAmount > 0 ? `Add Tip · $${tipAmount.toFixed(2)}` : `No Tip · Done`}
              </Button>
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
                  Amount due: <span className="font-black text-card-foreground">${total.toFixed(2)}</span>
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

              {Number(cashTendered) >= total && (
                <div className="rounded-2xl bg-success/10 border-2 border-success/30 p-4 text-center">
                  <p className="text-sm text-muted-foreground font-semibold">Change Due</p>
                  <p className="text-4xl font-black text-success">${changeDue.toFixed(2)}</p>
                </div>
              )}

              <Button
                size="lg"
                className="w-full h-14 text-base font-black rounded-xl active:scale-95 touch-manipulation"
                onClick={handleCashComplete}
                disabled={Number(cashTendered) < total || isPending}
              >
                {isPending ? (
                  <><Loader2 className="h-5 w-5 animate-spin mr-2" /> Processing...</>
                ) : (
                  `Complete Sale · $${total.toFixed(2)}`
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
              {selectedPayment === "card" && (
                <p className="text-sm text-muted-foreground mt-2">Connecting to Stripe...</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
