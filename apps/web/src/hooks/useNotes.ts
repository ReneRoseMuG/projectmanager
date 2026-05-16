import type { Note, NoteInput } from "@taskmanager/shared-types";
import { useCallback, useEffect, useState } from "react";
import {
  createProjectNote,
  createTaskNote,
  deleteNote as deleteNoteRequest,
  getProjectNotes,
  getTaskNotes,
  updateNote as updateNoteRequest
} from "../api/notes";
import { errorMessage } from "./errors";

export type NoteOwner = { type: "project"; id: number } | { type: "task"; id: number };

export function useNotes(owner: NoteOwner | null) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(Boolean(owner));
  const [error, setError] = useState<string | null>(null);
  const ownerType = owner?.type;
  const ownerId = owner?.id;

  const load = useCallback(async () => {
    if (!ownerType || !ownerId) {
      setNotes([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const items = ownerType === "project" ? await getProjectNotes(ownerId) : await getTaskNotes(ownerId);
      setNotes(items);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [ownerId, ownerType]);

  useEffect(() => {
    void load();
  }, [load]);

  const createNote = useCallback(
    async (input: NoteInput) => {
      if (!ownerType || !ownerId) {
        return null;
      }

      const created = ownerType === "project" ? await createProjectNote(ownerId, input) : await createTaskNote(ownerId, input);
      await load();
      return created;
    },
    [load, ownerId, ownerType]
  );

  const updateNote = useCallback(
    async (id: number, input: NoteInput) => {
      const updated = await updateNoteRequest(id, input);
      await load();
      return updated;
    },
    [load]
  );

  const removeNote = useCallback(
    async (id: number) => {
      await deleteNoteRequest(id);
      await load();
    },
    [load]
  );

  return { notes, loading, error, reload: load, createNote, updateNote, removeNote };
}
