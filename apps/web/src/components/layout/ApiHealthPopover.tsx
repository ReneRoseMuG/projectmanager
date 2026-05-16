import { Activity, RotateCcw } from "lucide-react";
import { Button } from "../ui/Button";

interface ApiHealthPopoverProps {
  online: boolean;
  latencyMs: number | null;
  onRefetch: () => Promise<void>;
}

export function ApiHealthPopover({ online, latencyMs, onRefetch }: ApiHealthPopoverProps) {
  const slow = online && latencyMs !== null && latencyMs > 250;
  const label = online ? (slow ? "slow" : "online") : "offline";

  return (
    <div className="absolute right-12 top-12 z-40 w-72 rounded-[18px] border border-line bg-white p-4 shadow-panel">
      <div className="flex items-start gap-3">
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${online ? "bg-fern/10 text-fern" : "bg-crimson/10 text-crimson"}`}>
          <Activity size={18} />
        </span>
        <div>
          <p className="font-bold text-ink">API {label}</p>
          <p className="mt-1 text-xs text-slate-500">Endpoint http://localhost:3001</p>
          <p className="mt-1 text-xs text-slate-500">Latenz {latencyMs ?? "-"} ms · letzter Sync gerade eben</p>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <Button icon={<RotateCcw size={15} />} onClick={() => void onRefetch()}>
          Erneut prüfen
        </Button>
        <Button variant="ghost" onClick={() => console.info("API health", { online, latencyMs })}>
          Detail-Log
        </Button>
      </div>
    </div>
  );
}
