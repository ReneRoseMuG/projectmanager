import type { CurrentUser, LoginRequest, SetPasswordRequest } from "@taskmanager/shared-types";
import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import type { AppConfig } from "../config.js";
import { config } from "../config.js";
import type { DbClient } from "../db/client.js";
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

function getAdminSetupDone(database: DbClient): boolean {
  const row = database.select().from(appSettings).where(eq(appSettings.key, adminSetupSettingKey)).get();
  return row?.value === "true";
}

function setAppSetting(database: DbClient, key: string, value: string): void {
  database
    .insert(appSettings)
    .values({ key, value, updatedAt: new Date().toISOString() })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value, updatedAt: new Date().toISOString() }
    })
    .run();
}

function isFirstLoginAdmin(database: DbClient, user: UserRecord, appConfig: AppConfig): boolean {
  return !getAdminSetupDone(database) && user.email === appConfig.adminEmail.toLowerCase();
}

export function mapCurrentUser(database: DbClient, user: UserRecord, appConfig: AppConfig = config): CurrentUser {
  const role = database.select().from(roles).where(eq(roles.id, user.roleId)).get();
  if (!role) {
    throw unauthorized("Invalid session");
  }
  const permissionRecords = database.select().from(permissions).where(eq(permissions.roleId, role.id)).all();
  const mappedRole = mapRole(role, permissionRecords);
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: user.fullName,
    email: user.email,
    role: mappedRole,
    permissions: mappedRole.permissions,
    requiresPasswordSetup: isFirstLoginAdmin(database, user, appConfig)
  };
}

export async function login(database: DbClient, input: LoginRequest, appConfig: AppConfig = config): Promise<CurrentUser> {
  const email = normalizeEmail(input.email);
  const user = userRepository.findByEmail(database, email);
  if (!user) {
    throw unauthorized("Invalid email or password");
  }
  if (!user.isActive) {
    throw forbidden("Account is disabled");
  }

  const firstLogin = isFirstLoginAdmin(database, user, appConfig);
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

export function getCurrentUser(database: DbClient, userId: number, appConfig: AppConfig = config): CurrentUser {
  const user = userRepository.findById(database, userId);
  if (!user || !user.isActive) {
    throw unauthorized("Invalid session");
  }
  return mapCurrentUser(database, user, appConfig);
}

export function getBypassAdminUser(database: DbClient, appConfig: AppConfig = config): CurrentUser {
  const user = userRepository.findByEmail(database, appConfig.adminEmail.toLowerCase());
  if (!appConfig.authBypassAdmin || !user || !user.isActive) {
    throw unauthorized("Authentication required");
  }
  return { ...mapCurrentUser(database, user, appConfig), requiresPasswordSetup: false };
}

export async function setInitialPassword(database: DbClient, userId: number, input: SetPasswordRequest, appConfig: AppConfig = config): Promise<CurrentUser> {
  const user = userRepository.findById(database, userId);
  if (!user || !user.isActive || !isFirstLoginAdmin(database, user, appConfig)) {
    throw forbidden("Password setup is not available");
  }
  const password = requireNonEmpty(input.password, "password");
  if (password.length < 8) {
    throw badRequest("password must contain at least 8 characters");
  }
  const passwordHash = await bcrypt.hash(password, passwordSaltRounds);
  const updated = userRepository.update(database, user.id, user.version, { passwordHash });
  if (!updated) {
    throw unauthorized("Invalid session");
  }
  setAppSetting(database, adminSetupSettingKey, "true");
  return mapCurrentUser(database, updated, appConfig);
}

export async function seedAuthData(database: DbClient, appConfig: AppConfig = config): Promise<void> {
  const adminEmail = appConfig.adminEmail.toLowerCase();
  const passwordHash = appConfig.adminInitialPassword ? await bcrypt.hash(appConfig.adminInitialPassword, passwordSaltRounds) : null;
  database.transaction((tx) => {
    for (const role of SYSTEM_ROLES) {
      tx.insert(roles)
        .values({
          key: role.key,
          label: role.label,
          isSystem: role.isSystem,
          version: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
        .onConflictDoNothing()
        .run();
      const roleRecord = tx.select().from(roles).where(eq(roles.key, role.key)).get();
      if (roleRecord) {
        for (const permission of role.permissions) {
          tx.insert(permissions)
            .values({ roleId: roleRecord.id, resource: permission.resource, action: permission.action })
            .onConflictDoNothing()
            .run();
        }
      }
    }

    const setupRow = tx.select().from(appSettings).where(eq(appSettings.key, adminSetupSettingKey)).get();
    if (setupRow) {
      return;
    }

    const adminRole = tx.select().from(roles).where(eq(roles.key, "admin")).get();
    if (!adminRole) {
      throw new Error("Admin role seed failed");
    }
    const existingAdmin = tx.select().from(users).where(eq(users.email, adminEmail)).get();
    const now = new Date().toISOString();
    if (existingAdmin) {
      tx.update(users)
        .set({
          firstName: appConfig.adminFirstName,
          lastName: appConfig.adminLastName,
          passwordHash,
          roleId: adminRole.id,
          isActive: true,
          updatedAt: now
        })
        .where(eq(users.id, existingAdmin.id))
        .run();
    } else {
      tx.run(sql`insert into users (name, first_name, last_name, email, password_hash, role_id, is_active, version, created_at, updated_at)
        values ('', ${appConfig.adminFirstName}, ${appConfig.adminLastName}, ${adminEmail}, ${passwordHash}, ${adminRole.id}, 1, 1, ${now}, ${now})`);
    }
    tx.insert(appSettings)
      .values({
        key: adminSetupSettingKey,
        value: appConfig.adminInitialPassword ? "true" : "false",
        updatedAt: now
      })
      .onConflictDoNothing()
      .run();
  });
}
