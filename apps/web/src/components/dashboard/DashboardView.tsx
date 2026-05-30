import type { Dashboard, DashboardContext, DashboardOwner } from "@taskmanager/shared-types";
import { LayoutDashboard, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { dashboardOwnerKey, useDashboards } from "../../hooks/useDashboards";
import { useHasPermission } from "../../hooks/usePermissions";
import { EmptyState } from "../ui/EmptyState";
import { PageHeader } from "../ui/PageHeader";
import { Skeleton } from "../ui/Skeleton";
import { DashboardBuilder } from "./DashboardBuilder";
import { DashboardGrid } from "./DashboardGrid";
import { DashboardPicker } from "./DashboardPicker";
import { dashboardContextLabels } from "./widgetRegistry";

interface DashboardViewProps {
  context: DashboardContext;
  owner?: DashboardOwner;
  title?: string;
  subtitle?: string;
  showHeader?: boolean;
  hideInlineHeader?: boolean;
}

interface DashboardShortcutProps {
  showHeader?: boolean;
  hideInlineHeader?: boolean;
}

function DashboardLoading() {
  return (
    <div className="grid gap-4">
      <Skeleton className="h-12 w-full" />
      <div className="grid gap-4 xl:grid-cols-2">
        <Skeleton className="h-60 w-full" />
        <Skeleton className="h-60 w-full" />
        <Skeleton className="h-72 w-full xl:col-span-2" />
      </div>
    </div>
  );
}

export function DashboardView({ context, owner, title = dashboardContextLabels[context], subtitle, showHeader = false, hideInlineHeader = false }: DashboardViewProps) {
  const dashboards = useDashboards(context);
  const canWrite = useHasPermission("dashboards", "write");
  const canAdmin = useHasPermission("dashboards", "admin");
  const [selectedDashboardId, setSelectedDashboardId] = useState<number | null>(null);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [builderDashboard, setBuilderDashboard] = useState<Dashboard | null>(null);
  const ownerKey = dashboardOwnerKey(owner);
  const selectionStorageKey = `dashboard:selected:${context}:${ownerKey}`;
  const collapsedStorageKey = `dashboard:picker:${context}:${ownerKey}`;
  const selectedDashboard = useMemo(
    () => dashboards.dashboards.find((dashboard) => dashboard.id === selectedDashboardId) ?? dashboards.dashboards.find((dashboard) => dashboard.id === dashboards.selectedDefaultId) ?? dashboards.dashboards[0] ?? null,
    [dashboards.dashboards, dashboards.selectedDefaultId, selectedDashboardId],
  );

  useEffect(() => {
    if (dashboards.loading || dashboards.dashboards.length === 0) {
      return;
    }
    if (selectedDashboardId !== null && dashboards.dashboards.some((dashboard) => dashboard.id === selectedDashboardId)) {
      return;
    }
    const storedValue = window.localStorage.getItem(selectionStorageKey);
    const storedId = storedValue ? Number(storedValue) : null;
    const storedDashboard = storedId !== null ? dashboards.dashboards.find((dashboard) => dashboard.id === storedId) : null;
    setSelectedDashboardId(storedDashboard?.id ?? dashboards.selectedDefaultId);
  }, [dashboards.dashboards, dashboards.loading, dashboards.selectedDefaultId, selectedDashboardId, selectionStorageKey]);

  useEffect(() => {
    if (selectedDashboardId !== null) {
      window.localStorage.setItem(selectionStorageKey, String(selectedDashboardId));
    }
  }, [selectedDashboardId, selectionStorageKey]);

  const openBuilder = (dashboard: Dashboard | null) => {
    setBuilderDashboard(dashboard);
    setBuilderOpen(true);
  };

  const content = dashboards.loading ? (
    <DashboardLoading />
  ) : dashboards.error ? (
    <EmptyState
      icon={<LayoutDashboard size={22} />}
      title="Dashboard konnte nicht geladen werden."
      body={dashboards.error}
      variant="tinted"
      tone="tangerine"
    />
  ) : selectedDashboard ? (
    <>
      <DashboardPicker
        dashboards={dashboards.dashboards}
        selectedDashboard={selectedDashboard}
        selectedDashboardId={selectedDashboard.id}
        canWrite={canWrite}
        collapsedStorageKey={collapsedStorageKey}
        saving={dashboards.saving}
        onChange={setSelectedDashboardId}
        onCreate={() => openBuilder(null)}
        onEdit={openBuilder}
        onSetDefault={(dashboard) => dashboards.setDefault(dashboard.id, "USER", dashboards.userDefaultVersion).then(() => undefined)}
      />
      <DashboardGrid dashboard={selectedDashboard} owner={owner} />
    </>
  ) : (
    <>
      <EmptyState
        icon={<LayoutDashboard size={22} />}
        title="Kein Dashboard vorhanden"
        body={canWrite ? "Lege ein Dashboard an, um die Übersicht zu füllen." : "Für diesen Bereich ist noch kein Dashboard freigegeben."}
        variant="tinted"
        actions={
          canWrite
            ? [
                {
                  label: "Dashboard anlegen",
                  primary: true,
                  icon: <Plus size={16} />,
                  onClick: () => openBuilder(null),
                },
              ]
            : undefined
        }
      />
    </>
  );

  return (
    <div className="grid gap-4" data-testid={`dashboard-view-${context}`}>
      {showHeader ? (
        <PageHeader
          title={title}
          subtitle={subtitle}
        />
      ) : hideInlineHeader ? null : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-ink">{title}</h2>
            {subtitle ? <p className="mt-1 text-sm text-steel-500">{subtitle}</p> : null}
          </div>
        </div>
      )}
      {content}
      <DashboardBuilder
        open={builderOpen}
        context={context}
        dashboard={builderDashboard}
        canAdmin={canAdmin}
        saving={dashboards.saving}
        userDefaultVersion={dashboards.userDefaultVersion}
        globalDefaultVersion={dashboards.globalDefaultVersion}
        onClose={() => setBuilderOpen(false)}
        onSaved={setSelectedDashboardId}
        onCreate={dashboards.createDashboard}
        onUpdate={dashboards.updateDashboard}
        onDelete={dashboards.removeDashboard}
        onSetDefault={dashboards.setDefault}
      />
    </div>
  );
}

export function GlobalDashboard({ showHeader = true }: DashboardShortcutProps = {}) {
  return <DashboardView context="global" showHeader={showHeader} />;
}

export function HomeDashboard({ showHeader = false, hideInlineHeader = false }: DashboardShortcutProps = {}) {
  return <DashboardView context="home" showHeader={showHeader} hideInlineHeader={hideInlineHeader} title="Startseiten-Dashboard" />;
}

export function ProjectDashboard({ projectId }: { projectId: number }) {
  return <DashboardView context="project" owner={{ type: "project", id: projectId }} title="Projektübersicht" hideInlineHeader />;
}

export function MilestoneDashboard({ milestoneId }: { milestoneId: number }) {
  return <DashboardView context="milestone" owner={{ type: "milestone", id: milestoneId }} title="Übersicht" hideInlineHeader />;
}

export function TaskDashboard({ taskId }: { taskId: number }) {
  return <DashboardView context="task" owner={{ type: "task", id: taskId }} title="Aufgabenübersicht" hideInlineHeader />;
}
