import type { Attachment, Feature, Note, Project, Task, Ticket, WikiPage } from "@taskmanager/shared-types";
import { useQuery } from "@tanstack/react-query";
import { getProjectAttachments } from "../api/attachments";
import { getFeatures } from "../api/features";
import { getProjectNotes } from "../api/notes";
import { getProjects } from "../api/projects";
import { getProjectTasks } from "../api/tasks";
import { getProjectTickets } from "../api/tickets";
import { getRootWikiPages } from "../api/wiki";
import { toQueryError } from "../queries/queryErrors";
import { queryKeys } from "../queries/queryKeys";

export interface GlobalSearchData {
  projects: Project[];
  features: Feature[];
  wikiPages: WikiPage[];
  tasks: Task[];
  tickets: Ticket[];
  notes: Note[];
  attachments: Attachment[];
}

async function loadGlobalSearchData(): Promise<GlobalSearchData> {
  const [projects, features, wikiPages] = await Promise.all([getProjects(), getFeatures(), getRootWikiPages()]);
  const projectIds = projects.map((project) => project.id);
  const [taskLists, ticketLists, noteLists, attachmentLists] = await Promise.all([
    Promise.all(projectIds.map((projectId) => getProjectTasks(projectId))),
    Promise.all(projectIds.map((projectId) => getProjectTickets(projectId))),
    Promise.all(projectIds.map((projectId) => getProjectNotes(projectId))),
    Promise.all(projectIds.map((projectId) => getProjectAttachments(projectId)))
  ]);

  return {
    projects,
    features,
    wikiPages,
    tasks: taskLists.flat(),
    tickets: ticketLists.flat(),
    notes: noteLists.flat(),
    attachments: attachmentLists.flat()
  };
}

export function useGlobalSearchData(open: boolean) {
  const searchQuery = useQuery({
    queryKey: queryKeys.globalSearch.data(),
    queryFn: loadGlobalSearchData,
    enabled: open
  });

  return {
    data: searchQuery.data ?? {
      projects: [],
      features: [],
      wikiPages: [],
      tasks: [],
      tickets: [],
      notes: [],
      attachments: []
    },
    loading: searchQuery.isLoading,
    error: toQueryError(searchQuery.error)
  };
}
