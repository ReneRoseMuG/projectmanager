import type { RealtimeInvalidationScope } from "@taskmanager/shared-types";
import type { FastifyInstance, FastifyRequest } from "fastify";

const mutatingMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function requestPath(request: FastifyRequest): string {
  return request.url.split("?")[0] ?? request.url;
}

function sourceTabHeader(request: FastifyRequest): string | null {
  const value = request.headers["x-client-tab-id"];
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= 128 ? trimmed : null;
}

function scopeForPath(path: string): RealtimeInvalidationScope {
  const apiPath = path.replace(/^\/api/, "");
  const apiPathSegments = apiPath.split("/").filter(Boolean);
  if (apiPathSegments.includes("comments")) {
    return "comments";
  }
  if (apiPath.startsWith("/admin/users")) {
    return "adminUsers";
  }
  if (apiPath.startsWith("/admin/roles") || apiPath.startsWith("/admin/permissions")) {
    return "adminRoles";
  }
  if (apiPath.startsWith("/documents") || apiPath.startsWith("/attachment-folders") || apiPathSegments.includes("document-links")) {
    return "documents";
  }
  if (apiPath.startsWith("/projects")) {
    return "projects";
  }
  if (apiPath.startsWith("/milestones")) {
    return "milestones";
  }
  if (apiPath.startsWith("/tasks") || apiPath.startsWith("/subtasks")) {
    return "tasks";
  }
  if (apiPath.startsWith("/tickets")) {
    return "tickets";
  }
  if (apiPath.startsWith("/features") || apiPath.startsWith("/doc-links")) {
    return "features";
  }
  if (apiPath.startsWith("/use-cases")) {
    return "useCases";
  }
  if (apiPath.startsWith("/backlog")) {
    return "backlog";
  }
  if (apiPath.startsWith("/wiki") || apiPath.startsWith("/imports")) {
    return "wiki";
  }
  if (apiPath.startsWith("/notes")) {
    return "notes";
  }
  if (apiPath.startsWith("/attachments")) {
    return "attachments";
  }
  if (apiPath.startsWith("/tags")) {
    return "tags";
  }
  if (apiPath.startsWith("/catalogs")) {
    return "catalogs";
  }
  if (apiPath.startsWith("/events")) {
    return "events";
  }
  if (apiPath.startsWith("/dashboards")) {
    return "dashboards";
  }
  if (apiPath.startsWith("/settings")) {
    return "settings";
  }
  return "all";
}

function shouldPublish(request: FastifyRequest, statusCode: number): boolean {
  const path = requestPath(request);
  if (!path.startsWith("/api/") || path.startsWith("/api/auth/") || path.startsWith("/api/realtime/")) {
    return false;
  }
  return statusCode < 400 && mutatingMethods.has(request.method);
}

export async function registerRealtimePublisher(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", async (request) => {
    request.sourceTabId = sourceTabHeader(request);
  });

  app.addHook("onSend", async (request, reply, payload) => {
    if (shouldPublish(request, reply.statusCode)) {
      app.realtimeBus.publish({
        type: "invalidate",
        scope: scopeForPath(requestPath(request)),
        sourceTabId: request.sourceTabId ?? null,
        occurredAt: new Date().toISOString()
      });
    }
    return payload;
  });
}
