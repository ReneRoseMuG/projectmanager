import type { Tag } from "@taskmanager/shared-types";
import { Badge } from "../ui/Badge";

interface TagBadgeProps {
  tag: Tag;
}

export function TagBadge({ tag }: TagBadgeProps) {
  return <Badge color={tag.color}>{tag.name}</Badge>;
}
