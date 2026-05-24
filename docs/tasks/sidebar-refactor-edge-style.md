# Sidebar Refactor — Spec

Referenz-Mockup: `Sidebar Mockup.html` (zeigt das Zielverhalten 1:1, inkl. CSS unter `<style>`).

---

## Struktur

1. **Header oben:** Logo-Block links (Custom-SVG-Mark im outlined Frame + Wordmark „Projekt Manager" + kleines Meta-Label „Lokal · v{version}"), Einklapp-Button (`lucide:panel-left-close`) rechts. Kein zentrierter „PM"-Tile mehr, kein Refresh-Icon im Header.
2. **Sektionen** in dieser Reihenfolge: Start · Projekt Management · Projekt Dokumentation · Information · Einstellungen.
3. **Suchleiste** sitzt zwischen dem Section-Label „Einstellungen" und dem Eintrag „Administration" (nicht mehr im Header).
4. **Bottom-Block:** User-Avatar + Name + Rolle + `lucide:log-out` Icon-Button. Durch eine 1px-Linie und einen dezenten Schatten-Gradient vom Rest getrennt.

---

## Schaltflächen (Stil „edge")

- Eine Zeile pro Eintrag — kein separater Sprung-Button daneben.
- Höhe 36 px, Padding `0 12px 0 16px`, Icon (16 px) + Label (13.5 px, weight 500).
- Linker Akzentbalken (2 px breit, abgerundet) als Aktiv-Indikator: transparent → bei Hover `rgba(255,255,255,0.18)` → Aktiv `linear-gradient(180deg,#fff,#BACDE3)` mit weichem Glow.
- Hover-Hintergrund: `rgba(255,255,255,0.06)`. Aktiv: `rgba(255,255,255,0.08)` + `font-weight: 600` + Text in `#fff`.

---

## Externer-Tab-Affordanz („always" sichtbar)

- `lucide:external-link` (13 px) flush am rechten Zeilenende.
- Default-Opacity `0.55`, Farbe `rgba(255,255,255,0.45)`. Hover: voll sichtbar, Hintergrund `rgba(255,255,255,0.10)`.
- Click auf das Icon = neuer Tab. Click auf die Zeile = normale Navigation. Event-Propagation muss am Icon gestoppt werden.

---

## Server Status (Sonderfall)

- Statt rechtem Sprung-Icon einen 6 px Status-Dot in der jeweiligen Statusfarbe (`offline` → `--color-crimson`, mit weichem Glow). Unter dem Label eine kleine Meta-Zeile (z. B. „offline").

---

## Farben & Hintergrund

- Sidebar-Background: `linear-gradient(180deg, var(--color-steel-700) 0%, var(--color-steel-800) 70%, #142B4A 100%)` plus radiale Highlights (siehe `.sb::before` im Mockup).
- Section-Label: 10 px, weight 700, uppercase, letter-spacing 0.14em, color `rgba(255,255,255,0.38)`.

---

## Breite & Verhalten

- Fixe Breite 272 px (collapsed-Verhalten unverändert lassen, falls schon implementiert).
- Aktiver Eintrag wird aus dem Router abgeleitet (`location.pathname`).

---

## CSS-Referenz

Folgende Selektoren aus `Sidebar Mockup.html` können direkt übernommen werden:

- `.style-edge`
- `.sb-header`
- `.logo-mark`
- `.sb-search`
- `.sb-user`
- `.nav-row`
