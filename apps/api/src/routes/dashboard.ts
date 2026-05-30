import {
  DASHBOARD_CONTEXTS,
  DASHBOARD_WIDGET_IDS,
  type DashboardContext,
  type DashboardInput,
  type DashboardUpdate,
  type SetDashboardDefaultRequest
} from "@taskmanager/shared-types";
import type { FastifyInstance } from "fastify";
import { requireCurrentUser } from "../plugins/auth.js";
import { createDashboard, deleteDashboard, getDashboard, listDashboards, setDefaultDashboard, updateDashboard } from "../services/dashboard.service.js";
import { expectedVersionPropertySchema, idParamSchema, objectResponseSchema } from "../utils/route-schemas.js";

const dashboardContextValues = [...DASHBOARD_CONTEXTS];
const dashboardWidgetIdValues = [...DASHBOARD_WIDGET_IDS];

const dashboardListQuerySchema = {
  type: "object",
  required: ["context"],
  additionalProperties: false,
  properties: {
    context: { type: "string", enum: dashboardContextValues }
  }
} as const;

const dashboardWidgetSchema = {
  type: "object",
  required: ["widgetId", "col", "row", "colSpan"],
  additionalProperties: false,
  properties: {
    widgetId: { type: "string", enum: dashboardWidgetIdValues },
    col: { type: "integer", minimum: 0, maximum: 1 },
    row: { type: "integer", minimum: 0 },
    colSpan: { type: "integer", minimum: 1, maximum: 2 },
    params: {
      type: "object",
      additionalProperties: false,
      properties: {
        limit: { type: "integer", minimum: 1, maximum: 50 },
        sort: { type: "string", enum: ["createdAt", "updatedAt"] }
      }
    }
  }
} as const;

const dashboardBodySchema = {
  type: "object",
  required: ["name", "context", "widgets"],
  additionalProperties: false,
  properties: {
    name: { type: "string", minLength: 1 },
    context: { type: "string", enum: dashboardContextValues },
    isSystem: { type: "boolean" },
    widgets: {
      type: "array",
      minItems: 1,
      items: dashboardWidgetSchema
    }
  }
} as const;

const dashboardUpdateBodySchema = {
  type: "object",
  required: ["name", "context", "widgets", "expectedVersion"],
  additionalProperties: false,
  properties: {
    ...dashboardBodySchema.properties,
    ...expectedVersionPropertySchema
  }
} as const;

const dashboardDefaultBodySchema = {
  type: "object",
  required: ["scopeType", "expectedVersion"],
  additionalProperties: false,
  properties: {
    scopeType: { type: "string", enum: ["GLOBAL", "USER"] },
    expectedVersion: { type: "integer", minimum: 0 }
  }
} as const;

export async function registerDashboardRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: { context: DashboardContext } }>(
    "/dashboards",
    { schema: { querystring: dashboardListQuerySchema, response: { 200: objectResponseSchema } } },
    async (request) => listDashboards(app.db, request.query.context, await requireCurrentUser(request))
  );

  app.post<{ Body: DashboardInput }>(
    "/dashboards",
    { schema: { body: dashboardBodySchema, response: { 201: objectResponseSchema } } },
    async (request, reply) => reply.status(201).send(await createDashboard(app.db, request.body, await requireCurrentUser(request)))
  );

  app.get<{ Params: { id: number } }>(
    "/dashboards/:id",
    { schema: { params: idParamSchema, response: { 200: objectResponseSchema } } },
    async (request) => getDashboard(app.db, request.params.id, await requireCurrentUser(request))
  );

  app.put<{ Params: { id: number }; Body: DashboardUpdate }>(
    "/dashboards/:id",
    { schema: { params: idParamSchema, body: dashboardUpdateBodySchema, response: { 200: objectResponseSchema } } },
    async (request) => updateDashboard(app.db, request.params.id, request.body, await requireCurrentUser(request))
  );

  app.delete<{ Params: { id: number } }>(
    "/dashboards/:id",
    { config: { auth: { resource: "dashboards", action: "write" } }, schema: { params: idParamSchema, response: { 204: { type: "null" } } } },
    async (request, reply) => {
      await deleteDashboard(app.db, request.params.id, await requireCurrentUser(request));
      return reply.status(204).send();
    }
  );

  app.post<{ Params: { id: number }; Body: SetDashboardDefaultRequest }>(
    "/dashboards/:id/default",
    { schema: { params: idParamSchema, body: dashboardDefaultBodySchema, response: { 200: objectResponseSchema } } },
    async (request) => setDefaultDashboard(app.db, request.params.id, request.body.scopeType, request.body.expectedVersion, await requireCurrentUser(request))
  );
}
