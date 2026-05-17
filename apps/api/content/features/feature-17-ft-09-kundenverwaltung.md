# FT (09): Kundenverwaltung

## Metadaten

- Status: Abgeschlossen
- Typ: Feature

## Ziel / Zweck

Dieses Feature stellt die Verwaltung von Kundenstammdaten bereit, damit Termine nicht mehr mit frei erfassten Kundendaten arbeiten müssen. Termine referenzieren künftig ein Projekt und über dieses einen Kunden und übernehmen Adresse sowie Kontaktdaten daraus, um Konsistenz, Wiederverwendbarkeit und saubere Historien sicherzustellen. Einem Kunden können Notizen zugeordnet werden.

## Fachliche Beschreibung

Die Kundenverwaltung ermöglicht das Anlegen, Bearbeiten und Anzeigen von Kunden. Pro Kunde werden Stammdaten gespeichert, insbesondere **Name/Firma**, **Kundennummer**, **Adresse** und **Telefonnummer**.

Kundendaten können auch aus der Dokumentextraktion übernommen werden. Dabei gilt die Kundennummer als primärer Schlüssel zur Auflösung. Wird ein bestehender Kunde gefunden, wird er verknüpft beziehungsweise ins Formular geladen. Enthält das Dokument Stammdaten, die im bestehenden Kundensatz noch leer sind, dürfen ausschließlich diese leeren Felder nach sichtbarer Nutzerentscheidung ergänzt werden. Vorhandene Kundendaten werden nicht still überschrieben.

Ein Kunde kann beliebig viele Projekte und damit indirekt beliebig viele Termine besitzen. In der Kundendetailansicht wird eine **Projektliste** angezeigt, die alle dem Kunden zugeordneten Projekte umfasst (z. B. Aufbau, Service, Nachbesserung).

Disponenten erhalten serverseitig nur aktive Kunden und können daher nur aktive Kunden für neue Projekte auswählen. Die Verwaltung von aktiven und inaktiven Kunden (Deaktivieren, Reaktivieren) ist eine Admin-Funktion und nicht Teil dieser Dokumentation für Disponenten.

Kunden haben eine **Notizenliste** (0..n). Notizen sind freie Texteinträge, die kundenbezogene Informationen, Absprachen oder Besonderheiten dokumentieren. Jede Notiz besteht aus einem Titel und einem Inhalt. Notizen sind **kundenbezogen** und **projektunabhängig** – sie gelten für alle zum Kunden gehörenden Projekte und Termine und bleiben bestehen, unabhängig von Projektänderungen, Kundenstatusänderungen oder anderen Modifikationen. Notizen können optional in Druckausgaben oder Exportformaten mitgeführt werden. Die Verwaltungslogik für Notizen erfolgt direkt in der Kundendetailansicht über einen Richtext-Editor.

In der Kundendetailansicht können dem Kunden zusätzlich Dokumente als Anhänge zugeordnet werden. Der Disponent kann Anhänge hochladen, in einer Anhangsliste einsehen, per Vorschau öffnen und bei Bedarf herunterladen. Eine Löschfunktion für Anhänge ist nicht vorgesehen.

## Regeln & Randbedingungen

- Kundendaten (Name, Kundennummer, Adresse, Telefon) werden **zentral** am Kunden gepflegt.
- Bei Übernahme aus Doc Extract dürfen nur leere Bestandsfelder ergänzt werden, wenn der Akteur dies im Dialog bestätigt. Vorhandene Werte bleiben unverändert.
- Kunden dürfen **nicht gelöscht** werden, wenn sie in Projekten verwendet werden.
- Disponenten erhalten serverseitig nur aktive Kunden und können nur aktive Kunden für neue Projekte auswählen.
- Pflichtfelder:
    - Kundennummer (aus WAWI).
- Notizen sind optional und werden über die Relationstabelle `customer_note` mit dem Kunden verknüpft.

**Notizen an Kunden**

- Ein Kunde kann null, eine oder mehrere Notizen haben.
- Jede Notiz besitzt einen Titel und einen Inhalt (Body), beide sind Pflichtfelder.
- Notizen sind unabhängig vom Kunden; Änderungen am Kunden (Adresse, Telefon, Status) wirken sich nicht auf die Notizen aus.
- Notizen werden nicht automatisch gelöscht, wenn ein Kunde bearbeitet wird. Sie bleiben solange erhalten, bis sie explizit entfernt oder der gesamte Kunde gelöscht wird.
- Wenn ein Kunde gelöscht wird, werden auch seine zugeordneten Notizen entfernt.
- Notizen sind für alle zu einem Kunden gehörenden Projekte und Termine kontextabhängig sichtbar, sofern das jeweilige Feature dies vorsieht.
- Notizen können optional in Druckausgaben, CSV-Exporten oder anderen Exportformaten mitgeführt werden, sofern das jeweilige Feature dies vorsieht.
- Kundenanhänge sind kundenbezogen und unabhängig von Projekten; Anhänge können hinzugefügt und heruntergeladen werden, eine physische Löschung ist nicht vorgesehen.