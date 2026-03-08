import { useState, useRef, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Sparkles, Send, Trash2, Bot, User } from "lucide-react";
import { useClaudeChat } from "@/hooks/useClaudeAI";

export function AIChatDrawer() {
  const { messages, isLoading, send, clearMessages } = useClaudeChat();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    setInput("");
    send(trimmed);
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button size="icon" className="fixed bottom-6 right-6 h-12 w-12 rounded-full shadow-lg z-50">
          <Sparkles className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col w-full sm:max-w-md p-0">
        <SheetHeader className="px-4 py-3 border-b border-border">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              AI Assistant
            </SheetTitle>
            {messages.length > 0 && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={clearMessages}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </SheetHeader>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground gap-3 py-12">
              <Bot className="h-10 w-10 text-primary/40" />
              <p className="text-sm">Ask me anything about your business, events, or finances.</p>
              <div className="flex flex-wrap gap-2 justify-center mt-2">
                {["What events should I target next?", "How's my revenue trending?", "Suggest staffing for next week"].map((q) => (
                  <button
                    key={q}
                    onClick={() => { setInput(q); }}
                    className="text-xs rounded-full border border-border bg-card px-3 py-1.5 text-muted-foreground hover:bg-secondary transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Bot className="h-3.5 w-3.5 text-primary" />
                </div>
              )}
              <div
                className={`rounded-xl px-3.5 py-2.5 text-sm max-w-[85%] whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                }`}
              >
                {msg.content}
              </div>
              {msg.role === "user" && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              )}
            </div>
          ))}

          {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Bot className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="rounded-xl bg-secondary px-3.5 py-2.5 text-sm text-muted-foreground">
                <span className="animate-pulse">Thinking...</span>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-border p-3">
          <div className="flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder="Ask your AI assistant..."
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
              disabled={isLoading}
            />
            <Button size="icon" className="h-9 w-9 shrink-0" onClick={handleSend} disabled={isLoading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
