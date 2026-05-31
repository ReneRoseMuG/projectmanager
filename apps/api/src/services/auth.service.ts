import type { CurrentUser, LoginRequest, SetPasswordRequest } from "@taskmanager/shared-types";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import type { AppConfig } from "../config.js";
import { config } from "../config.js";
import type { DbClient } from "../db/client.js";
import { firstRow } from "../db/query-utils.js";
import { appSettings, permissions, roles, users } from "../db/schema.js";
import { userRepository, type UserRecord } from "../repositories/user.repository.js";
import { badRequest, forbidden, unauthorized } from "../utils/errors.js";
import { requireNonEmpty } from "./helpers.js";
import { mapRole, SYSTEM_ROLES } from "./roles.service.js";

const adminSetupSettingKey = "admin_setup_done";
const passwordSaltRounds = 12;

function normalizeEmail(value: string | undefined): string {
  return requireNonEmpty(value, "email").toLowerCase();
}

async function getAdminSetupDone(database: DbClient): Promise<boolean> {
  const row = firstRow(await database.select().from(appSettings).where(eq(appSettings.key, adminSetupSettingKey)));
  return row?.value === "true";
}

async function setAppSetting(database: DbClient, key: string, value: string): Promise<void> {
  await database
    .insert(appSettings)
    .values({ key, value, updatedAt: new Date().toISOString() })
    .onDuplicateKeyUpdate({
      set: { value, updatedAt: new Date().toISOString() }
    });
}

async function isFirstLoginAdmin(database: DbClient, user: UserRecord, appConfig: AppConfig): Promise<boolean> {
  return !(await getAdminSetupDone(database)) && user.email === appConfig.adminEmail.toLowerCase();
}

export async function mapCurrentUser(database: DbClient, user: UserRecord, appConfig: AppConfig = config): Promise<CurrentUser> {
  const role = firstRow(await database.select().from(roles).where(eq(roles.id, user.roleId)));
  if (!role) {
    throw unauthorized("Invalid session");
  }
  const permissionRecords = await database.select().from(permissions).where(eq(permissions.roleId, role.id));
  const mappedRole = mapRole(role, permissionRecords);
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: user.fullName,
    email: user.email,
    role: mappedRole,
    permissions: mappedRole.permissions,
    requiresPasswordSetup: await isFirstLoginAdmin(database, user, appConfig)
  };
}

export async function login(database: DbClient, input: LoginRequest, appConfig: AppConfig = config): Promise<CurrentUser> {
  const email = normalizeEmail(input.email);
  const user = await userRepository.findByEmail(database, email);
  if (!user) {
    throw unauthorized("Invalid email or password");
  }
  if (!user.isActive) {
    throw forbidden("Account is disabled");
  }

  const firstLogin = await isFirstLoginAdmin(database, user, appConfig);
  if (firstLogin && !user.passwordHash && (input.password === undefined || input.password.length === 0)) {
    return mapCurrentUser(database, user, appConfig);
  }
  if (!user.passwordHash || !input.password) {
    throw unauthorized("Invalid email or password");
  }
  const matches = await bcrypt.compare(input.password, user.passwordHash);
  if (!matches) {
    throw unauthorized("Invalid email or password");
  }
  return mapCurrentUser(database, user, appConfig);
}

export async function getCurrentUser(database: DbClient, userId: number, appConfig: AppConfig = config): Promise<CurrentUser> {
  const user = await userRepository.findById(database, userId);
  if (!user || !user.isActive) {
    throw unauthorized("Invalid session");
  }
  return mapCurrentUser(database, user, appConfig);
}

export async function getBypassAdminUser(database: DbClient, appConfig: AppConfig = config): Promise<CurrentUser> {
  const user = await userRepository.findByEmail(database, appConfig.adminEmail.toLowerCase());
  if (!appConfig.authBypassAdmin || !user || !user.isActive) {
    throw unauthorized("Authentication required");
  }
  return { ...(await mapCurrentUser(database, user, appConfig)), requiresPasswordSetup: false };
}

export async function loginConfiguredAdmin(database: DbClient, appConfig: AppConfig = config): Promise<CurrentUser> {
  const user = await userRepository.findByEmail(database, appConfig.adminEmail.toLowerCase());
  if (!user) {
    throw unauthorized("Authentication required");
  }
  if (!user.isActive) {
    throw forbidden("Account is disabled");
  }
  await setAppSetting(database, adminSetupSettingKey, "true");
  return { ...(await mapCurrentUser(database, user, appConfig)), requiresPasswordSetup: false };
}

export async function getApiKeyAdminUser(database: DbClient, appConfig: AppConfig = config): Promise<CurrentUser> {
  const user = await userRepository.findByEmail(database, appConfig.adminEmail.toLowerCase());
  if (!appConfig.apiKey || !user || !user.isActive) {
    throw unauthorized("Authentication required");
  }
  return { ...(await mapCurrentUser(database, user, appConfig)), requiresPasswordSetup: false };
}

export async function setInitialPassword(database: DbClient, userId: number, input: SetPasswordRequest, appConfig: AppConfig = config): Promise<CurrentUser> {
  const user = await userRepository.findById(database, userId);
  if (!user || !user.isActive || !(await isFirstLoginAdmin(database, user, appConfig))) {
    throw forbidden("Password setup is not available");
  }
  const password = requireNonEmpty(input.password, "password");
  if (password.length < 8) {
    throw badRequest("password must contain at least 8 characters");
  }
  const passwordHash = await bcrypt.hash(password, passwordSaltRounds);
  const updated = await userRepository.update(database, user.id, user.version, { passwordHash });
  if (!updated) {
    throw unauthorized("Invalid session");
  }
  await setAppSetting(database, adminSetupSettingKey, "true");
  return mapCurrentUser(database, updated, appConfig);
}

export async function seedAuthData(database: DbClient, appConfig: AppConfig = config): Promise<void> {
  const adminEmail = appConfig.adminEmail.toLowerCase();
  const passwordHash = appConfig.adminInitialPassword ? await bcrypt.hash(appConfig.adminInitialPassword, passwordSaltRounds) : null;
  await database.transaction(async (tx) => {
    for (const role of SYSTEM_ROLES) {
      await tx.insert(roles)
        .ignore()
        .values({
          key: role.key,
          label: role.label,
          isSystem: role.isSystem,
          version: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      const roleRecord = firstRow(await tx.select().from(roles).where(eq(roles.key, role.key)));
      if (roleRecord) {
        for (const permission of role.permissions) {
          await tx.insert(permissions)
            .ignore()
            .values({ roleId: roleRecord.id, resource: permission.resource, action: permission.action });
        }
      }
    }

    const setupRow = firstRow(await tx.select().from(appSettings).where(eq(appSettings.key, adminSetupSettingKey)));
    if (setupRow) {
      return;
    }

    const adminRole = firstRow(await tx.select().from(roles).where(eq(roles.key, "admin")));
    if (!adminRole) {
      throw new Error("Admin role seed failed");
    }
    const existingAdmin = firstRow(await tx.select().from(users).where(eq(users.email, adminEmail)));
    const now = new Date().toISOString();
    if (existingAdmin) {
      await tx.update(users)
        .set({
          firstName: appConfig.adminFirstName,
          lastName: appConfig.adminLastName,
          passwordHash,
          roleId: adminRole.id,
          isActive: true,
          updatedAt: now
        })
        .where(eq(users.id, existingAdmin.id));
    } else {
      const fullName = `${appConfig.adminFirstName} ${appConfig.adminLastName}`.trim();
      await tx.insert(users).values({
        name: fullName,
        firstName: appConfig.adminFirstName,
        lastName: appConfig.adminLastName,
        fullName,
        email: adminEmail,
        passwordHash,
        roleId: adminRole.id,
        isActive: true,
        version: 1,
        createdAt: now,
        updatedAt: now
      });
    }
    await tx.insert(appSettings)
      .ignore()
      .values({
        key: adminSetupSettingKey,
        value: appConfig.adminInitialPassword ? "true" : "false",
        updatedAt: now
      });
  });
}
