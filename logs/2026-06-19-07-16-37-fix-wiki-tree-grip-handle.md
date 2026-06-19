# Log: Wiki Tree Grip Handle + Befund TKT-136/138

**Datum:** 19.06.26  
**Uhrzeit:** 07:16:37  
**Schritt:** Fix — TKT-141 + Befund TKT-136/TKT-138  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

**TKT-141:** Die Toggle-Strip-Schaltfläche am rechten Rand der Wiki-Sidebar hatte `bg-white/[0.04]` (4 % weiß ≈ unsichtbar) und `hover:bg-white/[0.10]`. Der Strip ist `absolute` positioniert und überlagerte visuell die Sidebar-Inhalte, weil sein Hintergrund durchsichtig war. Fix: Background auf `bg-steel-800` (solide, passend zum Sidebar-Basiston `from-steel-800`) und Hover auf `hover:bg-steel-700` geändert. Damit ist der Grip klar sichtbar und verdeckt keinen Content mehr (Scrollbereich hat bereits 20px rechten Abstand für den 16px breiten Strip).

**TKT-136 (Befund):** Bereits in der Codebase gefixt — `computeIdealWidth` überspringt Kind-Knoten eingeklappter Nodes (`collapsedIds.has(node.id)`). Code trägt Kommentar `// TKT-136`. Ticket kann geschlossen werden.

**TKT-138 (Befund):** Bereits in der Codebase gefixt — `useLayoutEffect` stellt Scroll-Position via `treeScrollTop` bei Navigation wieder her. Code trägt Kommentar `// TKT-138`. Ticket kann geschlossen werden.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/wiki/WikiTree.tsx` | geändert | Toggle-Strip: `bg-white/[0.04]` → `bg-steel-800`, Hover `bg-white/[0.10]` → `bg-steel-700` |

## Probleme und Abweichungen

Keine. WikiTree-Testsuite 8/8 ✓ grün.

## Offene Punkte / Folgeaufgaben

TKT-136 und TKT-138 in der Ticket-App auf gelöst setzen.
