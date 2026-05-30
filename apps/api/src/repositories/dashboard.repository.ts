import type { DashboardContext, DashboardDefaultScope, DashboardWidgetLayout } from "@taskmanager/shared-types";
import { and, asc, eq, inArray, or } from "drizzle-orm";
import type { DbSession } from "../db/client.js";
import { firstRow, insertId, mutationAffectedRows } from "../db/query-utils.js";
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
  async findById(database: DbSession, id: number): Promise<DashboardRecord | undefined> {
    return firstRow(await database.select().from(dashboards).where(eq(dashboards.id, id)));
  },

  async findByTemplateKey(database: DbSession, templateKey: string): Promise<DashboardRecord | undefined> {
    return firstRow(await database.select().from(dashboards).where(eq(dashboards.templateKey, templateKey)));
  },

  async findByContextForUser(database: DbSession, context: DashboardContext, userId: number): Promise<DashboardRecord[]> {
    return database
      .select()
      .from(dashboards)
      .where(and(eq(dashboards.context, context), or(eq(dashboards.isSystem, true), eq(dashboards.ownerId, userId))))
      .orderBy(asc(dashboards.isSystem), asc(dashboards.name), asc(dashboards.id));
  },

  async findWidgetsByDashboardIds(database: DbSession, dashboardIds: number[]): Promise<DashboardWidgetRecord[]> {
    if (dashboardIds.length === 0) {
      return [];
    }
    return database
      .select()
      .from(dashboardWidgets)
      .where(inArray(dashboardWidgets.dashboardId, dashboardIds))
      .orderBy(asc(dashboardWidgets.row), asc(dashboardWidgets.col), asc(dashboardWidgets.id));
  },

  async findDefault(database: DbSession, scope: DashboardDefaultScopeRef): Promise<DashboardDefaultRecord | undefined> {
    return firstRow(await database
      .select()
      .from(dashboardDefaults)
      .where(and(eq(dashboardDefaults.scopeType, scope.scopeType), eq(dashboardDefaults.scopeId, scope.scopeId), eq(dashboardDefaults.context, scope.context))));
  },

  async findDefaultsForContext(database: DbSession, context: DashboardContext, userId: number): Promise<DashboardDefaultRecord[]> {
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
      );
  },

  async create(database: DbSession, data: DashboardCreateData, widgets: DashboardWidgetLayout[], userId?: number): Promise<DashboardRecord> {
    const now = nowIso();
    const result = await database
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
      });
    const dashboard = await this.findById(database, insertId(result));
    if (!dashboard) {
      throw new Error("Created dashboard could not be loaded");
    }
    const values = widgetValues(dashboard.id, widgets);
    if (values.length > 0) {
      await database.insert(dashboardWidgets).values(values);
    }
    return dashboard;
  },

  async update(database: DbSession, id: number, expectedVersion: number, data: Pick<DashboardCreateData, "name" | "context" | "isSystem" | "ownerId">, widgets: DashboardWidgetLayout[], userId?: number): Promise<DashboardRecord | undefined> {
    const current = await this.findById(database, id);
    if (!current) {
      return undefined;
    }
    assertVersion(current.version, expectedVersion);
    await database
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
      .where(eq(dashboards.id, id));
    const updated = await this.findById(database, id);
    if (!updated) {
      throw new Error("Updated dashboard could not be loaded");
    }
    await database.delete(dashboardWidgets).where(eq(dashboardWidgets.dashboardId, id));
    const values = widgetValues(id, widgets);
    if (values.length > 0) {
      await database.insert(dashboardWidgets).values(values);
    }
    return updated;
  },

  async delete(database: DbSession, id: number): Promise<number> {
    return mutationAffectedRows(await database.delete(dashboards).where(eq(dashboards.id, id)));
  },

  async setDefault(database: DbSession, scope: DashboardDefaultScopeRef, dashboardId: number, expectedVersion: number, userId?: number): Promise<DashboardDefaultRecord> {
    const current = await this.findDefault(database, scope);
    if (current) {
      assertVersion(current.version, expectedVersion);
      await database
        .update(dashboardDefaults)
        .set({
          dashboardId,
          version: current.version + 1,
          updatedBy: userId ?? null,
          updatedAt: nowIso()
        })
        .where(eq(dashboardDefaults.id, current.id));
      const updated = await this.findDefault(database, scope);
      if (!updated) {
        throw new Error("Updated dashboard default could not be loaded");
      }
      return updated;
    }
    assertVersion(0, expectedVersion);
    const now = nowIso();
    const result = await database
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
      });
    const created = firstRow(await database.select().from(dashboardDefaults).where(eq(dashboardDefaults.id, insertId(result))));
    if (!created) {
      throw new Error("Created dashboard default could not be loaded");
    }
    return created;
  }
};

