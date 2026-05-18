<h1>UC 02/11: Projektlöschung wird systemweit korrekt verarbeitet</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-02-projekte.md">FT (02): Projekte</a></li></ul>
<h2>Akteur</h2>
<p>Administrator, Disponent</p>
<h2>Ziel</h2>
<p>Sicherstellen, dass die Löschung eines Projekts keine inkonsistenten Referenzen hinterlässt.</p>
<h2>Vorbedingungen</h2>
<ul><li>Projekt existiert.</li><li>Der Akteur ist authentifiziert.</li><li>Der Akteur besitzt Löschrechte (Disponent oder Administrator).</li><li>Dem Projekt sind keine Termine zugeordnet.</li></ul>
<h2>Ablauf</h2>
<p>1. Akteur löscht ein Projekt gemäß UC 02/08.<br>2. System entfernt das Projekt und alle abhängigen Datensätze in einer Transaktion.<br>3. System aktualisiert Projektübersichten.<br>4. Offene Detailansichten schließen sich oder wechseln in einen neutralen Zustand.</p>
<h2>Alternativen</h2>
<ul><li>Akteur nicht authentifiziert → HTTP 401.</li><li>Akteur ohne Löschrechte → HTTP 403.</li><li>Projekt besitzt Termine → HTTP 409 BUSINESS_CONFLICT, Löschung wird blockiert, keine Ansicht ändert sich.</li><li>Technischer Fehler → HTTP 500, kein Teilzustand.</li></ul>
<h2>Ergebnis</h2>
<p>Es existieren keine Referenzen auf das gelöschte Projekt.</p>
<p>Alle Sichten sind konsistent.</p>