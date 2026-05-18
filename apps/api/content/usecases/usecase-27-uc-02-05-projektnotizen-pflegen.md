<h1>UC 02/05: Projektnotizen pflegen</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-02-projekte.md">FT (02): Projekte</a></li></ul>
<h2>Akteur</h2>
<p>Administrator, Disponent</p>
<h2>Ziel</h2>
<p>Projektbezogene Notizen anlegen oder bearbeiten, um projektspezifische Informationen zu dokumentieren.</p>
<h2>Vorbedingungen</h2>
<ul><li>Das Projekt existiert.</li><li>Der Akteur ist authentifiziert.</li><li>Der Akteur besitzt Schreibrechte (Disponent oder Administrator).</li></ul>
<h2>Ablauf</h2>
<h3>Ablauf — Notiz anlegen</h3>
<p>1. Der Akteur öffnet das Projekt und navigiert zum Bereich „Notizen&quot;.<br>2. Der Akteur wählt „Notiz hinzufügen&quot;.<br>3. Das System öffnet einen Richtext-Editor. Optional werden aktive Notizvorlagen zur Auswahl angezeigt.<br>4. Wählt der Akteur eine Vorlage, übernimmt das System Titel und Inhalt. Besitzt die Vorlage eine Kennzeichnungsfarbe (<code>color</code>), wird diese einmalig übernommen.<br>5. Der Akteur erfasst oder ändert Titel (Pflicht) und Beschreibung (Pflicht).<br>6. Das System validiert Pflichtfelder, legt die Notiz mit <code>is_pinned = false</code> an und verknüpft sie mit dem Projekt.<br>7. Das System aktualisiert die Notizliste gemäß Sortierlogik (angepinnte zuerst, dann <code>updated_at</code> absteigend).</p>
<h3>Ablauf — Notiz bearbeiten</h3>
<p>1. Der Akteur öffnet eine bestehende Notiz aus der Notizliste des Projekts.<br>2. Das System lädt die Notizdaten einschließlich Versionsmerkmal.<br>3. Der Akteur ändert Titel und/oder Beschreibung.<br>4. Das System prüft Versionsmerkmal serverseitig. Bei Übereinstimmung speichert es die Änderungen und erhöht das Versionsmerkmal.</p>
<h2>Alternativen</h2>
<ul><li>Projekt nicht vorhanden → HTTP 404.</li><li>Akteur nicht authentifiziert → HTTP 401.</li><li>Akteur ohne Schreibrechte → HTTP 403.</li><li>Pflichtfelder (Titel oder Beschreibung) fehlen → Validierungsfehler, keine Persistenz.</li><li>Versionskonflikt bei Bearbeitung → HTTP 409 VERSION_CONFLICT, Akteur muss neu laden.</li><li>Abbruch → keine Änderung wird gespeichert.</li><li>Technischer Fehler → HTTP 500.</li></ul>
<h2>Ergebnis</h2>
<p>Notizen sind dem Projekt eindeutig zugeordnet und in der Notizliste sichtbar. Bestehende Beziehungen zu Kunde, Tags und Terminen bleiben unverändert. Vollständige Notiz-Regeln (Pinning, Vorlagen, <code>color</code>) gemäß FT (13).</p>