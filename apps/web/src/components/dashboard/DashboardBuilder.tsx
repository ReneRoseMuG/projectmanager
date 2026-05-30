import type { Dashboard, DashboardContext, DashboardDefaultScope, DashboardInput, DashboardWidgetId, DashboardWidgetLayout } from "@taskmanager/shared-types";
import { DASHBOARD_ALLOWED_WIDGETS, DEFAULT_DASHBOARD_LAYOUTS } from "@taskmanager/shared-types";
import { closestCenter, DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Save, Star, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { errorMessage } from "../../hooks/errors";
import { Button } from "../ui/Button";
import { useConfirm } from "../ui/ConfirmDialogProvider";
import { FormField } from "../ui/FormField";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { Select } from "../ui/Select";
import { useToast } from "../ui/ToastProvider";
import { dashboardContextLabels, dashboardWidgetRegistry } from "./widgetRegistry";

interface DashboardBuilderProps {
  open: boolean;
  context: DashboardContext;
  dashboard: Dashboard | null;
  canAdmin: boolean;
  saving: boolean;
  userDefaultVersion: number;
  globalDefaultVersion: number;
  onClose: () => void;
  onSaved: (dashboardId: number) => void;
  onCreate: (input: DashboardInput) => Promise<Dashboard>;
  onUpdate: (id: number, input: DashboardInput & { expectedVersion: number }) => Promise<Dashboard>;
  onDelete: (id: number) => Promise<void>;
  onSetDefault: (id: number, scopeType: DashboardDefaultScope, expectedVersion: number) => Promise<unknown>;
}

function defaultWidgets(context: DashboardContext): DashboardWidgetLayout[] {
  return DEFAULT_DASHBOARD_LAYOUTS[context].map((widget) => ({
    ...widget,
    params: "params" in widget && widget.params ? { ...widget.params } : undefined,
  }));
}

function normalizeGrid(widgets: DashboardWidgetLayout[]): DashboardWidgetLayout[] {
  let row = 0;
  let col: 0 | 1 = 0;
  return widgets.map((widget) => {
    const colSpan: 1 | 2 = widget.colSpan === 2 ? 2 : 1;
    if (colSpan === 2 && col === 1) {
      row += 1;
      col = 0;
    }
    const positioned = {
      ...widget,
      row,
      col: colSpan === 2 ? 0 : col,
      colSpan,
    };
    if (colSpan === 2 || col === 1) {
      row += 1;
      col = 0;
    } else {
      col = 1;
    }
    return positioned;
  });
}

function SortableWidgetRow({
  widget,
  onRemove,
  onColSpanChange,
  onLimitChange,
  onSortChange,
}: {
  widget: DashboardWidgetLayout;
  onRemove: () => void;
  onColSpanChange: (colSpan: 1 | 2) => void;
  onLimitChange: (limit: number) => void;
  onSortChange: (sort: "createdAt" | "updatedAt") => void;
}) {
  const sortable = useSortable({ id: widget.widgetId });
  const meta = dashboardWidgetRegistry[widget.widgetId];
  const Icon = meta.icon;
  const transform = CSS.Transform.toString(sortable.transform);

  return (
    <div
      ref={sortable.setNodeRef}
      className="grid gap-3 rounded-lg border border-line bg-white p-3 shadow-sm"
      style={{ transform, transition: sortable.transition }}
      data-testid={`dashboard-builder-widget-${widget.widgetId}`}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-steel-400 transition hover:bg-steel-100 hover:text-steel-700"
          aria-label={`${meta.label} verschieben`}
          title={`${meta.label} verschieben`}
          {...sortable.attributes}
          {...sortable.listeners}
        >
          <GripVertical size={17} />
        </button>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-steel-100 text-steel-700">
          <Icon size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{meta.label}</p>
        </div>
        <Button icon={<Trash2 size={16} />} variant="ghost" aria-label={`${meta.label} entfernen`} title={`${meta.label} entfernen`} onClick={onRemove} />
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Select label="Breite" value={widget.colSpan} onChange={(event) => onColSpanChange(Number(event.target.value) === 2 ? 2 : 1)}>
          <option value={1}>Halbe Breite</option>
          <option value={2}>Volle Breite</option>
        </Select>
        <FormField label="Limit">
          <Input
            type="number"
            min={1}
            max={50}
            value={widget.params?.limit ?? 10}
            onChange={(event) => onLimitChange(Number(event.target.value))}
          />
        </FormField>
        <Select label="Sortierung" value={widget.params?.sort ?? "updatedAt"} onChange={(event) => onSortChange(event.target.value === "createdAt" ? "createdAt" : "updatedAt")}>
          <option value="updatedAt">Zuletzt geändert</option>
          <option value="createdAt">Zuletzt erstellt</option>
        </Select>
      </div>
    </div>
  );
}

export function DashboardBuilder({
  open,
  context,
  dashboard,
  canAdmin,
  saving,
  userDefaultVersion,
  globalDefaultVersion,
  onClose,
  onSaved,
  onCreate,
  onUpdate,
  onDelete,
  onSetDefault,
}: DashboardBuilderProps) {
  const [name, setName] = useState("");
  const [isSystem, setIsSystem] = useState(false);
  const [widgets, setWidgets] = useState<DashboardWidgetLayout[]>([]);
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const canUpdateSelected = Boolean(dashboard && (!dashboard.isSystem || canAdmin));
  const availableWidgets = useMemo(
    () => DASHBOARD_ALLOWED_WIDGETS[context].filter((widgetId) => !widgets.some((widget) => widget.widgetId === widgetId)),
    [context, widgets],
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    if (dashboard) {
      setName(dashboard.isSystem && !canAdmin ? `${dashboard.name} Kopie` : dashboard.name);
      setIsSystem(canAdmin ? dashboard.isSystem : false);
      setWidgets(normalizeGrid(dashboard.widgets.map((widget) => ({ ...widget, params: widget.params ? { ...widget.params } : undefined }))));
      return;
    }
    setName(`Mein ${dashboardContextLabels[context]}`);
    setIsSystem(false);
    setWidgets(normalizeGrid(defaultWidgets(context)));
  }, [canAdmin, context, dashboard, open]);

  const addWidget = (widgetId: DashboardWidgetId) => {
    const colSpan: 1 | 2 = context === "task" && widgetId === "taskStatusReport" ? 2 : 1;
    setWidgets((current) => normalizeGrid([...current, { widgetId, row: 0, col: 0, colSpan, params: { limit: 10, sort: "updatedAt" } }]));
  };

  const updateWidget = (widgetId: DashboardWidgetId, updater: (widget: DashboardWidgetLayout) => DashboardWidgetLayout) => {
    setWidgets((current) => normalizeGrid(current.map((widget) => (widget.widgetId === widgetId ? updater(widget) : widget))));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }
    setWidgets((current) => {
      const oldIndex = current.findIndex((widget) => widget.widgetId === active.id);
      const newIndex = current.findIndex((widget) => widget.widgetId === over.id);
      if (oldIndex < 0 || newIndex < 0) {
        return current;
      }
      return normalizeGrid(arrayMove(current, oldIndex, newIndex));
    });
  };

  const submit = async () => {
    const normalized = normalizeGrid(widgets);
    const input = {
      name: name.trim(),
      context,
      isSystem: canAdmin ? isSystem : false,
      widgets: normalized,
    };
    try {
      const saved = canUpdateSelected && dashboard ? await onUpdate(dashboard.id, { ...input, expectedVersion: dashboard.version }) : await onCreate(input);
      setWidgets(saved.widgets);
      onSaved(saved.id);
      showToast({ tone: "success", title: "Dashboard gespeichert" });
      onClose();
    } catch (builderError) {
      showToast({ tone: "error", title: "Dashboard konnte nicht gespeichert werden", message: errorMessage(builderError) });
    }
  };

  const deleteSelected = async () => {
    if (!dashboard || !canUpdateSelected) {
      return;
    }
    const approved = await confirm({
      title: "Dashboard löschen?",
      body: `Das Dashboard "${dashboard.name}" wird entfernt.`,
      severity: "danger",
      confirmLabel: "Löschen",
    });
    if (!approved) {
      return;
    }
    try {
      await onDelete(dashboard.id);
      showToast({ tone: "success", title: "Dashboard gelöscht" });
      onClose();
    } catch (deleteError) {
      showToast({ tone: "error", title: "Dashboard konnte nicht gelöscht werden", message: errorMessage(deleteError) });
    }
  };

  const setDefault = async (scopeType: DashboardDefaultScope) => {
    if (!dashboard) {
      return;
    }
    try {
      await onSetDefault(dashboard.id, scopeType, scopeType === "GLOBAL" ? globalDefaultVersion : userDefaultVersion);
      showToast({ tone: "success", title: scopeType === "GLOBAL" ? "Globaler Standard gesetzt" : "Persönlicher Standard gesetzt" });
    } catch (defaultError) {
      showToast({ tone: "error", title: "Standard konnte nicht gesetzt werden", message: errorMessage(defaultError) });
    }
  };

  return (
    <Modal open={open} title="Dashboard-Editor" size="xl" onClose={onClose}>
      <div className="grid gap-5">
        <div className="grid gap-4 md:grid-cols-[1fr_auto]">
          <FormField label="Name" required>
            <Input value={name} onChange={(event) => setName(event.target.value)} required />
          </FormField>
          {canAdmin ? (
            <label className="mt-7 flex h-11 items-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-medium text-ink">
              <input type="checkbox" checked={isSystem} onChange={(event) => setIsSystem(event.target.checked)} />
              System-Dashboard
            </label>
          ) : null}
        </div>

        <section className="grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-ink">Widgets</h3>
            <div className="flex flex-wrap gap-2">
              {availableWidgets.map((widgetId) => {
                const meta = dashboardWidgetRegistry[widgetId];
                return (
                  <Button key={widgetId} size="sm" icon={<Plus size={15} />} onClick={() => addWidget(widgetId)}>
                    {meta.label}
                  </Button>
                );
              })}
            </div>
          </div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={widgets.map((widget) => widget.widgetId)} strategy={verticalListSortingStrategy}>
              <div className="grid gap-3" data-testid="dashboard-builder-list">
                {widgets.map((widget) => (
                  <SortableWidgetRow
                    key={widget.widgetId}
                    widget={widget}
                    onRemove={() => setWidgets((current) => normalizeGrid(current.filter((item) => item.widgetId !== widget.widgetId)))}
                    onColSpanChange={(colSpan) => updateWidget(widget.widgetId, (item) => ({ ...item, colSpan }))}
                    onLimitChange={(limit) => updateWidget(widget.widgetId, (item) => ({ ...item, params: { ...item.params, limit: Number.isFinite(limit) ? Math.min(50, Math.max(1, limit)) : 10 } }))}
                    onSortChange={(sort) => updateWidget(widget.widgetId, (item) => ({ ...item, params: { ...item.params, sort } }))}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <div className="flex flex-wrap gap-2">
            {dashboard ? (
              <Button icon={<Star size={16} />} onClick={() => void setDefault("USER")}>
                Als mein Standard
              </Button>
            ) : null}
            {dashboard && canAdmin && dashboard.isSystem ? (
              <Button icon={<Star size={16} />} onClick={() => void setDefault("GLOBAL")}>
                Als globaler Standard
              </Button>
            ) : null}
            {dashboard && canUpdateSelected ? (
              <Button className="text-crimson hover:bg-crimson/10" icon={<Trash2 size={16} />} variant="ghost" onClick={() => void deleteSelected()}>
                Löschen
              </Button>
            ) : null}
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button onClick={onClose}>Abbrechen</Button>
            <Button variant="primary" icon={<Save size={16} />} loading={saving} disabled={!name.trim() || widgets.length === 0} onClick={() => void submit()}>
              {canUpdateSelected ? "Speichern" : "Als eigenes Dashboard speichern"}
            </Button>
          </div>
        </footer>
      </div>
    </Modal>
  );
}
