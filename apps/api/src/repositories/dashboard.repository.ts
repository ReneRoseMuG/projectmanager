import type { DashboardContext, DashboardDefaultScope, DashboardWidgetLayout } from "@taskmanager/shared-types";
import { and, asc, eq, inArray, or } from "drizzle-orm";
import type { DbClient } from "../db/client.js";
import { dashboardDefaults, dashboardWidgets, dashboards } from "../db/schema.js";
import { assertVersion } from "./base.repository.js";

export type DashboardRecord = typeof dashboards.$inferSelect;
export type DashboardWidgetRecord = typeof dashboardWidgets.$inferSelect;
export type DashboardDefaultRecord = typeof dashboardDefaults.$inferSelect;

export interface DashboardCreateData {
  name: string;
  context: DashboardContext;
  isSystem: boolean;
  templateKey?: string | null;
  ownerId?: number | null;
}

export interface DashboardDefaultScopeRef {
  scopeType: DashboardDefaultScope;
  scopeId: string;
  context: DashboardContext;
}

function nowIso(): string {
  return new Date().toISOString();
}

function widgetValues(dashboardId: number, widgets: DashboardWidgetLayout[]): Array<typeof dashboardWidgets.$inferInsert> {
  return widgets.map((widget) => ({
    dashboardId,
    widgetId: widget.widgetId,
    col: widget.col,
    row: widget.row,
    colSpan: widget.colSpan,
    paramsJson: widget.params ? JSON.stringify(widget.params) : null
  }));
}

export const dashboardRepository = {
  findById(database: DbClient, id: number): DashboardRecord | undefined {
    return database.select().from(dashboards).where(eq(dashboards.id, id)).get();
  },

  findByTemplateKey(database: DbClient, templateKey: string): DashboardRecord | undefined {
    return database.select().from(dashboards).where(eq(dashboards.templateKey, templateKey)).get();
  },

  findByContextForUser(database: DbClient, context: DashboardContext, userId: number): DashboardRecord[] {
    return database
      .select()
      .from(dashboards)
      .where(and(eq(dashboards.context, context), or(eq(dashboards.isSystem, true), eq(dashboards.ownerId, userId))))
      .orderBy(asc(dashboards.isSystem), asc(dashboards.name), asc(dashboards.id))
      .all();
  },

  findWidgetsByDashboardIds(database: DbClient, dashboardIds: number[]): DashboardWidgetRecord[] {
    if (dashboardIds.length === 0) {
      return [];
    }
    return database
      .select()
      .from(dashboardWidgets)
      .where(inArray(dashboardWidgets.dashboardId, dashboardIds))
      .orderBy(asc(dashboardWidgets.row), asc(dashboardWidgets.col), asc(dashboardWidgets.id))
      .all();
  },

  findDefault(database: DbClient, scope: DashboardDefaultScopeRef): DashboardDefaultRecord | undefined {
    return database
      .select()
      .from(dashboardDefaults)
      .where(and(eq(dashboardDefaults.scopeType, scope.scopeType), eq(dashboardDefaults.scopeId, scope.scopeId), eq(dashboardDefaults.context, scope.context)))
      .get();
  },

  findDefaultsForContext(database: DbClient, context: DashboardContext, userId: number): DashboardDefaultRecord[] {
    return database
      .select()
      .from(dashboardDefaults)
      .where(
        and(
          eq(dashboardDefaults.context, context),
          or(
            and(eq(dashboardDefaults.scopeType, "GLOBAL"), eq(dashboardDefaults.scopeId, "global")),
            and(eq(dashboardDefaults.scopeType, "USER"), eq(dashboardDefaults.scopeId, String(userId)))
          )
        )
      )
      .all();
  },

  create(database: DbClient, data: DashboardCreateData, widgets: DashboardWidgetLayout[], userId?: number): DashboardRecord {
    const now = nowIso();
    const dashboard = database
      .insert(dashboards)
      .values({
        name: data.name,
        context: data.context,
        isSystem: data.isSystem,
        templateKey: data.templateKey ?? null,
        ownerId: data.ownerId ?? null,
        version: 1,
        createdBy: userId ?? null,
        updatedBy: userId ?? null,
        createdAt: now,
        updatedAt: now
      })
      .returning()
      .get();
    const values = widgetValues(dashboard.id, widgets);
    if (values.length > 0) {
      database.insert(dashboardWidgets).values(values).run();
    }
    return dashboard;
  },

  update(database: DbClient, id: number, expectedVersion: number, data: Pick<DashboardCreateData, "name" | "context" | "isSystem" | "ownerId">, widgets: DashboardWidgetLayout[], userId?: number): DashboardRecord | undefined {
    const current = this.findById(database, id);
    if (!current) {
      return undefined;
    }
    assertVersion(current.version, expectedVersion);
    const updated = database
      .update(dashboards)
      .set({
        name: data.name,
        context: data.context,
        isSystem: data.isSystem,
        ownerId: data.ownerId ?? null,
        version: current.version + 1,
        updatedBy: userId ?? null,
        updatedAt: nowIso()
      })
      .where(eq(dashboards.id, id))
      .returning()
      .get();
    database.delete(dashboardWidgets).where(eq(dashboardWidgets.dashboardId, id)).run();
    const values = widgetValues(id, widgets);
    if (values.length > 0) {
      database.insert(dashboardWidgets).values(values).run();
    }
    return updated;
  },

  delete(database: DbClient, id: number): number {
    return database.delete(dashboards).where(eq(dashboards.id, id)).run().changes;
  },

  setDefault(database: DbClient, scope: DashboardDefaultScopeRef, dashboardId: number, expectedVersion: number, userId?: number): DashboardDefaultRecord {
    const current = this.findDefault(database, scope);
    if (current) {
      assertVersion(current.version, expectedVersion);
      return database
        .update(dashboardDefaults)
        .set({
          dashboardId,
          version: current.version + 1,
          updatedBy: userId ?? null,
          updatedAt: nowIso()
        })
        .where(eq(dashboardDefaults.id, current.id))
        .returning()
        .get();
    }
    assertVersion(0, expectedVersion);
    const now = nowIso();
    return database
      .insert(dashboardDefaults)
      .values({
        scopeType: scope.scopeType,
        scopeId: scope.scopeId,
        context: scope.context,
        dashboardId,
        version: 1,
        createdBy: userId ?? null,
        updatedBy: userId ?? null,
        createdAt: now,
        updatedAt: now
      })
      .returning()
      .get();
  }
};
