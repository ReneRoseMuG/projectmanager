import { ArrowLeft, ArrowRight, Check, SkipForward } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { StatusCascadeObjectType, StatusCascadeSelection, StatusCascadeStep } from "../../utils/statusCascade";
import { Button } from "./Button";
import { Modal } from "./Modal";

interface StatusCascadeDialogProps {
  open: boolean;
  parentLabel: string;
  parentTitle: string;
  targetStatusLabel: string;
  steps: StatusCascadeStep[];
  applying?: boolean;
  onApply: (selection: StatusCascadeSelection) => void | Promise<void>;
  onCancel: () => void;
}

function initialSelection(steps: StatusCascadeStep[]): StatusCascadeSelection {
  return {
    milestone: steps.find((step) => step.type === "milestone")?.items.map((item) => item.id) ?? [],
    task: steps.find((step) => step.type === "task")?.items.map((item) => item.id) ?? [],
    ticket: steps.find((step) => step.type === "ticket")?.items.map((item) => item.id) ?? [],
  };
}

function selectionCount(selection: StatusCascadeSelection): number {
  return selection.milestone.length + selection.task.length + selection.ticket.length;
}

export function StatusCascadeDialog({
  open,
  parentLabel,
  parentTitle,
  targetStatusLabel,
  steps,
  applying = false,
  onApply,
  onCancel,
}: StatusCascadeDialogProps) {
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [selectedIds, setSelectedIds] = useState<StatusCascadeSelection>(() => initialSelection(steps));
  const activeStep = steps[activeStepIndex];
  const isLastStep = activeStepIndex === steps.length - 1;
  const selectedTotal = useMemo(() => selectionCount(selectedIds), [selectedIds]);

  useEffect(() => {
    if (!open) {
      return;
    }
    setActiveStepIndex(0);
    setSelectedIds(initialSelection(steps));
  }, [open, steps]);

  if (!open || !activeStep) {
    return null;
  }

  const activeSelectedIds = new Set(selectedIds[activeStep.type]);

  const toggleItem = (type: StatusCascadeObjectType, itemId: number) => {
    setSelectedIds((current) => {
      const nextForType = new Set(current[type]);
      if (nextForType.has(itemId)) {
        nextForType.delete(itemId);
      } else {
        nextForType.add(itemId);
      }
      return {
        ...current,
        [type]: Array.from(nextForType),
      };
    });
  };

  const skipStep = () => {
    setSelectedIds((current) => ({ ...current, [activeStep.type]: [] }));
    if (!isLastStep) {
      setActiveStepIndex((current) => current + 1);
    }
  };

  return (
    <Modal open={open} title="Status für Unterobjekte übernehmen" size="lg" bodyClassName="p-0" onClose={onCancel}>
      <div className="grid gap-5 p-5">
        <div className="rounded-lg border border-line bg-shell p-4 text-sm text-steel-600">
          <p>
            {parentLabel} <span className="font-semibold text-ink">{parentTitle}</span> wurde auf{" "}
            <span className="font-semibold text-ink">{targetStatusLabel}</span> gesetzt.
          </p>
          <p className="mt-1">Wähle aus, welche direkten Unterobjekte denselben Status erhalten sollen.</p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-steel-400">
              Schritt {activeStepIndex + 1} von {steps.length}
            </p>
            <h3 className="text-lg font-semibold text-ink">{activeStep.title}</h3>
          </div>
          <span className="rounded-md border border-line bg-white px-3 py-1 text-xs font-medium text-steel-600">
            {selectedTotal} ausgewählt
          </span>
        </div>

        <div className="grid max-h-[42vh] gap-2 overflow-auto pr-1">
          {activeStep.items.map((item) => (
            <label
              key={`${activeStep.type}-${item.id}`}
              className="flex items-start gap-3 rounded-lg border border-line bg-white p-3 text-sm shadow-sm transition hover:border-steel-300"
            >
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 accent-steel-700"
                checked={activeSelectedIds.has(item.id)}
                disabled={applying}
                onChange={() => toggleItem(activeStep.type, item.id)}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-ink">{item.title}</span>
                <span className="mt-1 block text-xs text-steel-500">Aktueller Status: {item.statusLabel}</span>
              </span>
            </label>
          ))}
        </div>

        <footer className="flex flex-wrap justify-between gap-2 border-t border-line pt-4">
          <div className="flex gap-2">
            <Button icon={<ArrowLeft size={16} />} disabled={activeStepIndex === 0 || applying} onClick={() => setActiveStepIndex((current) => current - 1)}>
              Zurück
            </Button>
            <Button icon={<SkipForward size={16} />} disabled={applying} onClick={skipStep}>
              Überspringen
            </Button>
          </div>
          <div className="flex gap-2">
            <Button disabled={applying} onClick={onCancel}>
              Abbrechen
            </Button>
            {!isLastStep ? (
              <Button variant="primary" icon={<ArrowRight size={16} />} disabled={applying} onClick={() => setActiveStepIndex((current) => current + 1)}>
                Weiter
              </Button>
            ) : (
              <Button variant="primary" icon={<Check size={16} />} loading={applying} onClick={() => void onApply(selectedIds)}>
                Änderungen übernehmen
              </Button>
            )}
          </div>
        </footer>
      </div>
    </Modal>
  );
}
