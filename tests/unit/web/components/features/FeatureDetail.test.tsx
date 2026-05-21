// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - FeatureDetail bindet RichTextInlineField an Beschreibung und Inhalt.
 *
 * Fehlerfälle:
 * - Beide HTML-Felder müssen beim Speichern im Update-Payload landen.
 *
 * Ziel:
 * Die Rich-Text-Integration in der Feature-Detailansicht absichern.
 */
import "@testing-library/jest-dom/vitest";
import type { Feature } from "@taskmanager/shared-types";
import { fireEvent, screen, waitFor } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FeatureDetail } from "../../../../../apps/web/src/components/features/FeatureDetail";

vi.mock("../../../../../apps/web/src/hooks/useCatalogs", () => ({
  useCatalogs() {
    return {
      entries: [],
      workStatuses: [],
      featureStatuses: [],
      priorities: [],
      loading: false,
      error: null,
      reload: async () => undefined,
      createEntry: async () => undefined,
      updateEntry: async () => undefined,
      deleteEntry: async () => undefined
    };
  }
}));

vi.mock("../../../../../apps/web/src/components/ui/rich-text-inline-field", () => ({
  RichTextInlineField({ value, onChange, placeholder, testIdPrefix }: { value: string | null | undefined; onChange: (value: string) => void; placeholder?: string; testIdPrefix?: string }) {
    return <textarea aria-label={placeholder ?? "Rich Text"} data-testid={testIdPrefix ? `${testIdPrefix}-view` : undefined} value={value ?? ""} onChange={(event) => onChange(event.currentTarget.value)} />;
  }
}));

const feature: Feature = {
  id: 10,
  title: "Feature Alpha",
  slug: "feature-alpha",
  status: "active",
  description: "<p>Feature Beschreibung</p>",
  content: "<p>Feature Inhalt</p>",
  contentPath: null,
  sortOrder: 1,
  useCaseCount: 0,
  version: 3,
  createdAt: "2026-05-19T08:00:00.000Z",
  updatedAt: "2026-05-19T09:00:00.000Z"
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("FeatureDetail", () => {
  it("bindet RichTextInlineField an Kurzbeschreibung und Inhalt", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<FeatureDetail feature={feature} onSave={onSave} onDelete={vi.fn()} />);

    expect(screen.getByTestId("feature-detail-description-view")).toHaveValue(feature.description);
    expect(screen.getByTestId("feature-detail-content-view")).toHaveValue(feature.content);
    fireEvent.change(screen.getByTestId("feature-detail-description-view"), { target: { value: "<p>Detail Beschreibung</p>" } });
    fireEvent.change(screen.getByTestId("feature-detail-content-view"), { target: { value: "<p>Detail Inhalt</p>" } });
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith(
        feature.id,
        expect.objectContaining({
          description: "<p>Detail Beschreibung</p>",
          content: "<p>Detail Inhalt</p>",
          expectedVersion: feature.version
        })
      )
    );
  });
});
