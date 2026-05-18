import { OwnerTicketBoard } from "./OwnerTicketBoard";

interface ProjectTicketPanelProps {
  projectId: number;
}

export function ProjectTicketPanel({ projectId }: ProjectTicketPanelProps) {
  return <OwnerTicketBoard owner={{ type: "project", id: projectId }} />;
}
