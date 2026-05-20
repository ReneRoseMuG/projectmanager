import type { AiAgentPlanResponse } from "@taskmanager/shared-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, Check, Play, RefreshCw, Sparkles, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { executeAiAgentActions, getAiModels, planAiAgentActions } from "../../api/ai";
import { errorMessage } from "../../hooks/errors";
import { invalidateAiAgentScopes } from "../../queries/invalidation";
import { queryKeys } from "../../queries/queryKeys";
import { Button } from "../ui/Button";
import { FormField } from "../ui/FormField";
import { Modal } from "../ui/Modal";
import { Select } from "../ui/Select";
import { useToast } from "../ui/ToastProvider";

interface AiAgentPanelProps {
  open: boolean;
  onClose: () => void;
}

export function AiAgentPanel({ open, onClose }: AiAgentPanelProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [prompt, setPrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [plan, setPlan] = useState<AiAgentPlanResponse | null>(null);

  const modelsQuery = useQuery({
    queryKey: queryKeys.ai.models(),
    queryFn: getAiModels,
    enabled: open
  });

  const modelOptions = useMemo(() => {
    const response = modelsQuery.data;
    const names = response?.models.map((model) => model.name) ?? [];
    const defaultModel = response?.defaultModel;
    return [...new Set([defaultModel, ...names].filter((item): item is string => Boolean(item)))];
  }, [modelsQuery.data]);

  useEffect(() => {
    if (!open) {
      setPlan(null);
      return;
    }
    const defaultModel = modelsQuery.data?.defaultModel;
    if (!selectedModel && defaultModel) {
      setSelectedModel(defaultModel);
    }
  }, [modelsQuery.data?.defaultModel, open, selectedModel]);

  const planMutation = useMutation({
    mutationFn: () => planAiAgentActions({ prompt, model: selectedModel || null }),
    onSuccess: (nextPlan) => {
      setPlan(nextPlan);
      if (nextPlan.status === "blocked") {
        showToast({ tone: "warn", title: "Agent braucht Klärung", message: nextPlan.blockers.join(" ") });
      }
    },
    onError: (error) => {
      showToast({ tone: "error", title: "Agent konnte nicht planen", message: errorMessage(error) });
    }
  });

  const executeMutation = useMutation({
    mutationFn: () => {
      if (!plan || plan.status !== "ready") {
        throw new Error("Kein bestätigbarer Agent-Plan vorhanden.");
      }
      return executeAiAgentActions({ actions: plan.actions });
    },
    onSuccess: async (result) => {
      await invalidateAiAgentScopes(queryClient);
      showToast({ tone: "success", title: "Agent ausgeführt", message: result.message });
      setPlan(null);
      setPrompt("");
      onClose();
    },
    onError: (error) => {
      showToast({ tone: "error", title: "Agent konnte nicht ausführen", message: errorMessage(error) });
    }
  });

  const canPlan = prompt.trim().length > 0 && !planMutation.isPending && !executeMutation.isPending;
  const canExecute = plan?.status === "ready" && plan.actions.length > 0 && !executeMutation.isPending;
  const modelStatus = modelsQuery.data?.available === false ? modelsQuery.data.message : modelsQuery.error ? errorMessage(modelsQuery.error) : null;

  return (
    <Modal open={open} title="KI-Agent" size="lg" onClose={onClose}>
      <div className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <Select label="Modell" value={selectedModel} onChange={(event) => setSelectedModel(event.target.value)}>
            {modelOptions.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </Select>
          <Button icon={<RefreshCw size={16} />} disabled={modelsQuery.isFetching} onClick={() => void modelsQuery.refetch()}>
            Aktualisieren
          </Button>
        </div>

        {modelStatus ? (
          <div className="rounded-md border border-tangerine/30 bg-tangerine/10 px-3 py-2 text-sm text-tangerine">
            {modelStatus}
          </div>
        ) : null}

        <FormField label="Auftrag">
          <textarea
            aria-label="Auftrag"
            className="min-h-28 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-steel-600 focus:ring-2 focus:ring-steel-700/10"
            value={prompt}
            onChange={(event) => {
              setPrompt(event.currentTarget.value);
              setPlan(null);
            }}
          />
        </FormField>

        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" icon={<Sparkles size={16} />} disabled={!canPlan} loading={planMutation.isPending} onClick={() => planMutation.mutate()}>
            Planen
          </Button>
          <Button variant="primary" icon={<Play size={16} />} disabled={!canExecute} loading={executeMutation.isPending} onClick={() => executeMutation.mutate()}>
            Ausführen
          </Button>
        </div>

        {plan ? (
          <section className="grid gap-3 rounded-lg border border-line bg-shell p-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-ink">
              {plan.status === "ready" ? <Check size={16} className="text-fern" /> : <XCircle size={16} className="text-tangerine" />}
              <span>{plan.message}</span>
            </div>

            {plan.blockers.length > 0 ? (
              <ul className="grid gap-1 text-sm text-tangerine">
                {plan.blockers.map((blocker) => (
                  <li key={blocker}>{blocker}</li>
                ))}
              </ul>
            ) : null}

            {plan.actions.map((action, index) => (
              <article key={`${action.type}-${index}`} className="rounded-md border border-line bg-white p-3">
                <div className="flex items-start gap-2">
                  <Bot size={16} className="mt-0.5 text-steel-700" />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-ink">{action.label}</h3>
                    <p className="mt-1 text-sm text-slate-600">{action.description}</p>
                    <pre className="mt-2 max-h-44 overflow-auto rounded-md bg-steel-900 p-3 text-xs text-white">{JSON.stringify(action.payload, null, 2)}</pre>
                  </div>
                </div>
              </article>
            ))}
          </section>
        ) : null}
      </div>
    </Modal>
  );
}
