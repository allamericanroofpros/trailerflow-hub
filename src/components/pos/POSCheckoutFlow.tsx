import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DollarSign, CreditCard, Banknote, Smartphone, ArrowLeft,
  Loader2, Percent, CheckCircle2, XCircle, Wifi,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useStripeTerminal } from "@/hooks/useStripeTerminal";
import type { ErrorResponse } from "@stripe/terminal-js";

function isErrorResponse(result: unknown): result is ErrorResponse {
  return typeof result === "object" && result !== null && "error" in result;
}

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
  orgId?: string | null;
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
type CardStatus = "connecting" | "present-card" | "processing" | "confirming" | "approved" | "declined";

const tipPresets = [0, 15, 18, 20, 25];

export default function POSCheckoutFlow({
  cart, subtotal, tax, total, orgId, surchargeSettings, onComplete, onCancel, isPending,
}: CheckoutProps) {
  const [step, setStep] = useState<Step>("payment");
  const [tipType, setTipType] = useState<"percent" | "dollar">("percent");
  const [tipPercent, setTipPercent] = useState(0);
  const [tipDollar, setTipDollar] = useState("");
  const [cashTendered, setCashTendered] = useState("");
  const [selectedPayment, setSelectedPayment] = useState<"cash" | "card" | "digital" | null>(null);
  const [cardStatus, setCardStatus] = useState<CardStatus>("connecting");
  const [cardError, setCardError] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);

  const {
    terminal,
    connectReader,
    connectedReader,
    isConnecting,
    error: terminalError,
    initTerminal,
  } = useStripeTerminal();

  // Auto-connect to reader on mount
  useEffect(() => {
    if (!connectedReader && !isConnecting) {
      connectReader();
    }
  }, []);

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

  const processCardPayment = async () => {
    setCardError(null);
    setCardStatus("connecting");
    setStep("processing");

    try {
      // Ensure terminal is connected
      let activeTerminal = terminal;
      if (!activeTerminal) {
        activeTerminal = await initTerminal();
      }
      if (!connectedReader) {
        await connectReader();
      }

      // Create a Terminal-specific PaymentIntent via our edge function
      setCardStatus("connecting");
      const { data: piData, error: piError } = await supabase.functions.invoke(
        "stripe-create-payment-intent",
        { body: { amount: total, currency: "usd", org_id: orgId } }
      );
      if (piError || piData?.error) {
        throw new Error(piData?.error || piError?.message || "Failed to create payment");
      }

      const clientSecret: string = piData.client_secret;
      const piId: string = piData.payment_intent_id;
      setPaymentIntentId(piId);

      // Collect payment method from the reader
      setCardStatus("present-card");

      // Re-get terminal in case it was initialized during connectReader
      const term = terminal ?? await initTerminal();

      const collectResult = await term.collectPaymentMethod(clientSecret, {
        config_override: { skip_tipping: true },
      });
      if (isErrorResponse(collectResult)) {
        throw new Error(collectResult.error.message);
      }

      // Process the payment on the reader
      setCardStatus("processing");
      const processResult = await term.processPayment(collectResult.paymentIntent);
      if (isErrorResponse(processResult)) {
        const declineCode = processResult.error.decline_code;
        throw new Error(
          declineCode
            ? `Card declined: ${declineCode}`
            : processResult.error.message
        );
      }

      // Payment processed — move to tip step
      setCardStatus("approved");
      setStep("tip");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Card payment failed";
      setCardError(msg);
      setCardStatus("declined");
    }
  };

  const handlePaymentSelect = async (method: "cash" | "card" | "digital") => {
    setSelectedPayment(method);
    if (method === "card") {
      await processCardPayment();
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
    setCardStatus("confirming");

    try {
      // Call confirm-payment to capture and apply tip
      if (paymentIntentId) {
        const { data, error } = await supabase.functions.invoke("confirm-payment", {
          body: {
            paymentIntentId,
            tipAmount: tipAmount > 0 ? tipAmount : undefined,
          },
        });
        if (error || data?.error) {
          throw new Error(data?.error || error?.message || "Failed to confirm payment");
        }
      }

      setCardStatus("approved");
      await onComplete({
        paymentMethod: "card",
        tip: tipAmount,
        surchargeAmount: surchargeAmount > 0 ? surchargeAmount : undefined,
        surchargeLabel: surchargeAmount > 0 ? surchargeSettings?.label : undefined,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to confirm payment";
      setCardError(msg);
      setCardStatus("declined");
    }
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

  const cardStatusDisplay: Record<CardStatus, { icon: typeof Loader2; text: string; color: string }> = {
    connecting: { icon: Wifi, text: "Connecting to reader...", color: "text-primary" },
    "present-card": { icon: CreditCard, text: "Present card on reader", color: "text-amber-500" },
    processing: { icon: Loader2, text: "Processing payment...", color: "text-primary" },
    confirming: { icon: Loader2, text: "Confirming payment...", color: "text-primary" },
    approved: { icon: CheckCircle2, text: "Payment approved", color: "text-success" },
    declined: { icon: XCircle, text: cardError || "Payment declined", color: "text-destructive" },
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
            <p className="text-xl font-black text-card-foreground">${currentTotal.toFixed(1)}</p>
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
                  Charge <span className="font-black text-card-foreground">${total.toFixed(1)}</span>
                </p>
                {surchargeSettings?.enabled && (
                  <p className="text-xs text-amber-600 mt-1">
                    Card payments include a {surchargeSettings.percent}% {surchargeSettings.label.toLowerCase()}
                  </p>
                )}
              </div>

              {/* Reader status indicator */}
              <div className={`flex items-center justify-center gap-2 text-xs font-semibold ${
                connectedReader ? "text-success" : isConnecting ? "text-muted-foreground" : terminalError ? "text-destructive" : "text-muted-foreground"
              }`}>
                <div className={`h-2 w-2 rounded-full ${
                  connectedReader ? "bg-success" : isConnecting ? "bg-muted-foreground animate-pulse" : "bg-destructive"
                }`} />
                {connectedReader
                  ? "Reader connected"
                  : isConnecting
                    ? "Connecting reader..."
                    : terminalError || "Reader not connected"}
              </div>

              <div className="space-y-3">
                {[
                  { method: "cash" as const, icon: Banknote, label: "Cash", desc: "Accept cash payment" },
                  { method: "card" as const, icon: CreditCard, label: "Card", desc: "Credit or debit card (Stripe Terminal)" },
                  { method: "digital" as const, icon: Smartphone, label: "Digital", desc: "Apple Pay, Google Pay, Venmo" },
                ].map(({ method, icon: Icon, label, desc }) => (
                  <button
                    key={method}
                    onClick={() => handlePaymentSelect(method)}
                    disabled={isPending || (method === "card" && !connectedReader)}
                    className="w-full flex items-center gap-4 rounded-2xl border-2 border-border bg-background p-5 hover:border-primary/40 hover:shadow-md active:scale-[0.98] transition-all touch-manipulation text-left disabled:opacity-50 disabled:cursor-not-allowed"
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
                <p className="text-sm text-muted-foreground mt-1">Subtotal: ${subtotal.toFixed(1)}</p>
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
                        ${(subtotal * pct / 100).toFixed(1)}
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

              {surchargeAmount > 0 && (
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">
                    {surchargeSettings?.label}: <span className="font-bold text-card-foreground">${surchargeAmount.toFixed(1)}</span>
                  </p>
                </div>
              )}

              {(tipAmount > 0 || surchargeAmount > 0) && (
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    {tipAmount > 0 && <>Tip: <span className="font-black text-success">${tipAmount.toFixed(1)}</span>{" · "}</>}
                    New total: <span className="font-black text-card-foreground">${(total + surchargeAmount + tipAmount).toFixed(1)}</span>
                  </p>
                </div>
              )}

              <Button
                size="lg"
                className="w-full h-14 text-base font-black rounded-xl active:scale-95 touch-manipulation"
                onClick={handleTipComplete}
                disabled={isPending}
              >
                {tipAmount > 0 ? `Add Tip · $${tipAmount.toFixed(1)}` : `No Tip · Done`}
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
                  Amount due: <span className="font-black text-card-foreground">${total.toFixed(1)}</span>
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
                  <p className="text-4xl font-black text-success">${changeDue.toFixed(1)}</p>
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
                  `Complete Sale · $${total.toFixed(1)}`
                )}
              </Button>
            </motion.div>
          )}

          {/* ── PROCESSING (card terminal status) ── */}
          {step === "processing" && (
            <motion.div
              key="processing"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="p-12 flex flex-col items-center justify-center"
            >
              {selectedPayment === "card" ? (() => {
                const status = cardStatusDisplay[cardStatus];
                const StatusIcon = status.icon;
                const isSpinning = cardStatus === "connecting" || cardStatus === "processing" || cardStatus === "confirming";
                const isPresentCard = cardStatus === "present-card";
                return (
                  <>
                    <StatusIcon className={`h-12 w-12 mb-4 ${status.color} ${isSpinning ? "animate-spin" : ""} ${isPresentCard ? "animate-pulse" : ""}`} />
                    <p className={`text-lg font-black ${status.color}`}>{status.text}</p>
                    {isPresentCard && (
                      <p className="text-sm text-muted-foreground mt-2">Tap, insert, or swipe</p>
                    )}
                    {cardStatus === "declined" && (
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => {
                          setCardError(null);
                          setStep("payment");
                        }}
                      >
                        Try Again
                      </Button>
                    )}
                  </>
                );
              })() : (
                <>
                  <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                  <p className="text-lg font-black text-card-foreground">Processing payment...</p>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
