// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Atom-Komponenten rendern ihre sichtbaren Inhalte, Tonalitäten und Größenklassen.
 * - Interaktive Atome geben Events und Zustände korrekt weiter.
 *
 * Fehlerfälle:
 * - Loading-Buttons dürfen nicht klickbar sein.
 * - Fehlende Avatar-Namen fallen auf ein Fragezeichen zurück.
 *
 * Ziel:
 * Die gemeinsam genutzten UI-Atome gegen Regressionsfehler bei Props, Klassen und Events absichern.
 */
import "@testing-library/jest-dom/vitest";
import { fireEvent, screen } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import { Search } from "lucide-react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Avatar } from "../../../../../apps/web/src/components/ui/Avatar";
import { Badge } from "../../../../../apps/web/src/components/ui/Badge";
import { Button } from "../../../../../apps/web/src/components/ui/Button";
import { DatePicker } from "../../../../../apps/web/src/components/ui/DatePicker";
import { FilterChips } from "../../../../../apps/web/src/components/ui/FilterChips";
import { Input } from "../../../../../apps/web/src/components/ui/Input";
import { Pill } from "../../../../../apps/web/src/components/ui/Pill";
import { Select } from "../../../../../apps/web/src/components/ui/Select";
import { Skeleton } from "../../../../../apps/web/src/components/ui/Skeleton";

afterEach(() => {
  cleanup();
});

describe("Button", () => {
  it("rendert label", () => {
    render(<Button>Speichern</Button>);

    expect(
      screen.getByRole("button", { name: "Speichern" }),
    ).toBeInTheDocument();
  });

  it('variant="primary" hat korrekte CSS-Klasse', () => {
    render(<Button variant="primary">Speichern</Button>);

    expect(screen.getByRole("button", { name: "Speichern" })).toHaveClass(
      "bg-steel-700",
    );
  });

  it('variant="ghost" hat sichtbaren Hover-Hintergrund', () => {
    render(<Button variant="ghost">Abbrechen</Button>);

    expect(screen.getByRole("button", { name: "Abbrechen" })).toHaveClass(
      "hover:bg-steel-100",
    );
  });

  it("loading=true deaktiviert den Button", () => {
    render(<Button loading>Speichern</Button>);

    expect(screen.getByRole("button", { name: "Speichern" })).toBeDisabled();
  });

  it("onClick wird aufgerufen wenn nicht disabled", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Speichern</Button>);

    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("icon-only: kein Label, quadratisch", () => {
    render(
      <Button
        aria-label="Suchen"
        icon={<Search aria-hidden="true" size={16} />}
      />,
    );

    expect(screen.getByRole("button", { name: "Suchen" })).toHaveClass(
      "h-10",
      "w-10",
      "px-0",
    );
  });

  it('size="sm" hat Höhe 32px', () => {
    render(
      <Button
        size="sm"
        aria-label="Suchen"
        icon={<Search aria-hidden="true" size={16} />}
      />,
    );

    expect(screen.getByRole("button", { name: "Suchen" })).toHaveClass(
      "h-8",
      "w-8",
    );
  });
});

describe("Input", () => {
  it("übergibt value und onChange korrekt", () => {
    const onChange = vi.fn();
    render(<Input aria-label="Titel" value="Alt" onChange={onChange} />);

    fireEvent.change(screen.getByLabelText("Titel"), {
      target: { value: "Neu" },
    });

    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("focus-Klassen werden nicht inline überschrieben", () => {
    render(<Input aria-label="Titel" />);

    expect(screen.getByLabelText("Titel")).toHaveClass(
      "focus:border-steel-600",
      "focus:ring-2",
      "focus:ring-steel-700/10",
    );
  });

  it('variant="mono" enthält font-mono', () => {
    render(<Input aria-label="Code" variant="mono" />);

    expect(screen.getByLabelText("Code")).toHaveClass("font-mono");
  });

  it("iconLeft verschiebt den Text korrekt", () => {
    render(
      <Input
        aria-label="Suche"
        iconLeft={<Search aria-hidden="true" size={16} />}
      />,
    );

    expect(screen.getByLabelText("Suche")).toHaveClass("pl-9");
  });
});

describe("DatePicker / Select", () => {
  it("DatePicker nutzt die gemeinsame Formularhöhe und volle Breite", () => {
    const { container } = render(
      <DatePicker label="Start" value="" onChange={vi.fn()} />,
    );

    expect(container.querySelector('input[type="date"]')).toHaveClass(
      "h-11",
      "w-full",
    );
  });

  it("öffnet bei datetime-local den Picker nur über den Kalender-Button, nicht per Feld-Klick", () => {
    const showPicker = vi.fn();
    Object.defineProperty(HTMLInputElement.prototype, "showPicker", {
      configurable: true,
      value: showPicker,
    });

    try {
      const { container } = render(
        <DatePicker label="Start" mode="datetime-local" value="" onChange={vi.fn()} />,
      );

      // Klick ins Feld (z. B. auf das Uhrzeit-Segment) darf den Kalender nicht
      // öffnen — sonst ist die Uhrzeit nicht bedienbar (TKT-125).
      fireEvent.click(container.querySelector('input[type="datetime-local"]')!);
      expect(showPicker).not.toHaveBeenCalled();

      // Der Kalender-Button öffnet den Picker weiterhin explizit.
      fireEvent.click(screen.getByRole("button", { name: "Start öffnen" }));
      expect(showPicker).toHaveBeenCalledTimes(1);
    } finally {
      Reflect.deleteProperty(HTMLInputElement.prototype, "showPicker");
    }
  });

  it("öffnet bei reinem Datum den Picker direkt per Feld-Klick", () => {
    const showPicker = vi.fn();
    Object.defineProperty(HTMLInputElement.prototype, "showPicker", {
      configurable: true,
      value: showPicker,
    });

    try {
      const { container } = render(
        <DatePicker label="Fällig" value="" onChange={vi.fn()} />,
      );

      fireEvent.click(container.querySelector('input[type="date"]')!);
      expect(showPicker).toHaveBeenCalled();
    } finally {
      Reflect.deleteProperty(HTMLInputElement.prototype, "showPicker");
    }
  });

  it("Select nutzt die gemeinsame Formularhöhe und volle Breite", () => {
    const { container } = render(
      <Select label="Status" value="active" onChange={vi.fn()}>
        <option value="active">Aktiv</option>
      </Select>,
    );

    expect(container.querySelector("select")).toHaveClass("h-10", "w-full");
  });
});

describe("Avatar", () => {
  it('"Max Muster" → "MM"', () => {
    render(<Avatar name="Max Muster" />);

    expect(screen.getByText("MM")).toBeInTheDocument();
  });

  it('"anna" → "A"', () => {
    render(<Avatar name="anna" />);

    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it('null → "?"', () => {
    render(<Avatar name={null} />);

    expect(screen.getByText("?")).toBeInTheDocument();
  });

  it('size="lg" hat korrekte Dimension', () => {
    render(<Avatar name="Max Muster" size="lg" />);

    expect(screen.getByText("MM")).toHaveClass("h-10", "w-10", "text-xs");
  });
});

describe("Badge / Pill / Skeleton", () => {
  it("Badge rendert jeden Tone ohne Fehler", () => {
    const tones = [
      "crimson",
      "tangerine",
      "mustard",
      "fern",
      "teal",
      "violet",
      "magenta",
      "steel",
      "mute",
    ] as const;

    tones.forEach((tone) => {
      render(<Badge tone={tone}>{tone}</Badge>);
      expect(screen.getByText(tone)).toBeInTheDocument();
    });
  });

  it("Pill rendert jeden Tone ohne Fehler", () => {
    const tones = [
      "fern",
      "tangerine",
      "violet",
      "crimson",
      "steel",
      "mustard",
    ] as const;

    tones.forEach((tone) => {
      render(<Pill tone={tone}>{tone}</Pill>);
      expect(screen.getByText(tone)).toBeInTheDocument();
    });
  });

  it('Skeleton aria-hidden="true"', () => {
    render(<Skeleton data-testid="skeleton" />);

    expect(screen.getByTestId("skeleton")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });
});

describe("FilterChips", () => {
  it("rendert Chips in Toolbar-Höhe", () => {
    render(
      <FilterChips
        value="all"
        onChange={vi.fn()}
        options={[{ value: "open", label: "Offen", count: 2 }]}
        allCount={3}
      />,
    );

    expect(screen.getByRole("button", { name: /^Alle\s*3$/ })).toHaveClass(
      "h-10",
    );
    expect(screen.getByRole("button", { name: /^Offen\s*2$/ })).toHaveClass(
      "h-10",
    );
  });
});
