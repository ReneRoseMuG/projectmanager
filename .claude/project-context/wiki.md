# Projekt-Kontext: Wiki — Projekt Manager

Spezifikation und Anwenderdokumentation dieses Projekts liegen im Wiki des Projekt Managers.
Die Domänenobjekte Feature und Use Case werden dafür nicht mehr verwendet.

Verfahren, Werkzeuge und Nummernvergabe: `wiki-ablage.md` im Plugin `pm-workflow-skills`.

## Wurzelseite

Alle Feature- und Use-Case-Seiten dieses Projekts hängen unter:

| Seite | ID |
|---|---|
| Lastenheft | 22 |

Vollständiger Pfad: `Wiki` (20) → `Apps` (349) → `Projekt Manager` (19) → `Lastenheft` (22).

Die Nachbarseite `MCP Server` (21) gehört ebenfalls zu diesem Projekt, ist aber kein
Ablageort für Spezifikation.

## Aufbau unterhalb der Wurzelseite

```
Lastenheft (22)
└── FT(NN): Titel                  ← Feature-Seite, sortOrder in Tausenderschritten
    └── FT(NN) – Use Cases         ← Sammelseite
        └── UC (NN/MM): Titel      ← Use-Case-Seite, sortOrder NNMM
```

Vor dem Anlegen einer neuen Feature-Seite die belegten Nummern über
`list_wiki_pages(22)` prüfen und die nächste freie Nummer verwenden. Nummern werden nicht
wiederverwendet.

Das Titelschema entspricht der in `agents.md` festgehaltenen Konvention für Features und
Use Cases — es gilt jetzt für die Wiki-Seiten.

## Besonderheit dieses Repos

Dieses Repo ist die Anwendung, die Features, Use Cases und Wiki-Seiten selbst verwaltet.
Die Entitäten `features` und `useCases` bleiben Gegenstand des Codes, solange sie nicht
ausgebaut sind; die Entscheidung, sie zu entfernen, ist ein eigener Umsetzungsauftrag.

Der Verzicht auf diese Objekte betrifft hier ausschließlich die **Projektdokumentation**:
Spezifikation und Anwenderdoku dieses Projekts entstehen im Wiki, nicht mehr als
Feature-/Use-Case-Datensätze.
