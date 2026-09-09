import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui-kit";
import { WifiOff, RefreshCw, Trash2 } from "lucide-react";
import type { QueuedReport } from "@/lib/offline-queue";
import { remove } from "@/lib/offline-queue";
import { submitEvidence } from "@/lib/api/evidence.functions";

export function OfflineQueuePanel({
  queued,
  online,
  lastSync,
  syncing,
  onSyncAll,
  onRefresh,
}: {
  queued: QueuedReport[];
  online: boolean;
  lastSync: Date | null;
  syncing: boolean;
  onSyncAll: () => void;
  onRefresh: () => void;
}) {
  if (queued.length === 0) return null;

  const retryOne = async (item: QueuedReport) => {
    try {
      await submitEvidence({ data: { ...(item.payload as any), source: "OFFLINE_SYNC" } });
      remove(item.id);
      toast.success("Synced queued observation.");
      onRefresh();
    } catch (e) {
      toast.error("Could not sync this item", { description: (e as Error).message });
    }
  };

  const discard = (item: QueuedReport) => {
    remove(item.id);
    onRefresh();
    toast("Discarded queued observation.");
  };

  return (
    <section className="rounded-md border border-stale/30 bg-stale-soft p-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:flex sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold text-stale">
            <WifiOff className="size-4 shrink-0" />
            Stored on this device — {queued.length} observation{queued.length > 1 ? "s" : ""} pending
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {online ? "Online — ready to sync." : "You are offline. Reports will sync automatically once connectivity returns."}
            {lastSync && ` Last sync check: ${lastSync.toLocaleTimeString()}.`}
          </p>
        </div>
        <Button size="sm" variant="outline" disabled={!online || syncing} onClick={onSyncAll} className="shrink-0">
          <RefreshCw className={syncing ? "size-4 animate-spin" : "size-4"} />
          {syncing ? "Syncing…" : "Sync now"}
        </Button>
      </div>

      <ul className="mt-3 space-y-2">
        {queued.map((item) => (
          <li
            key={item.id}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-sm border border-border bg-card px-3 py-2 text-xs"
          >
            <div className="min-w-0">
              <p className="truncate font-medium">
                {String((item.payload as any).observation ?? "").replace(/_/g, " ").toLowerCase()}
              </p>
              <p className="truncate text-muted-foreground">Queued {new Date(item.queued_at).toLocaleString()}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <StatusPill tone="stale" dot={false}>Queued</StatusPill>
              <Button size="icon" variant="ghost" className="size-7" title="Retry" onClick={() => retryOne(item)}>
                <RefreshCw className="size-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="size-7" title="Discard" onClick={() => discard(item)}>
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
