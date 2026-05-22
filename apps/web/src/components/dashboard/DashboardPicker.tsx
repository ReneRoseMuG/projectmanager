import type { Dashboard } from "@taskmanager/shared-types";
import { CheckCircle2 } from "lucide-react";
import { Select } from "../ui/Select";

interface DashboardPickerProps {
  dashboards: Dashboard[];
  selectedDashboardId: number | null;
  onChange: (dashboardId: number) => void;
}

export function DashboardPicker({ dashboards, selectedDashboardId, onChange }: DashboardPickerProps) {
  return (
    <div className="flex min-w-64 items-center gap-2">
      <Select
        label="Dashboard"
        value={selectedDashboardId ?? ""}
        onChange={(event) => onChange(Number(event.target.value))}
      >
        {dashboards.map((dashboard) => (
          <option key={dashboard.id} value={dashboard.id}>
            {dashboard.name}
            {dashboard.isUserDefault ? " · Mein Standard" : dashboard.isGlobalDefault ? " · Standard" : ""}
          </option>
        ))}
      </Select>
      {dashboards.some((dashboard) => dashboard.id === selectedDashboardId && (dashboard.isUserDefault || dashboard.isGlobalDefault)) ? (
        <span className="mt-5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-fern/10 text-fern" title="Aktiver Standard">
          <CheckCircle2 size={18} />
        </span>
      ) : null}
    </div>
  );
}
