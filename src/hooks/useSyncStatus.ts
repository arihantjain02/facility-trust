import { useEffect, useState } from "react";
import { readQueue } from "@/lib/offline-queue";

/**
 * Connectivity + pending offline evidence queue, shared by the header indicator
 * and the evidence submission screen.
 */
export function useSyncStatus() {
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const refresh = () => setPending(readQueue().length);

  useEffect(() => {
    setOnline(navigator.onLine);
    refresh();
    setLastSync(new Date());
    const up = () => {
      setOnline(true);
      setLastSync(new Date());
    };
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    const t = window.setInterval(refresh, 4000);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
      window.clearInterval(t);
    };
  }, []);

  return { online, pending, lastSync, refresh };
}
