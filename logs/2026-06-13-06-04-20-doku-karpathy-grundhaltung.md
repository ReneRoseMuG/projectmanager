# Log: Karpathy-Grundhaltung in Regeln und Gate-Skills

**Datum:** 13.06.26  
**Uhrzeit:** 06:04:20  
**Schritt:** Doku — Verhaltensregeln (Karpathy) in agents.md und Skill-System eingebaut  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die aus Andrej Karpathys Beobachtungen zu typischen LLM-Coding-Fehlern abgeleiteten Verhaltensregeln (reflektierter arbeiten, Scope-Disziplin, kein Over-Engineering, zielgetriebene Ausführung) wurden in die Repo-Governance eingearbeitet. Gewählter Weg nach Nutzerentscheid: Einweben in die bestehenden Gate-Skills statt eines eigenständigen Skills, um Doppelpflege und Drift zu vermeiden.

- `agents.md` erhält einen neuen, **unnummerierten** Abschnitt „Grundhaltung für Code-Aufgaben" direkt vor §0. Die Nummerierung 0–16 und alle Querverweise bleiben unangetastet.
- Skill `code-discipline`: Prinzip 4 um Stil-Übernahme und Tote-Code-Regel erweitert; neues Prinzip 5 „Einfachheit zuerst — kein Over-Engineering"; bisherige Preservation-Checklist zu Prinzip 6 umnummeriert; neuer Checklist-Block „Scope & Einfachheit".
- Skill `planungsleitplanken`: Pflichtablauf um „mehrere Interpretationen offenlegen / einfacheren Weg vorschlagen" (Punkt 6) und „beobachtbare Erfolgskriterien vorab festlegen" (neuer Punkt 7) erweitert; je eine Pflichtfrage und ein Checklist-Haken ergänzt.
- Beide Skill-Baupläne unter `docs/skill-documentation/` wurden konsistent nachgezogen.

Bestehende Inhalte wurden ausschließlich ergänzt, nicht ersetzt. Die Grundhaltung verweist auf vorhandene Mechanismen (§0, §2, §3, §4.2, §4.5, §13.4, Gate-Skills) statt sie zu duplizieren; bei Widerspruch hat die strengere Projektregel Vorrang. Der Scheinkonflikt „bei Unklarheit fragen" (Karpathy) gegen §4.5 „Weitermachen ist Pflicht" wurde durch Phasentrennung aufgelöst: Klärung vor der Umsetzung, Weiterarbeit bei Teilblockern während der Umsetzung.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `agents.md` | geändert | Neuer Abschnitt „Grundhaltung für Code-Aufgaben" vor §0 |
| `.claude/skills/code-discipline/SKILL.md` | geändert | Prinzip 4 erweitert, Prinzip 5 Einfachheit neu, Prinzip 6, Checklist-Block |
| `docs/skill-documentation/code-discipline.md` | geändert | Bauplan synchron nachgezogen inkl. Zusammenfassungstabelle |
| `.claude/skills/planungsleitplanken/SKILL.md` | geändert | Interpretationen + Erfolgskriterien in Ablauf, Pflichtfragen, Checkliste |
| `docs/skill-documentation/planungsleitplanken.md` | geändert | Bauplan synchron nachgezogen |

## Probleme und Abweichungen

Die Gate-Skills tragen den Hinweis „Quelle (Ebene 1): Skill Library … dort zuerst ändern, dann hier nachziehen". Diese externe Library liegt nicht im Repo; mitgezogen wurde nur der repo-interne Bauplan (Ebene 2). Ein Nachzug der externen Ebene-1-Library liegt außerhalb des Repo-Zugriffs und muss bei Bedarf separat erfolgen.

## Offene Punkte / Folgeaufgaben

Keine. Ein eigenständiger Skill `karpathy-guidelines` wurde nach Nutzerentscheid bewusst nicht angelegt.
