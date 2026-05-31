import type { Dashboard } from "@taskmanager/shared-types";
import { ChevronDown, ChevronUp, LayoutDashboard, Pencil, Plus, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "../ui/Button";
import { Select } from "../ui/Select";

interface DashboardPickerProps {
  dashboards: Dashboard[];
  selectedDashboard: Dashboard;
  selectedDashboardId: number | null;
  canWrite: boolean;
  collapsedStorageKey: string;
  saving?: boolean;
  onChange: (dashboardId: number) => void;
  onCreate: () => void;
  onEdit: (dashboard: Dashboard) => void;
  onSetDefault: (dashboard: Dashboard) => Promise<void>;
}

function readCollapsed(storageKey: string): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.localStorage.getItem(storageKey) === "collapsed";
}

export function DashboardPicker({
  dashboards,
  selectedDashboard,
  selectedDashboardId,
  canWrite,
  collapsedStorageKey,
  saving = false,
  onChange,
  onCreate,
  onEdit,
  onSetDefault,
}: DashboardPickerProps) {
  const [collapsed, setCollapsed] = useState(() => readCollapsed(collapsedStorageKey));

  useEffect(() => {
    setCollapsed(readCollapsed(collapsedStorageKey));
  }, [collapsedStorageKey]);

  const toggleCollapsed = () => {
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem(collapsedStorageKey, next ? "collapsed" : "expanded");
      return next;
    });
  };

  return (
    <section className="grid gap-3 rounded-lg border border-line bg-white p-4 shadow-sm" data-testid="dashboard-picker">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-64 flex-1">
          <Select
            label="Ansicht"
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
        </div>
        {canWrite ? (
          <div className="flex items-center gap-2 pb-0.5">
            <Button
              variant={selectedDashboard.isUserDefault ? "primary" : "secondary"}
              icon={<Star size={20} fill={selectedDashboard.isUserDefault ? "currentColor" : "none"} />}
              loading={saving}
              title={selectedDashboard.isUserDefault ? "Aktiver Standard" : "Als Standard setzen"}
              aria-label={selectedDashboard.isUserDefault ? "Aktiver Standard" : "Als Standard setzen"}
              onClick={() => void onSetDefault(selectedDashboard)}
            />
            <Button
              variant="secondary"
              icon={<Pencil size={20} />}
              title="Ansicht bearbeiten"
              aria-label="Ansicht bearbeiten"
              onClick={() => onEdit(selectedDashboard)}
            />
            <Button
              variant="secondary"
              icon={<Plus size={20} />}
              title="Neue Ansicht"
              aria-label="Neue Ansicht"
              onClick={onCreate}
            />
            <Button
              variant="ghost"
              icon={collapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
              title={collapsed ? "Details einblenden" : "Details ausblenden"}
              aria-label={collapsed ? "Details einblenden" : "Details ausblenden"}
              onClick={toggleCollapsed}
            />
          </div>
        ) : null}
      </div>

      {!collapsed && canWrite ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3 text-xs font-semibold text-steel-500">
          <span className="flex items-center gap-1.5 text-steel-600">
            <LayoutDashboard size={14} />
            {selectedDashboard.isSystem ? "Systemansicht" : "Eigene Ansicht"}
          </span>
          {selectedDashboard.isGlobalDefault ? <span>Globaler Standard</span> : null}
          {selectedDashboard.isUserDefault ? <span>Mein Standard</span> : null}
          <span>Version {selectedDashboard.version}</span>
        </div>
      ) : null}
    </section>
  );
}
