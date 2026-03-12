import { useState, useRef, useCallback, useEffect } from "react";
import { loadStripeTerminal } from "@stripe/terminal-js";
import type { Terminal, Reader, ErrorResponse } from "@stripe/terminal-js";
import { supabase } from "@/integrations/supabase/client";

function isErrorResponse(result: unknown): result is ErrorResponse {
  return typeof result === "object" && result !== null && "error" in result;
}

export function useStripeTerminal() {
  const terminalRef = useRef<Terminal | null>(null);
  const [connectedReader, setConnectedReader] = useState<Reader | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConnectionToken = useCallback(async (): Promise<string> => {
    const { data, error } = await supabase.functions.invoke(
      "stripe-terminal-connection-token",
      { body: {} }
    );
    if (error || !data?.secret) {
      throw new Error(data?.error || error?.message || "Failed to fetch connection token");
    }
    return data.secret;
  }, []);

  const initTerminal = useCallback(async (): Promise<Terminal> => {
    if (terminalRef.current) return terminalRef.current;

    const StripeTerminal = await loadStripeTerminal();
    if (!StripeTerminal) throw new Error("Failed to load Stripe Terminal SDK");

    const terminal = StripeTerminal.create({
      onFetchConnectionToken: fetchConnectionToken,
      onUnexpectedReaderDisconnect: () => {
        setConnectedReader(null);
        setError("Reader disconnected unexpectedly");
      },
    });

    terminalRef.current = terminal;
    return terminal;
  }, [fetchConnectionToken]);

  const connectReader = useCallback(async () => {
    setIsConnecting(true);
    setError(null);

    try {
      const terminal = await initTerminal();

      const discoverResult = await terminal.discoverReaders({ simulated: true });
      if (isErrorResponse(discoverResult)) {
        throw new Error(discoverResult.error.message);
      }

      const readers = discoverResult.discoveredReaders;
      if (readers.length === 0) {
        throw new Error("No readers found");
      }

      const connectResult = await terminal.connectReader(readers[0]);
      if (isErrorResponse(connectResult)) {
        throw new Error(connectResult.error.message);
      }

      setConnectedReader(connectResult.reader);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to connect reader";
      setError(msg);
    } finally {
      setIsConnecting(false);
    }
  }, [initTerminal]);

  useEffect(() => {
    return () => {
      if (terminalRef.current && connectedReader) {
        terminalRef.current.disconnectReader();
      }
    };
  }, [connectedReader]);

  return {
    terminal: terminalRef.current,
    connectReader,
    connectedReader,
    isConnecting,
    error,
    initTerminal,
  };
}
