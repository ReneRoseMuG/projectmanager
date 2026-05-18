# Design-System Projekt Manager

Stand: 17.05.26

## Grundlage

Das Frontend nutzt Tailwind-Tokens aus der bestehenden Farb- und Schattenbasis. Wiederkehrende UI-Flächen sollen über gemeinsame Komponenten gebaut werden, nicht über lokale `cardClass`-Konstanten oder kopierte Status-Records.

## Atome

| Komponente | Zweck |
|---|---|
| `Button` | Primäre, sekundäre, Ghost- und Danger-Aktionen mit Icon-Slot |
| `Input` | Texteingaben mit optionalem Icon und Mono-Variante |
| `Badge` | Kleine Metadaten-Labels, Tags und Prioritätsanzeigen |
| `Pill` | Statusanzeigen mit Tone-Varianten |
| `Avatar` | Initialen-Avatar |
| `Divider` | Trennlinie in Sections und Modal-Inhalten |

## Moleküle

| Komponente | Zweck |
|---|---|
| `SegmentedControl` | Kompakte Status- oder Prioritätsauswahl |
| `RadioList` | Vertikale Auswahl mit aktivem Check-Icon |
| `SectionHeader` | Einheitliche Überschriften in Sections |
| `ProgressBar` | Fortschritt in Prozent |
| `ColorPicker` | Farbauswahl mit Swatches und Custom-Color |

## Organisms und Templates

| Komponente | Zweck |
|---|---|
| `Section` | Standardisierte Inhaltsfläche mit optionalem Titel |
| `FormField` | Label, Pflichtmarkierung, Hint/Error und Control |
| `FormModal` | Modal-Formular mit Header, Scrollbereich und Footer |
| `DetailModal` | Detaildialog mit Header, Tabs, Content und Footer |
| `TabBar` | Horizontale Tabs mit optionalen Counts |
| `ItemCard` | Gemeinsame Karte für Domain-Objekte |
| `ItemRow` | Gemeinsame Listenzeile für Domain-Objekte |
| `ListBoardView` | Suche, Filter, Listen-/Board-Toggle und Plus-Aktion |
| `RelationPanel` | Auswahl und Speichern von Objektbeziehungen |
| `CommentThread` | Kommentarverlauf mit RTF-Composer |
| `RichTextEditor` | TipTap-basierter Editor, speichert HTML |

## Domain-Adapter

| Adapter | Basis |
|---|---|
| `TaskListBoardView` | `ListBoardView` mit Status-Kanban |
| `FeatureListBoardView` | `ListBoardView` mit Feature-Status-Kanban |
| `ProjectListBoardView` | `ListBoardView` mit Projekt-Status-Kanban |
| `UseCaseListBoardView` | `ListBoardView` ohne Status-Gruppierung |
| `BacklogListBoardView` | `ListBoardView` ohne Status-Gruppierung |
| `FeatureRelationPanel` | `RelationPanel` für Features |
| `UseCaseRelationPanel` | `RelationPanel` für Use Cases |

## Tone-Referenz

| Tone | Einsatz |
|---|---|
| `fern` | Aktiv, erledigt, positive Aktionen |
| `tangerine` | In Arbeit, pausiert, mittlere Dringlichkeit |
| `crimson` | Löschen, Fehler, dringend, verworfen |
| `violet` | Feature-/Use-Case-Kontext, abgeschlossen |
| `mustard` | Entwurf oder mittlere Priorität |
| `teal` | Wiki- und Wissenskontext |
| `steel` | Neutral, archiviert, strukturelle UI |
| `magenta` | Akzent für Avatare und seltene Hervorhebungen |

## Schatten-Tokens

| Token | Einsatz |
|---|---|
| `shadow-panel` | Standard-Panel, Section, Popover, Toast und Modal-nahe Flächen |
| `shadow-steel` | Hero- und Headerflächen mit Steel-Verlauf |
| `shadow-soft` | dezente freie Flächen ohne starke Hierarchie |
| `shadow-card` | kompakte wiederholte Einträge, etwa Kommentare oder Subtasks |
| `shadow-steel-icon` | hervorgehobene Steel-Iconflächen in Karten und Upload-Komponenten |

## Zentrale Labels

Status- und Prioritätslabels sowie Tone-Zuordnungen liegen in `apps/web/src/utils/domainLabels.ts`. Neue Domain-Komponenten sollen diese Records importieren, statt lokale `statusLabels`, `statusTones`, `priorityLabels` oder `priorityTones` anzulegen.

## Prüfregeln

- Keine lokalen `cardClass`- oder `FormCard`-Kopien.
- Keine Imports von `CommentSection`, `FeaturePicker`, `UseCasePicker`, `ProjectFeaturePanel` oder `FeatureProjectLinksPanel`.
- Keine inline Klassen `shadow-[...]` oder `rounded-[...]` im `apps/web/src`-Baum.
- `ListBoardView` ist die Standardoberfläche für CRUD-fähige Übersichten.
- `FormModal` ist die Standardoberfläche für modale Formulare.
