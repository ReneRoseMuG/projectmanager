import { Tag } from "lucide-react";
import { TagManager } from "../components/tags/TagManager";
import { PageHero } from "../components/ui/PageHero";
import { useTags } from "../hooks/useTags";

export function SettingsTagsPage() {
  const tags = useTags();

  return (
    <section className="flex h-full min-h-0 w-full min-w-0 flex-col">
      <PageHero
        variant="detail"
        title="Tags"
        icon={<Tag size={22} />}
        subtitle={
          <span className="text-sm font-medium text-white/70">
            {tags.tags.length} Tags
          </span>
        }
      />
      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-auto bg-white p-5">
        <TagManager />
      </div>
    </section>
  );
}
