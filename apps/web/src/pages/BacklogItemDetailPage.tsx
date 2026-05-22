import type { BacklogItem, BacklogItemInput } from "@taskmanager/shared-types";
import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { getBacklogItem } from "../api/backlog";
import { BacklogItemForm } from "../components/backlog/BacklogItemForm";
import { DetailPageSkeleton } from "../components/ui/Skeleton";
import { useToast } from "../components/ui/ToastProvider";
import { errorMessage } from "../hooks/errors";
import { useBacklog } from "../hooks/useBacklog";
import { useFeatures } from "../hooks/useFeatures";
import { withStandaloneView } from "../utils/standalone";

export function BacklogItemDetailPage() {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const isCreateMode = params.id === undefined;
  const itemId = isCreateMode ? null : Number(params.id);
  const initialProjectIdParam = searchParams.get("projectId");
  const initialProjectId = initialProjectIdParam
    ? Number(initialProjectIdParam)
    : undefined;
  const [item, setItem] = useState<BacklogItem | null>(null);
  const [loading, setLoading] = useState(false);
  const projectId =
    item?.projectId ??
    (initialProjectId !== undefined && Number.isFinite(initialProjectId)
      ? initialProjectId
      : undefined);
  const backlog = useBacklog(projectId);
  const features = useFeatures();
  const returnTo =
    searchParams.get("returnTo") ??
    (searchParams.get("standalone") === "1"
      ? withStandaloneView(projectId ? `/projects/${projectId}` : "/projects")
      : projectId ? `/projects/${projectId}` : "/projects");
  const openInTab =
    !isCreateMode && itemId !== null && Number.isFinite(itemId)
      ? () => {
          window.open(withStandaloneView(`/backlog/${itemId}`), "_blank");
          navigate(returnTo);
        }
      : undefined;

  useEffect(() => {
    const id = itemId;
    if (isCreateMode || id === null || !Number.isFinite(id)) {
      return;
    }
    setLoading(true);
    getBacklogItem(id)
      .then(setItem)
      .finally(() => setLoading(false));
  }, [isCreateMode, itemId]);

  const closePage = () => navigate(returnTo);

  const submitBacklogItem = async (input: BacklogItemInput) => {
    try {
      if (item) {
        const updated = await backlog.updateItem(item.id, {
          ...input,
          expectedVersion: item.version,
        });
        setItem(updated);
        showToast({ tone: "success", title: "Backlog-Item gespeichert" });
        return;
      }
      await backlog.createItem(input);
      showToast({ tone: "success", title: "Backlog-Item erstellt" });
    } catch (backlogError) {
      showToast({
        tone: "error",
        title: "Backlog-Item konnte nicht gespeichert werden",
        message: errorMessage(backlogError),
      });
      throw backlogError;
    }
  };

  if (isCreateMode && projectId === undefined) {
    return (
      <div className="rounded-lg border border-line bg-white p-8 text-center text-sm text-slate-600">
        Backlog-Items benötigen ein Projekt.
      </div>
    );
  }

  if (!isCreateMode && !Number.isFinite(itemId)) {
    return (
      <div className="rounded-lg border border-line bg-white p-8 text-center text-sm text-slate-600">
        Backlog-Item nicht gefunden
      </div>
    );
  }

  if (!isCreateMode && loading) {
    return <DetailPageSkeleton />;
  }

  if (!isCreateMode && !item) {
    return (
      <div className="rounded-lg border border-line bg-white p-8 text-center text-sm text-slate-600">
        Backlog-Item nicht gefunden
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col">
      <BacklogItemForm
        open
        item={item}
        features={features.features}
        variant="page"
        onSubmit={submitBacklogItem}
        onClose={closePage}
        onOpenInTab={openInTab}
      />
    </div>
  );
}
