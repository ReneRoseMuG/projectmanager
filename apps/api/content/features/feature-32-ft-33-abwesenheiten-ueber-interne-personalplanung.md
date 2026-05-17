# FT (33): Abwesenheiten über interne Personalplanung

## Metadaten

- Status: Abgeschlossen
- Typ: Feature

## Ziel / Zweck

Dieses Feature ermöglicht die Erfassung und Berücksichtigung von Mitarbeiter-Abwesenheiten, ohne das stillgelegte alte Abwesenheitsmodul zu reaktivieren und ohne eine allgemeine Einführung von Termintypen vorzunehmen. Abwesenheiten werden als kontrollierter Sonderfall bestehender Termine abgebildet:

- bestehender Seed-Kunde **Meisel & Gerken** mit Kundennummer `001`
- Systemtour **Abwesenheiten**
- regulärer Termin mit Startdatum und optionalem Enddatum
- genau eine Mitarbeiterzuweisung am Termin
- genau ein fachlicher Abwesenheits-Tag: **Urlaub**, **Krankheit** oder **Abwesend**

Die App nutzt weiterhin Termine als zentrale Quelle der Wahrheit. Abwesenheiten werden nicht über ein neues `appointment_type`-Konzept modelliert, sondern über einen dedizierten Mitarbeiter-Abwesenheiten-Flow.

## Fachliche Beschreibung

**Kerndefinition**

Eine Abwesenheit liegt vor, wenn ein Termin folgende Merkmale kumulativ erfüllt:

- Kunde ist der bestehende Seed-Kunde **Meisel & Gerken** mit Kundennummer `001`
- Tour ist **Abwesenheiten**
- Genau ein Mitarbeiter ist zugewiesen
- Der Termin besitzt ein gültiges Startdatum und optional ein Enddatum
- Genau ein Abwesenheits-Tag ist gesetzt: **Urlaub**, **Krankheit** oder **Abwesend**

Der Abwesenheits-Tag ist nicht optional. Er klassifiziert die Art der Abwesenheit und wird ausschließlich über dedizierte Abwesenheitsfunktionen gesetzt oder geändert. Abwesenheits-Tags sind System-Tags (`isDefault = true`) und erscheinen nicht im normalen User-Tag-Picker.

Abwesenheiten besitzen kein Projekt und fallen dadurch strukturell aus allen projektbasierten Reports heraus – ohne expliziten Filter.

**Erfassung und Pflege**

Abwesenheiten werden ausschließlich über das Mitarbeiterformular im Tab **Abwesenheiten** angelegt, bearbeitet und gelöscht. Die technischen Endpunkte liegen unter `/api/employees/:id/absence-appointments`. Der Server setzt beim Anlegen und Bearbeiten automatisch Kunde, Tour, Mitarbeiter und Tag.

Außerhalb dieses dedizierten Mitarbeiterpfads bleiben Abwesenheiten zwar lesbar, generische Terminmutationen sind dort aber gesperrt. Dadurch werden Abwesenheiten nicht versehentlich über fachlich unpassende Terminaktionen verändert.

**Systemdaten**

Folgende Systemdaten werden benötigt und zweistufig sichergestellt – über den System-Seed und zusätzlich über Lazy Ensure im Abwesenheiten-Service:

- bestehender Seed-Kunde **Meisel & Gerken** mit Kundennummer `001`
- Systemtour **Abwesenheiten** mit Farbe `#64748B`
- Systemtags **Urlaub**, **Krankheit**, **Abwesend** (`isDefault = true`)

**Darstellung im Kalender**

*Wochenkalender:* Die Tour **Abwesenheiten** wird ganz unten als passive Lane eingeblendet. Sie bietet keine Action-Elemente: kein +‑Button, kein Drag & Drop, keine Tag-Bearbeitung, keine Blockier-Aktionen, keine Notizen.

*Monatskalender:* Im Standardmodus **Terminplanung** werden Abwesenheiten ausgeblendet. Ein Toggle im Kopfbereich schaltet zwischen **Terminplanung** und **Abwesenheiten** um. Im Modus **Abwesenheiten** werden ausschließlich Abwesenheitstermine angezeigt, reguläre Termine ausgeblendet. Die kompakte Monatsdarstellung zeigt dabei den betroffenen Mitarbeiter statt des internen Systemkunden. Der Toggle-Zustand wird nicht persistiert.

*Auslastungsübersicht im Mitarbeiterformular:* Abwesenheiten werden gemeinsam mit regulären Terminen angezeigt (`absenceVisibility="include"`).

## Regeln & Randbedingungen

**R-01 Dedizierter Flow**

Abwesenheiten werden über `/api/employees/:id/absence-appointments` erzeugt und gepflegt. Der normale Termin-Flow ist nicht der primäre Erfassungsweg.

**R-02 Systemkontext automatisch setzen**

Beim Anlegen und Bearbeiten setzt der Server automatisch den bestehenden Seed-Kunden **Meisel & Gerken** mit Kundennummer `001`, die Tour **Abwesenheiten**, genau einen Mitarbeiter und genau einen Abwesenheits-Tag.

**R-03 Mitarbeiter blockieren**

Der einem Abwesenheitstermin zugewiesene Mitarbeiter gilt im Terminzeitraum als nicht verfügbar. Die bestehende Termin-Überschneidungsprüfung prüft reguläre Termine gegen Abwesenheitstermine.

Disponenten dürfen Abwesenheiten auch dann erfassen oder bearbeiten, wenn der Zeitraum bereits vor dem aktuellen Tag beginnt, solange die Abwesenheit am aktuellen Tag noch läuft oder in die Zukunft reicht. Vollständig vergangene Abwesenheiten bleiben für Disponenten schreibgeschützt. Administratoren behalten die bestehende historische Ausnahme.

Wenn beim Anlegen oder Bearbeiten einer Abwesenheit bereits reguläre Termine desselben Mitarbeiters im Zeitraum liegen, liefert der Server die betroffenen Termine zur Bestätigung zurück. Nach ausdrücklicher Bestätigung wird nur der betroffene Mitarbeiter aus diesen regulären Terminen entfernt und die Abwesenheit anschließend gespeichert. Die Termine selbst bleiben in ihrer bisherigen Tour, werden nicht auf den Parkplatz verschoben und erhalten keinen Parken-Tag. Ohne Bestätigung bleibt der Bestand unverändert.

Wenn der Mitarbeiter in einer vom Abwesenheitszeitraum betroffenen Tour-KW-Planung eingetragen ist, liefert der Server diese KW-Planungen ebenfalls zur Bestätigung zurück. Nach ausdrücklicher Bestätigung wird nur die Tour-KW-Mitarbeiterzuordnung entfernt. Ohne Bestätigung bleiben Terminzuweisungen, Tour-KW-Planungen und Abwesenheit unverändert.

**R-04 Keine Wochenplanungsübernahme**

Für die Systemtour **Abwesenheiten** darf keine automatische Mitarbeiterübernahme aus der Tour- oder Kalenderwochenplanung ausgeführt werden.

Im Tourformular wird für die Systemtour **Abwesenheiten** kein Tab **Wochenplanung** angeboten. Im Wochenkalender erhält die Abwesenheiten-Lane keine Tour-KW-Personalkarte in der Personalspalte. Abwesenheiten werden über den dedizierten Abwesenheitsflow und die passive Abwesenheitsanzeige sichtbar, nicht über reguläre Tour-KW-Mitarbeiterplanung.

Tour-KW-Sperren der Systemtour **Abwesenheiten** blockieren den dedizierten Abwesenheitsflow nicht. Abwesenheiten sind keine reguläre Tourenplanung und dürfen deshalb nicht durch Wochenplanungssperren dieser Systemtour verhindert werden.

**R-05 Tag-Wechsel kontrolliert**

Beim Wechsel der Abwesenheitsart entfernt der Server alle anderen Abwesenheits-Tags und setzt genau den neuen Tag.

**R-06 Generische Terminmutationen blockieren**

Abwesenheiten bleiben außerhalb des Mitarbeiterformulars lesbar, dürfen dort aber nicht über generische Terminpfade bearbeitet, storniert, gelöscht, umgetaggt oder anderweitig mutiert werden.