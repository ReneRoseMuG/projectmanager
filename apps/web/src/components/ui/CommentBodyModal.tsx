import { MessageSquare } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { FormModal } from "./FormModal";
import { RichTextInlineField, type RichTextValueFormat } from "./rich-text-inline-field";
import { Section } from "./Section";

export function commentTextFromHtml(value: string) {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();
}

export function commentValueFormat(value: string): RichTextValueFormat {
  return value.trim().startsWith("<") ? "html" : "markdown";
}

interface CommentBodyModalProps {
  open: boolean;
  title: string;
  breadcrumb: string[];
  initialBody: string;
  placeholder?: string;
  submitLabel: string;
  testIdPrefix: string;
  onSave: (body: string) => void | Promise<unknown>;
  onClose: () => void;
}

export function CommentBodyModal({
  open,
  title,
  breadcrumb,
  initialBody,
  placeholder = "Kommentar schreiben",
  submitLabel,
  testIdPrefix,
  onSave,
  onClose,
}: CommentBodyModalProps) {
  const [content, setContent] = useState("");
  const [contentFormat, setContentFormat] = useState<RichTextValueFormat>("html");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setSaving(false);
      return;
    }
    setContent(initialBody);
    setContentFormat(initialBody ? commentValueFormat(initialBody) : "html");
  }, [initialBody, open]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!commentTextFromHtml(content)) {
      return;
    }

    setSaving(true);
    try {
      const result = onSave(content);
      if (result && typeof (result as Promise<unknown>).then === "function") {
        await result;
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormModal
      open={open}
      title={title}
      icon={<MessageSquare size={20} />}
      breadcrumb={breadcrumb}
      onSubmit={submit}
      onClose={onClose}
      saving={saving}
      submitLabel={submitLabel}
      cancelLabel="Schließen"
      modalZIndexClassName="z-[60]"
    >
      <Section>
        <RichTextInlineField
          value={content}
          valueFormat={contentFormat}
          placeholder={placeholder}
          commitOnBlur={false}
          liveUpdate
          minRows={10}
          testIdPrefix={testIdPrefix}
          onChange={(value) => {
            setContent(value);
            setContentFormat("html");
          }}
        />
      </Section>
    </FormModal>
  );
}
