import { useMutation } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { assistAiText } from "../../api/ai";
import { errorMessage } from "../../hooks/errors";
import { Button } from "../ui/Button";
import { FormField } from "../ui/FormField";
import { Modal } from "../ui/Modal";
import { useToast } from "../ui/ToastProvider";

interface AiFieldEditDialogProps {
  open: boolean;
  currentHtml: string;
  onApply: (html: string) => void;
  onClose: () => void;
}

const emptyHtmlContext = "<p></p>";

export function AiFieldEditDialog({ open, currentHtml, onApply, onClose }: AiFieldEditDialogProps) {
  const { showToast } = useToast();
  const [instruction, setInstruction] = useState("");
  const canGenerate = instruction.trim().length > 0;
  const mutation = useMutation({
    mutationFn: () =>
      assistAiText({
        html: currentHtml.trim().length > 0 ? currentHtml : emptyHtmlContext,
        operation: "rewrite",
        instruction: instruction.trim()
      }),
    onSuccess: (result) => {
      onApply(result.html);
      onClose();
    },
    onError: (error) => {
      showToast({ tone: "error", title: "Text konnte nicht generiert werden", message: errorMessage(error) });
    }
  });

  useEffect(() => {
    if (!open) {
      setInstruction("");
    }
  }, [open]);

  return (
    <Modal open={open} title="Mit KI bearbeiten" size="md" onClose={onClose}>
      <div className="grid gap-4">
        <FormField label="Anweisung">
          <textarea
            aria-label="Anweisung"
            className="min-h-32 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-steel-600 focus:ring-2 focus:ring-steel-700/10"
            placeholder='z. B. "Fasse kürzer zusammen" oder "Schreibe eine Einleitung über Login-Probleme"'
            value={instruction}
            onChange={(event) => setInstruction(event.currentTarget.value)}
          />
        </FormField>

        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Abbrechen
          </Button>
          <Button variant="primary" icon={<Sparkles size={16} />} loading={mutation.isPending} disabled={!canGenerate} onClick={() => mutation.mutate()}>
            Generieren
          </Button>
        </div>
      </div>
    </Modal>
  );
}
