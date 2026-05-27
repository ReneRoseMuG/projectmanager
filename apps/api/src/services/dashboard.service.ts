import {
  DASHBOARD_ALLOWED_WIDGETS,
  DEFAULT_DASHBOARD_LAYOUTS,
  type CurrentUser,
  type Dashboard,
  type DashboardContext,
  type DashboardDefaultScope,
  type DashboardInput,
  type DashboardListResponse,
  type DashboardUpdate,
  type DashboardWidgetId,
  type DashboardWidgetLayout,
  type JsonObject
} from "@taskmanager/shared-types";
import type { DbClient } from "../db/client.js";
import { dashboardRepository, type DashboardDefaultRecord, type DashboardRecord, type DashboardWidgetRecord } from "../repositories/dashboard.repository.js";
import { badRequest, forbidden, notFound } from "../utils/errors.js";
import { hasPermission } from "./roles.service.js";

const globalScopeId = "global";

const systemDashboardTemplates: Array<{ templateKey: string; name: string; context: DashboardContext; widgets: DashboardWidgetLayout[] }> = [
  { templateKey: "system.global.default", name: "Standard: Gesamtübersicht", context: "global", widgets: [...DEFAULT_DASHBOARD_LAYOUTS.global] },
  { templateKey: "system.project.default", name: "Standard: Projektübersicht", context: "project", widgets: [...DEFAULT_DASHBOARD_LAYOUTS.project] },
  { templateKey: "system.milestone.default", name: "Standard: Meilensteinübersicht", context: "milestone", widgets: [...DEFAULT_DASHBOARD_LAYOUTS.milestone] },
  { templateKey: "system.task.default", name: "Standard: Aufgabenübersicht", context: "task", widgets: [...DEFAULT_DASHBOARD_LAYOUTS.task] },
  { templateKey: "system.home.default", name: "Standard: Startseite", context: "home", widgets: [...DEFAULT_DASHBOARD_LAYOUTS.home] },
  { templateKey: "system.calendar.default", name: "Standard: Kalender", context: "calendar", widgets: [...DEFAULT_DASHBOARD_LAYOUTS.calendar] }
];

function isDashboardContext(value: string): value is DashboardContext {
  return value === "global" || value === "project" || value === "milestone" || value === "task" || value === "home" || value === "calendar";
}

function isDashboardWidgetId(value: string): value is DashboardWidgetId {
  return (DASHBOARD_ALLOWED_WIDGETS.global as readonly string[]).includes(value) ||
    (DASHBOARD_ALLOWED_WIDGETS.project as readonly string[]).includes(value) ||
    (DASHBOARD_ALLOWED_WIDGETS.milestone as readonly string[]).includes(value) ||
    (DASHBOARD_ALLOWED_WIDGETS.task as readonly string[]).includes(value) ||
    (DASHBOARD_ALLOWED_WIDGETS.home as readonly string[]).includes(value) ||
    (DASHBOARD_ALLOWED_WIDGETS.calendar as readonly string[]).includes(value);
}

function canAdminDashboards(currentUser: CurrentUser): boolean {
  return hasPermission(currentUser.role, "dashboards", "admin");
}

function normalizeName(value: string | undefined): string {
  const name = value?.trim();
  if (!name) {
    throw badRequest("Dashboard name is required");
  }
  return name;
}

function normalizeParams(value: DashboardWidgetLayout["params"]): DashboardWidgetLayout["params"] | undefined {
  if (!value) {
    return undefined;
  }
  const result: JsonObject = {};
  if (value.limit !== undefined) {
    if (!Number.isInteger(value.limit) || value.limit < 1 || value.limit > 50) {
      throw badRequest("Widget limit must be an integer between 1 and 50");
    }
    result.limit = value.limit;
  }
  if (value.sort !== undefined) {
    if (value.sort !== "createdAt" && value.sort !== "updatedAt") {
      throw badRequest("Widget sort must be createdAt or updatedAt");
    }
    result.sort = value.sort;
  }
  return Object.keys(result).length > 0 ? result as DashboardWidgetLayout["params"] : undefined;
}

function normalizeWidgets(context: DashboardContext, input: DashboardWidgetLayout[] | undefined): DashboardWidgetLayout[] {
  const widgets = input ?? [];
  if (widgets.length === 0) {
    throw badRequest("A dashboard requires at least one widget");
  }
  const allowed = new Set<string>(DASHBOARD_ALLOWED_WIDGETS[context]);
  const seen = new Set<string>();
  return widgets.map((widget) => {
    if (!isDashboardWidgetId(widget.widgetId) || !allowed.has(widget.widgetId)) {
      throw badRequest(`Widget "${widget.widgetId}" is not allowed for ${context} dashboards`);
    }
    if (seen.has(widget.widgetId)) {
      throw badRequest(`Widget "${widget.widgetId}" is already used in this dashboard`);
    }
    seen.add(widget.widgetId);
    if (!Number.isInteger(widget.row) || widget.row < 0) {
      throw badRequest("Widget row must be a non-negative integer");
    }
    if (widget.col !== 0 && widget.col !== 1) {
      throw badRequest("Widget col must be 0 or 1");
    }
    if (widget.colSpan !== 1 && widget.colSpan !== 2) {
      throw badRequest("Widget colSpan must be 1 or 2");
    }
    if (widget.colSpan === 2 && widget.col !== 0) {
      throw badRequest("Full-width widgets must start in column 0");
    }
    const col: 0 | 1 = widget.col === 1 ? 1 : 0;
    const colSpan: 1 | 2 = widget.colSpan === 1 ? 1 : 2;
    return {
      widgetId: widget.widgetId,
      row: widget.row,
      col,
      colSpan,
      params: normalizeParams(widget.params)
    };
  });
}

function parseWidgetParams(record: DashboardWidgetRecord): DashboardWidgetLayout["params"] | undefined {
  if (!record.paramsJson) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(record.paramsJson) as DashboardWidgetLayout["params"];
    return normalizeParams(parsed);
  } catch {
    return undefined;
  }
}

function mapDashboard(
  record: DashboardRecord,
  widgetsByDashboardId: Map<number, DashboardWidgetRecord[]>,
  globalDefault: DashboardDefaultRecord | undefined,
  userDefault: DashboardDefaultRecord | undefined
): Dashboard {
  const widgets: DashboardWidgetLayout[] = (widgetsByDashboardId.get(record.id) ?? []).map((widget) => {
    const col: 0 | 1 = widget.col === 1 ? 1 : 0;
    const colSpan: 1 | 2 = widget.colSpan === 1 ? 1 : 2;
    return {
      widgetId: widget.widgetId as DashboardWidgetId,
      col,
      row: widget.row,
      colSpan,
      params: parseWidgetParams(widget)
    };
  });
  return {
    id: record.id,
    name: record.name,
    context: record.context as DashboardContext,
    isSystem: record.isSystem,
    templateKey: record.templateKey,
    ownerId: record.ownerId,
    widgets,
    version: record.version,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    isGlobalDefault: globalDefault?.dashboardId === record.id,
    isUserDefault: userDefault?.dashboardId === record.id
  };
}

function defaultScope(scopeType: DashboardDefaultScope, context: DashboardContext, currentUser: CurrentUser) {
  return {
    scopeType,
    context,
    scopeId: scopeType === "GLOBAL" ? globalScopeId : String(currentUser.id)
  };
}

export function ensureDashboardTemplates(database: DbClient): void {
  database.transaction((tx) => {
    const txDb = tx as unknown as DbClient;
    for (const template of systemDashboardTemplates) {
      let dashboard = dashboardRepository.findByTemplateKey(txDb, template.templateKey);
      if (!dashboard) {
        dashboard = dashboardRepository.create(
          txDb,
          {
            name: template.name,
            context: template.context,
            isSystem: true,
            templateKey: template.templateKey,
            ownerId: null
          },
          normalizeWidgets(template.context, template.widgets)
        );
      }
      const globalDefault = dashboardRepository.findDefault(txDb, { scopeType: "GLOBAL", scopeId: globalScopeId, context: template.context });
      if (!globalDefault) {
        dashboardRepository.setDefault(txDb, { scopeType: "GLOBAL", scopeId: globalScopeId, context: template.context }, dashboard.id, 0);
      }
    }
  });
}

export function listDashboards(database: DbClient, context: DashboardContext, currentUser: CurrentUser): DashboardListResponse {
  ensureDashboardTemplates(database);
  const records = dashboardRepository.findByContextForUser(database, context, currentUser.id);
  const widgets = dashboardRepository.findWidgetsByDashboardIds(database, records.map((dashboard) => dashboard.id));
  const defaults = dashboardRepository.findDefaultsForContext(database, context, currentUser.id);
  const globalDefault = defaults.find((entry) => entry.scopeType === "GLOBAL");
  const userDefault = defaults.find((entry) => entry.scopeType === "USER");
  const widgetsByDashboardId = new Map<number, DashboardWidgetRecord[]>();
  for (const widget of widgets) {
    widgetsByDashboardId.set(widget.dashboardId, [...(widgetsByDashboardId.get(widget.dashboardId) ?? []), widget]);
  }
  return {
    dashboards: records.map((record) => mapDashboard(record, widgetsByDashboardId, globalDefault, userDefault)),
    globalDefaultDashboardId: globalDefault?.dashboardId ?? null,
    globalDefaultVersion: globalDefault?.version ?? 0,
    userDefaultDashboardId: userDefault?.dashboardId ?? null,
    userDefaultVersion: userDefault?.version ?? 0
  };
}

export function getDashboard(database: DbClient, id: number, currentUser: CurrentUser): Dashboard {
  ensureDashboardTemplates(database);
  const dashboard = dashboardRepository.findById(database, id);
  if (!dashboard) {
    throw notFound(`Dashboard with id ${id} not found`);
  }
  if (!dashboard.isSystem && dashboard.ownerId !== currentUser.id && !canAdminDashboards(currentUser)) {
    throw forbidden("Dashboard access denied");
  }
  const response = listDashboards(database, dashboard.context as DashboardContext, currentUser);
  const found = response.dashboards.find((entry) => entry.id === id);
  if (!found) {
    throw forbidden("Dashboard access denied");
  }
  return found;
}

export function createDashboard(database: DbClient, input: DashboardInput, currentUser: CurrentUser): Dashboard {
  const context = input.context;
  if (!isDashboardContext(context)) {
    throw badRequest("Dashboard context is invalid");
  }
  const isSystem = input.isSystem === true;
  if (isSystem && !canAdminDashboards(currentUser)) {
    throw forbidden("Only dashboard administrators can create system dashboards");
  }
  const widgets = normalizeWidgets(context, input.widgets);
  const record = database.transaction((tx) =>
    dashboardRepository.create(
      tx as unknown as DbClient,
      {
        name: normalizeName(input.name),
        context,
        isSystem,
        ownerId: isSystem ? null : currentUser.id,
        templateKey: null
      },
      widgets,
      currentUser.id
    )
  );
  return getDashboard(database, record.id, currentUser);
}

export function updateDashboard(database: DbClient, id: number, input: DashboardUpdate, currentUser: CurrentUser): Dashboard {
  const current = dashboardRepository.findById(database, id);
  if (!current) {
    throw notFound(`Dashboard with id ${id} not found`);
  }
  if (input.context !== current.context) {
    throw badRequest("Dashboard context cannot be changed");
  }
  if (current.isSystem && !canAdminDashboards(currentUser)) {
    throw forbidden("Only dashboard administrators can update system dashboards");
  }
  if (!current.isSystem && current.ownerId !== currentUser.id && !canAdminDashboards(currentUser)) {
    throw forbidden("Dashboard access denied");
  }
  const isSystem = current.isSystem || input.isSystem === true;
  if (isSystem && !canAdminDashboards(currentUser)) {
    throw forbidden("Only dashboard administrators can update system dashboards");
  }
  const widgets = normalizeWidgets(current.context as DashboardContext, input.widgets);
  const updated = database.transaction((tx) =>
    dashboardRepository.update(
      tx as unknown as DbClient,
      id,
      input.expectedVersion,
      {
        name: normalizeName(input.name),
        context: current.context as DashboardContext,
        isSystem,
        ownerId: isSystem ? null : current.ownerId
      },
      widgets,
      currentUser.id
    )
  );
  if (!updated) {
    throw notFound(`Dashboard with id ${id} not found`);
  }
  return getDashboard(database, id, currentUser);
}

export function deleteDashboard(database: DbClient, id: number, currentUser: CurrentUser): void {
  const current = dashboardRepository.findById(database, id);
  if (!current) {
    throw notFound(`Dashboard with id ${id} not found`);
  }
  if (current.isSystem && !canAdminDashboards(currentUser)) {
    throw forbidden("Only dashboard administrators can delete system dashboards");
  }
  if (!current.isSystem && current.ownerId !== currentUser.id && !canAdminDashboards(currentUser)) {
    throw forbidden("Dashboard access denied");
  }
  if (dashboardRepository.delete(database, id) === 0) {
    throw notFound(`Dashboard with id ${id} not found`);
  }
}

export function setDefaultDashboard(
  database: DbClient,
  id: number,
  scopeType: DashboardDefaultScope,
  expectedVersion: number,
  currentUser: CurrentUser
): DashboardListResponse {
  const dashboard = dashboardRepository.findById(database, id);
  if (!dashboard) {
    throw notFound(`Dashboard with id ${id} not found`);
  }
  if (scopeType === "GLOBAL" && !canAdminDashboards(currentUser)) {
    throw forbidden("Only dashboard administrators can change global dashboard defaults");
  }
  if (scopeType === "GLOBAL" && !dashboard.isSystem) {
    throw badRequest("Only system dashboards can be global defaults");
  }
  if (scopeType === "USER" && !dashboard.isSystem && dashboard.ownerId !== currentUser.id) {
    throw forbidden("Users can only default their own dashboards or system dashboards");
  }
  database.transaction((tx) => {
    dashboardRepository.setDefault(
      tx as unknown as DbClient,
      defaultScope(scopeType, dashboard.context as DashboardContext, currentUser),
      id,
      expectedVersion,
      currentUser.id
    );
  });
  return listDashboards(database, dashboard.context as DashboardContext, currentUser);
}
