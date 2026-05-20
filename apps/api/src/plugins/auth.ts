import cookie from "@fastify/cookie";
import session from "@fastify/session";
import type { AuthAction, AuthResource, CurrentUser } from "@taskmanager/shared-types";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { config } from "../config.js";
import { getCurrentUser } from "../services/auth.service.js";
import { hasPermission } from "../services/roles.service.js";
import { forbidden, unauthorized } from "../utils/errors.js";

const openApiPrefixes = ["/api/auth/login", "/api/auth/logout", "/api/auth/me", "/api/auth/set-password", "/api/health"];
const setupAllowedPrefixes = ["/api/auth/logout", "/api/auth/me", "/api/auth/set-password"];

function requestPath(request: FastifyRequest): string {
  return request.url.split("?")[0] ?? request.url;
}

function isOpenRoute(request: FastifyRequest): boolean {
  const path = requestPath(request);
  return path === "/health" || openApiPrefixes.some((prefix) => path.startsWith(prefix));
}

function isAllowedDuringPasswordSetup(request: FastifyRequest): boolean {
  const path = requestPath(request);
  return setupAllowedPrefixes.some((prefix) => path.startsWith(prefix));
}

function actionForMethod(method: string): AuthAction {
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return "read";
  }
  if (method === "DELETE") {
    return "delete";
  }
  return "write";
}

function resourceForPath(path: string): AuthResource {
  if (path.startsWith("/api/admin/users")) {
    return "users";
  }
  if (path.startsWith("/api/admin/roles") || path.startsWith("/api/admin/permissions")) {
    return "roles";
  }

  const segmentMap: Array<[string, AuthResource]> = [
    ["/comments", "comments"],
    ["/notes", "notes"],
    ["/attachments", "attachments"],
    ["/tickets", "tickets"],
    ["/tasks", "tasks"],
    ["/subtasks", "tasks"],
    ["/milestones", "milestones"],
    ["/features", "features"],
    ["/use-cases", "useCases"],
    ["/wiki", "wiki"],
    ["/backlog", "backlog"],
    ["/events", "events"],
    ["/catalogs", "catalogs"],
    ["/tags", "tags"],
    ["/dumps", "dumps"],
    ["/ai", "ai"],
    ["/imports", "wiki"],
    ["/doc-links", "wiki"],
    ["/projects", "projects"]
  ];

  const apiPath = path.replace(/^\/api/, "");
  const match = segmentMap.find(([segment]) => apiPath.includes(segment));
  return match?.[1] ?? "projects";
}

function sessionUserId(request: FastifyRequest): number | undefined {
  const value = request.session.userId;
  return typeof value === "number" && Number.isInteger(value) ? value : undefined;
}

export function requireCurrentUser(request: FastifyRequest): CurrentUser {
  if (request.currentUser) {
    return request.currentUser;
  }
  const userId = sessionUserId(request);
  if (!userId) {
    throw unauthorized("Authentication required");
  }
  const currentUser = getCurrentUser(request.server.db, userId);
  request.currentUser = currentUser;
  return currentUser;
}

export async function requireAuth(request: FastifyRequest): Promise<void> {
  const currentUser = requireCurrentUser(request);
  if (currentUser.requiresPasswordSetup && !isAllowedDuringPasswordSetup(request)) {
    throw forbidden("Password setup is required");
  }
}

export function requirePermission(resource: AuthResource, action: AuthAction) {
  return async (request: FastifyRequest): Promise<void> => {
    const currentUser = requireCurrentUser(request);
    if (!hasPermission(currentUser.role, resource, action)) {
      throw forbidden("Permission denied");
    }
  };
}

export async function registerAuthPlugins(app: FastifyInstance): Promise<void> {
  await app.register(cookie);
  await app.register(session, {
    secret: config.sessionSecret,
    cookieName: "taskmanager.sid",
    saveUninitialized: false,
    cookie: {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 1000 * 60 * 60 * 8
    }
  });

  if (config.sessionSecretIsFallback) {
    app.log.warn("SESSION_SECRET is not configured; using local development fallback");
  }
}

export function registerGlobalAuthGuard(app: FastifyInstance): void {
  app.addHook("preHandler", async (request) => {
    if (isOpenRoute(request)) {
      return;
    }
    await requireAuth(request);
    const path = requestPath(request);
    if (path.startsWith("/api/admin/users")) {
      await requirePermission("users", "admin")(request);
      return;
    }
    if (path.startsWith("/api/admin/roles") || path.startsWith("/api/admin/permissions")) {
      await requirePermission("roles", "admin")(request);
      return;
    }
    const resource = resourceForPath(path);
    const action = actionForMethod(request.method);
    await requirePermission(resource, action)(request);
  });
}
