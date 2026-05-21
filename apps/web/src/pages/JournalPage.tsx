import { JOURNAL_OBJECT_TYPES, JOURNAL_OPERATIONS, type JournalObjectType, type JournalOperation } from "@taskmanager/shared-types";
import { useMemo, useState } from "react";
import { JournalEntryList, journalObjectLabels, journalOperationLabels } from "../components/journal/JournalPanel";
import { SearchInput } from "../components/ui/SearchInput";
import { Select } from "../components/ui/Select";
import { useJournalEntries } from "../hooks/useJournal";
import { ForbiddenPage } from "./ForbiddenPage";

export function JournalPage() {
  const [query, setQuery] = useState("");
  const [objectType, setObjectType] = useState<JournalObjectType | "">("");
  const [operation, setOperation] = useState<JournalOperation | "">("");

  const filters = useMemo(
    () => ({
      limit: 100,
      q: query.trim(),
      objectType,
      operation
    }),
    [objectType, operation, query]
  );
  const journal = useJournalEntries(filters);

  if (!journal.canReadJournal) {
    return <ForbiddenPage />;
  }

  return (
    <div className="grid gap-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-normal text-ink">Journal</h1>
        </div>
      </header>

      <section className="grid gap-3 rounded-md border border-line bg-white p-4 md:grid-cols-[minmax(16rem,1fr)_14rem_14rem]">
        <SearchInput value={query} placeholder="Journal durchsuchen" onChange={setQuery} />
        <Select label="Objekt" value={objectType} onChange={(event) => setObjectType(event.target.value as JournalObjectType | "")}>
          <option value="">Alle Objekte</option>
          {JOURNAL_OBJECT_TYPES.map((type) => (
            <option key={type} value={type}>
              {journalObjectLabels[type]}
            </option>
          ))}
        </Select>
        <Select label="Aktion" value={operation} onChange={(event) => setOperation(event.target.value as JournalOperation | "")}>
          <option value="">Alle Aktionen</option>
          {JOURNAL_OPERATIONS.map((item) => (
            <option key={item} value={item}>
              {journalOperationLabels[item]}
            </option>
          ))}
        </Select>
      </section>

      <JournalEntryList entries={journal.entries} loading={journal.loading} error={journal.error} onReload={() => void journal.reload()} />
    </div>
  );
}
