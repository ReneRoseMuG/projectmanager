# Log: Design-Leitfaden §8.25/§8.26 auf Drag-&-Drop-Zuweisung nachgezogen

**Datum:** 08.07.26  
**Uhrzeit:** 10:25:44  
**Schritt:** Doku — Leitfaden-Pflege nach dem DMS-Umbau (Freigabe durch Nutzer erteilt)  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Nach dem Umbau der Dokument-Manager-Zuweisung (siehe `2026-07-08-10-19-51-feature-dms-dnd-zuweisung.md`) wurde `docs/design-leitfaden.md` über den Skill `leitfaden-pflege` geprüft und nach ausdrücklicher Freigabe ergänzt. Der Skill schreibt nicht selbstständig; die Aufnahme erfolgte erst auf Zuruf.

Die Prüfung ergab **zwei** Befunde, nicht nur den erwarteten einen:

**Differenz (§8.26 DMS-Kachelansicht).** Der Leitfaden beschrieb den alten Doppelmodus wörtlich als Regel: „bei aktiver Auswahl weist ein Klick auf einen Sammlungs-/Kategorie-Eintrag der linken Navigation die Markierten zu (Doppelmodus — sonst filtert der Klick)". Genau dieses Verhalten wurde entfernt. Der Abschnitt beschrieb also aktiv falsches Sollverhalten und wurde ersetzt.

**Lücke (§8.25 DocumentSidePanel).** Entgegen meiner ersten Einschätzung im Abschlussbericht legte §8.25 **gar keine** Breitenregel fest — dort standen nur Optik, Collapse-Toggle und Platzierung. Es war also keine Differenz, sondern eine Lücke. Ergänzt wurden Breite, panel-interne Listen-Scrollbereiche und Ablageziele.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `docs/design-leitfaden.md` | geändert | §8.25: Breitenregel (rechts Zieh-Griff / links inhaltsgesteuert, kein `truncate`), Scrollbereiche je Zuordnungsliste, Ablageziele, Doppelmodus-Verbot. §8.26: Interaktion um Ziehschwelle ergänzt, Doppelmodus-Bullet durch Drag-&-Drop-Regel ersetzt, Toolbar-Aufteilung ergänzt |
| `logs/README.md` | geändert | Index-Eintrag |

## Probleme und Abweichungen

Der Abschlussbericht des vorangegangenen Auftrags behauptete, §8.25 beschreibe „die linke Spalte mit fester responsiver Breite". Das war **falsch** — der Abschnitt traf zur Breite gar keine Aussage. Beim tatsächlichen Lesen des Abschnitts korrigiert; die Klassifizierung wurde von „Differenz" auf „Lücke" geändert. Zugleich wurde die *echte* Differenz erst dabei sichtbar: §8.26 schrieb den Doppelmodus fest.

Ein `grep` über `docs/` bestätigt, dass danach keine Beschreibung des alten Doppelmodus mehr im Leitfaden steht.

Es wurde **kein Code** geändert und kein weiterer Leitfaden angefasst. `docs/architektur-leitfaden.md` ist nicht betroffen: Der Umbau blieb rein im Frontend, ohne Schicht-, Datenmodell- oder Contract-Änderung.

## Offene Punkte / Folgeaufgaben

- Kommt Etappe 2 (Mehrfachfilter für Kategorien und Tags, Tags als dritter Abschnitt der linken Spalte), sind §8.25 und §8.26 erneut zu prüfen — dann zusätzlich `docs/architektur-leitfaden.md`, weil der Filter-Contract über Web-API, Route und Service wächst.
- Die übrigen offenen Punkte des Feature-Logs bleiben unverändert bestehen (keine visuelle Browser-Prüfung, keine E2E-Abdeckung für `/documents`, kein Rückgängig nach einem Drop, In-Memory-Filterung der Bibliotheksliste).
