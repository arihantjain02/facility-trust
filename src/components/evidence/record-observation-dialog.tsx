import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, WifiOff } from "lucide-react";
import { submitEvidence } from "@/lib/api/evidence.functions";
import { enqueue } from "@/lib/offline-queue";

interface Facility {
  id: string;
  name: string;
}
interface Service {
  id: string;
  name: string;
}

const OBSERVATIONS = [
  { value: "AVAILABLE", label: "Available" },
  { value: "UNAVAILABLE", label: "Not available" },
  { value: "TEMPORARILY_BLOCKED", label: "Partially available / blocked" },
  { value: "SERVICE_PROVIDED", label: "Service provided (confirmed outcome)" },
] as const;

const SOURCES = [
  { value: "FACILITY_STAFF", label: "Facility staff" },
  { value: "DISTRICT_SUPERVISOR", label: "District supervisor" },
] as const;

export function RecordObservationDialog({
  facilities,
  services,
  onRecorded,
  onQueued,
}: {
  facilities: Facility[];
  services: Service[];
  onRecorded: (result: Awaited<ReturnType<typeof submitEvidence>>) => void;
  onQueued: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [facility, setFacility] = useState("");
  const [service, setService] = useState("");
  const [observation, setObservation] = useState<string>("AVAILABLE");
  const [source, setSource] = useState<string>("FACILITY_STAFF");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setFacility("");
    setService("");
    setObservation("AVAILABLE");
    setSource("FACILITY_STAFF");
    setNotes("");
  };

  const submit = async () => {
    if (!facility || !service) return;
    const payload = {
      facility_id: facility,
      service_id: service,
      observation,
      source,
      notes: notes.trim() || null,
    };
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      enqueue(payload);
      toast.info("Stored on this device", {
        description: "You are offline. This observation will sync automatically once you reconnect.",
        icon: <WifiOff className="size-4" />,
      });
      onQueued();
      reset();
      setOpen(false);
      return;
    }
    setSubmitting(true);
    try {
      const res = await submitEvidence({ data: payload as any });
      toast.success(
        res.duplicate
          ? "Recorded — flagged as a duplicate of an existing report."
          : `Recorded. Facility+service reliability is now ${Math.round(res.breakdown.eri * 100)}%${
              res.conflicts ? `, ${res.conflicts} conflict flagged` : ""
            }.`,
      );
      onRecorded(res);
      reset();
      setOpen(false);
    } catch (e) {
      toast.error("Could not record observation", { description: (e as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" />
          Record observation
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-1.5rem)] max-w-lg overflow-y-auto sm:w-full">
        <DialogHeader>
          <DialogTitle>Record observation</DialogTitle>
          <DialogDescription>
            Append a new report to the evidence ledger. This entry is never edited or deleted; a
            correction is a new entry.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="ro-facility">Facility</Label>
            <Select value={facility} onValueChange={setFacility}>
              <SelectTrigger id="ro-facility" className="h-11">
                <SelectValue placeholder="Select facility" />
              </SelectTrigger>
              <SelectContent>
                {facilities.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ro-service">Service</Label>
            <Select value={service} onValueChange={setService}>
              <SelectTrigger id="ro-service" className="h-11">
                <SelectValue placeholder="Select service" />
              </SelectTrigger>
              <SelectContent>
                {services.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ro-observation">Observation</Label>
              <Select value={observation} onValueChange={setObservation}>
                <SelectTrigger id="ro-observation" className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OBSERVATIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ro-source">Source</Label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger id="ro-source" className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ro-notes">Notes (optional)</Label>
            <Textarea
              id="ro-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Context that helps a supervisor interpret this report…"
              maxLength={400}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            className="h-11 w-full sm:w-auto"
            onClick={submit}
            disabled={!facility || !service || submitting}
          >
            {submitting ? "Recording…" : "Record observation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
