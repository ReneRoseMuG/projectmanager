import { SETTING_SCOPE_TYPES, type DeleteSettingValueRequest, type SetSettingValueRequest } from "@taskmanager/shared-types";
import type { FastifyInstance } from "fastify";
import { requireCurrentUser } from "../plugins/auth.js";
import { deleteSettingValue, getResolvedSettingsForUser, setSettingValue } from "../services/settings.service.js";
import { objectResponseSchema } from "../utils/route-schemas.js";

const settingScopeValues = [...SETTING_SCOPE_TYPES];

const setSettingBodySchema = {
  type: "object",
  required: ["key", "scopeType", "value", "expectedVersion"],
  additionalProperties: false,
  properties: {
    key: { type: "string", minLength: 1 },
    scopeType: { type: "string", enum: settingScopeValues },
    scopeId: { type: "string", minLength: 1 },
    value: {},
    expectedVersion: { type: "integer", minimum: 0 }
  }
} as const;

const deleteSettingBodySchema = {
  type: "object",
  required: ["key", "scopeType", "expectedVersion"],
  additionalProperties: false,
  properties: {
    key: { type: "string", minLength: 1 },
    scopeType: { type: "string", enum: settingScopeValues },
    scopeId: { type: "string", minLength: 1 },
    expectedVersion: { type: "integer", minimum: 0 }
  }
} as const;

export async function registerSettingsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/settings/resolved", { schema: { response: { 200: objectResponseSchema } } }, async (request) => {
    const currentUser = requireCurrentUser(request);
    return getResolvedSettingsForUser(app.db, currentUser);
  });

  app.put<{ Body: SetSettingValueRequest }>(
    "/settings/values",
    { schema: { body: setSettingBodySchema, response: { 200: objectResponseSchema } } },
    async (request) => {
      const currentUser = requireCurrentUser(request);
      return setSettingValue(app.db, currentUser, request.body);
    }
  );

  app.delete<{ Body: DeleteSettingValueRequest }>(
    "/settings/values",
    { schema: { body: deleteSettingBodySchema, response: { 200: objectResponseSchema } } },
    async (request) => {
      const currentUser = requireCurrentUser(request);
      return deleteSettingValue(app.db, currentUser, request.body);
    }
  );
}
