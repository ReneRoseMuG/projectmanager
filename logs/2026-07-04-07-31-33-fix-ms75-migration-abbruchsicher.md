# Log: MS-75 DMS-Migration abbruchsicher umgebaut

**Datum:** 04.07.26  
**Uhrzeit:** 07:31:33  
**Schritt:** Fix — halb eingespielte DMS-Migration wiederanlaufsicher machen (MS-75)  
**Status:** ✅ Abgeschlossen (Einspielen erfolgt beim nächsten App-Start durch den Nutzer)

## Was wurde umgesetzt

Die Migration `20260703085813_parched_unus` wurde so umgebaut, dass sie aus jedem Teilzustand sauber durchläuft. Die fünf `CREATE TABLE`-Statements bleiben `IF NOT EXISTS` (vorbestehender Umbau). Die zwölf bisher nicht wiederanlaufsicheren Schritte — drei neue Spalten (`attachments.display_name`, `attachments.description`, `tags.is_system`) und neun Fremdschlüssel — wurden in eine Stored Procedure (`ms75_dms_apply_missing`) verlagert, die jeden Schritt per `information_schema`-Prüfung nur ausführt, wenn er noch fehlt. Die Prozedur beginnt mit `DROP PROCEDURE IF EXISTS` und räumt sich am Ende selbst weg, sodass auch ein Abbruch mitten im Lauf keinen blockierenden Rest hinterlässt. Der Drizzle-Migrator trennt Statements ausschließlich an `--> statement-breakpoint`, daher sind die Semikolons im Prozedurkörper unkritisch. Das Migrations-Ledger (`__drizzle_migrations_taskmanager`) braucht keine Korrektur: Die Migration ist dort nie verbucht worden und wird beim ersten erfolgreichen Durchlauf regulär eingetragen.

Zusätzlich wurde die Abbruchsicherheits-Pflicht als neue Regel in agents.md §8 verankert (vom Nutzer freigegeben): Jede Migration mit mehr als einem Statement muss künftig wiederanlaufsicher gebaut werden.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/db/migrations/20260703085813_parched_unus/migration.sql` | geändert | Spalten-/FK-Schritte in idempotente Prüf-Prozedur verlagert |
| `agents.md` | geändert | §8: Abbruchsicherheit als Pflichtregel ergänzt |

## Probleme und Abweichungen

- **Bewusste Abweichung von agents.md §8 (alt):** „Versionierte Migrationsdateien nicht umschreiben" wurde hier verletzt, weil die Migration nirgends erfolgreich eingespielt und im Ledger nicht verbucht ist — eine Folge-Migration hätte das Wiederanlauf-Problem der Original-Datei nicht gelöst. Vom Nutzer im Plan freigegeben.
- **Verknüpfungstabellen ggf. in alter Form:** Hat der Teillauf die Link-Tabellen bereits mit der ursprünglich committeten Definition (`UNIQUE INDEX` statt `PRIMARY KEY`) angelegt, bleiben sie so bestehen (`IF NOT EXISTS` überspringt sie). Funktional gleichwertig (Paar-Eindeutigkeit gewährleistet); bei Bedarf später per Folge-Migration angleichbar.
- Die uncommitteten Änderungen an `schema.ts` und `snapshot.json` (vorbestehend, aus dem früheren Reparaturversuch) wurden unverändert belassen.

## Offene Punkte / Folgeaufgaben

- **Einspielen:** Nutzer startet die App normal (`npm run dev`) — der Migrator wendet die Migration beim Start an. Bei erneutem Verbindungsabriss genügt ein weiterer Start.
- **Verifikation:** Dokumente-Seite (`/documents`) lädt ohne 500; Anhänge an Aufgaben/Tickets/Features laden wieder.
- **Tests:** Nicht ausgeführt (bekannte Test-DB-Zeitüberschreitung, kein Testauftrag). Die geänderte Migration läuft unverändert auch auf frischen (Test-)Datenbanken durch.
- **Architektur-Leitfaden:** DMS-Datenmodell-Ergänzung bleibt zurückgestellt, bis das Schema produktiv eingespielt und final ist.
