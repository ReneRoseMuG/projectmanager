import { Bell, BellOff } from "lucide-react";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Section } from "../ui/Section";
import { useToast } from "../ui/ToastProvider";
import { errorMessageAsync } from "../../hooks/errors";
import { useHasPermission } from "../../hooks/usePermissions";
import { usePushNotifications } from "../../hooks/usePushNotifications";

export function PushNotificationsPanel() {
  const canManage = useHasPermission("notifications", "write");
  const push = usePushNotifications();
  const { showToast } = useToast();

  if (!canManage) {
    return null;
  }

  const disabled = !push.supported || !push.serverEnabled || push.loading || push.saving;
  const badgeTone = push.subscribed ? "fern" : push.serverEnabled ? "mute" : "tangerine";
  const badgeLabel = push.subscribed ? "Aktiv" : push.serverEnabled ? "Aus" : "Server aus";

  const toggle = async () => {
    try {
      if (push.subscribed) {
        await push.disable();
        showToast({ tone: "info", title: "Desktop-Benachrichtigungen deaktiviert" });
        return;
      }
      await push.enable();
      showToast({ tone: "success", title: "Desktop-Benachrichtigungen aktiviert" });
    } catch (error) {
      showToast({
        tone: "error",
        title: "Desktop-Benachrichtigung konnte nicht geändert werden",
        message: await errorMessageAsync(error)
      });
    }
  };

  return (
    <Section
      title="Desktop-Benachrichtigungen"
      actions={<Badge tone={badgeTone}>{badgeLabel}</Badge>}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid gap-1">
          <p className="text-sm font-semibold text-ink">Terminerinnerungen im Browser</p>
          <p className="text-sm text-steel-500">
            {push.supported
              ? push.serverEnabled
                ? "Dieser Browser kann Erinnerungen empfangen."
                : "Der Push-Kanal ist serverseitig deaktiviert."
              : "Dieser Browser unterstützt keine Desktop-Benachrichtigungen."}
          </p>
          {push.error ? <p className="text-sm text-crimson">{push.error}</p> : null}
        </div>
        <Button
          variant={push.subscribed ? "secondary" : "primary"}
          icon={push.subscribed ? <BellOff size={17} /> : <Bell size={17} />}
          loading={push.saving}
          disabled={disabled}
          onClick={() => void toggle()}
        >
          {push.subscribed ? "Deaktivieren" : "Aktivieren"}
        </Button>
      </div>
    </Section>
  );
}
