<h1>UC 19/05: Attachment-Upload validieren (Größe / Typ)</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-19-attachments.md">FT (19): Attachments</a></li></ul>
<h2>Akteur</h2>
<p>System</p>
<h2>Ziel</h2>
<p>Sicherstellen, dass ausschließlich zulässige Dateien gespeichert werden.</p>
<h2>Vorbedingungen</h2>
<ul><li>Eine Datei wurde im Rahmen eines Upload-Vorgangs übermittelt.</li></ul>
<h2>Ablauf</h2>
<p>1. Das System liest die übermittelte Dateigröße.<br>2. Das System vergleicht die Größe mit dem definierten Maximalwert.<br>3. Das System ermittelt grundlegende Dateieigenschaften (z. B. MIME-Typ).<br>4. Das System prüft, ob der Dateityp grundsätzlich zulässig ist.<br>5. Bei gültiger Datei wird der Upload-Prozess fortgesetzt.<br>6. Bei ungültiger Datei wird der Upload-Prozess abgebrochen.</p>
<h2>Alternativen</h2>
<ul><li>Datei überschreitet Größenlimit → System antwortet mit 400 und speichert nichts.</li><li>Datei besitzt unzulässigen Typ → System antwortet mit 400 und speichert nichts.</li><li>Technischer Fehler bei Validierung → System antwortet mit 500 und speichert nichts.</li></ul>
<h2>Alternativen</h2>
<h2>Ergebnis</h2>
<ul><li>Nur valide Dateien werden persistiert.</li><li>Ungültige Dateien werden vollständig verworfen.</li><li>Es entstehen keine unvollständigen Attachment-Datensätze.</li></ul>