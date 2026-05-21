# Codex-Auftrag: Quick Wins – Design-Korrekturen mit minimalem Aufwand

## Aufgabenbeschreibung

Dieser Auftrag bündelt acht kleine, voneinander unabhängige Korrekturen im Frontend.
Jede Korrektur ist für sich isoliert und verändert keine Logik, kein API-Interface und keine Datenbank.
Alle Änderungen betreffen ausschließlich `apps/web/src/`.

**Kein neuer Code-Test ist für diese Aufgabe erforderlich**, da es sich ausschließlich um
Text-, Stil- und Attribut-Änderungen handelt.

---

## Bestandsaufnahme – Ist-Zustand

Lies vor Beginn alle aufgeführten Dateien vollständig.

| Datei | Problem |
|---|---|
| `components/layout/TopBar.tsx` | API-Badge zeigt englische Texte „online", „offline", „slow" |
| `pages/LoginPage.tsx` | `text-muted` ist keine gültige Tailwind-Klasse; kein `autoFocus` auf E-Mail-Feld |
| `components/ui/ColorPicker.tsx` | Label „Custom" ist englisch |
| `components/ui/Button.tsx` | `ghost`-Variante: `hover:bg-line/50` ist auf weißem Hintergrund kaum wahrnehmbar |
| `components/projects/ProjectForm.tsx` | `RichTextInlineField` Beschreibung mit `minRows={12}` – erzeugt 12 Leerzeilen |
| `components/ui/ListBoardView.tsx` | Erstellen-Button (`+`) ist Icon-only ohne sichtbares Label |
| `components/wiki/WikiTree.tsx` | Button mit Label „Root" ist für Anwender nicht verständlich |

---

## Korrekturen im Detail

### 1. API-Badge: Englische Status-Texte übersetzen

**Datei:** `apps/web/src/components/layout/TopBar.tsx`

**Ist:**
```tsx
API {online ? (slow ? "slow" : "online") : "offline"}
```

**Soll:**
```tsx
API {online ? (slow ? "langsam" : "erreichbar") : "offline"}
```

Das Wort „offline" bleibt, da es als technischer Begriff im Deutschen gebräuchlich ist.

---

### 2. Login-Seite: `text-muted` ersetzen

**Datei:** `apps/web/src/pages/LoginPage.tsx`

**Ist:**
```tsx
<p className="mt-1 text-sm text-muted">Anmeldung</p>
```

**Soll:**
```tsx
<p className="mt-1 text-sm text-slate-500">Anmeldung</p>
```

`text-muted` ist nicht in `tailwind.config.ts` definiert und wird vom Browser ignoriert.

---

### 3. Login-Seite: `autoFocus` auf E-Mail-Feld

**Datei:** `apps/web/src/pages/LoginPage.tsx`

Das E-Mail-Input-Feld soll beim Laden der Login-Seite automatisch fokussiert sein.

**Ist:**
```tsx
<Input value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" iconLeft={<Mail size={16} />} />
```

**Soll:**
```tsx
<Input value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" autoFocus iconLeft={<Mail size={16} />} />
```

---

### 4. ColorPicker: „Custom" ins Deutsche übersetzen

**Datei:** `apps/web/src/components/ui/ColorPicker.tsx`

**Ist:**
```tsx
Custom
```

**Soll:**
```tsx
Eigene Farbe
```

---

### 5. Button `ghost`: Hover-Hintergrund sichtbarer machen

**Datei:** `apps/web/src/components/ui/Button.tsx`

**Ist:**
```tsx
ghost: "text-ink hover:bg-line/50",
```

**Soll:**
```tsx
ghost: "text-ink hover:bg-steel-100",
```

`hover:bg-steel-100` entspricht `#E8EFF5` – dezent, aber auf weißem Hintergrund klar wahrnehmbar.
`hover:bg-line/50` ergibt `rgba(213,222,233,0.5)`, das auf weißem Hintergrund nahezu unsichtbar ist.

---

### 6. Projektbeschreibung: `minRows` von 12 auf 5 reduzieren

**Datei:** `apps/web/src/components/projects/ProjectForm.tsx`

**Ist:**
```tsx
<RichTextInlineField ... minRows={12} ... />
```

**Soll:**
```tsx
<RichTextInlineField ... minRows={5} ... />
```

12 Zeilen Mindesthöhe für ein leeres Feld erzeugt unverhältnismäßig großen Leerraum.
5 Zeilen reichen für eine initiale Eingabe; das Feld wächst dynamisch mit dem Inhalt.

---

### 7. ListBoardView: Erstellen-Button mit Label versehen

**Datei:** `apps/web/src/components/ui/ListBoardView.tsx`

**Ist:**
```tsx
<Button aria-label={addLabel} title={addLabel} variant="primary" icon={<Plus size={17} />} onClick={onAdd} />
```

**Soll:**
```tsx
<Button variant="primary" icon={<Plus size={17} />} onClick={onAdd}>
  {addLabel}
</Button>
```

`addLabel` ist bereits in allen aufrufenden Komponenten korrekt gesetzt
(„Neues Projekt", „Neues Ticket", „Neues Feature", „Neu").

---

### 8. WikiTree: „Root"-Button umbenennen

**Datei:** `apps/web/src/components/wiki/WikiTree.tsx`

**Ist:**
```tsx
Root
```

**Soll:**
```tsx
Neue Seite
```

---

## Abnahmekriterien

- [ ] API-Badge zeigt „erreichbar", „langsam", „offline"
- [ ] Login-Seite: Untertitel „Anmeldung" erscheint in hellgrauem Ton
- [ ] Login-Seite: E-Mail-Feld ist beim Laden automatisch fokussiert
- [ ] ColorPicker: freie Farbeingabe ist mit „Eigene Farbe" beschriftet
- [ ] Ghost-Button-Hover ist auf weißem Hintergrund klar sichtbar
- [ ] Projektbeschreibungsfeld startet mit ca. 5 Zeilen Höhe
- [ ] Erstellen-Button in Listenansichten zeigt den Label-Text
- [ ] WikiTree-Button für neue Root-Seite lautet „Neue Seite"
- [ ] `vitest run` und `playwright test` vollständig grün

## Referenz

- `apps/web/src/components/layout/TopBar.tsx`
- `apps/web/src/pages/LoginPage.tsx`
- `apps/web/src/components/ui/ColorPicker.tsx`
- `apps/web/src/components/ui/Button.tsx`
- `apps/web/src/components/projects/ProjectForm.tsx`
- `apps/web/src/components/ui/ListBoardView.tsx`
- `apps/web/src/components/wiki/WikiTree.tsx`
