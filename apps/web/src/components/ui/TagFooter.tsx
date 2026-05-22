import type { Tag } from "@taskmanager/shared-types";
import { TagBadge } from "../tags/TagBadge";

export function TagFooter({ tags }: { tags: Tag[] }) {
  if (tags.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 border-t border-line pt-2">
      {tags.map((tag) => (
        <TagBadge key={tag.id} tag={tag} />
      ))}
    </div>
  );
}
