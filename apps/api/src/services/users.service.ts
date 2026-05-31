import type { AdminUser, AdminUserInput, AdminUserUpdate, Role, UserOption } from "@taskmanager/shared-types";
import bcrypt from "bcryptjs";
import type { DbClient } from "../db/client.js";
import { roleRepository } from "../repositories/role.repository.js";
import { userRepository, type UserRecord, type UserUpdateData } from "../repositories/user.repository.js";
import { badRequest, conflict, notFound } from "../utils/errors.js";
import { cleanNullable, requireNonEmpty } from "./helpers.js";
import { hasAnotherActiveAdmin, mapRole } from "./roles.service.js";

const passwordSaltRounds = 12;

// TTL-Cache für User-Lookups (10 Minuten) — wird bei jedem mapTask/mapMilestone/mapProject aufgerufen
const USER_CACHE_TTL = 10 * 60 * 1000;
const userOptionCache = new Map<number, { value: UserOption; expiresAt: number }>();

function getCachedUserOption(id: number): UserOption | undefined {
  const entry = userOptionCache.get(id);
  if (entry && Date.now() < entry.expiresAt) {
    return entry.value;
  }
  userOptionCache.delete(id);
  return undefined;
}

function setCachedUserOption(id: number, value: UserOption): void {
  userOptionCache.set(id, { value, expiresAt: Date.now() + USER_CACHE_TTL });
}

export function invalidateUserOptionCache(id?: number): void {
  if (id !== undefined) {
    userOptionCache.delete(id);
  } else {
    userOptionCache.clear();
  }
}
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$|^admin@local$/;

function normalizeEmail(value: string | undefined): string {
  const email = requireNonEmpty(value, "email").toLowerCase();
  if (!emailPattern.test(email)) {
    throw badRequest("email must be a valid email address");
  }
  return email;
}

function normalizeName(value: string | undefined, field: string): string {
  return requireNonEmpty(value, field);
}

function assertPassword(value: string | undefined, required: boolean): string | undefined {
  if (value === undefined || value.length === 0) {
    if (required) {
      throw badRequest("password is required");
    }
    return undefined;
  }
  if (value.length < 8) {
    throw badRequest("password must contain at least 8 characters");
  }
  return value;
}

async function resolveRole(database: DbClient, roleId: number): Promise<Role> {
  const role = await roleRepository.findById(database, roleId);
  if (!role) {
    throw badRequest(`Role with id ${roleId} does not exist`);
  }
  return mapRole(role, await roleRepository.findPermissionsByRoleId(database, role.id));
}

export async function mapAdminUser(database: DbClient, record: UserRecord): Promise<AdminUser> {
  const role = await resolveRole(database, record.roleId);
  return {
    id: record.id,
    firstName: record.firstName,
    lastName: record.lastName,
    fullName: record.fullName,
    address: record.address,
    phone: record.phone,
    email: record.email,
    role,
    isActive: record.isActive,
    version: record.version,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

export async function listAdminUsers(database: DbClient): Promise<AdminUser[]> {
  const users = await userRepository.findAll(database);
  return Promise.all(users.map((user) => mapAdminUser(database, user)));
}

export function mapUserOption(record: UserRecord): UserOption {
  return {
    id: record.id,
    firstName: record.firstName,
    lastName: record.lastName,
    fullName: record.fullName,
    email: record.email
  };
}

export async function listUserOptions(database: DbClient): Promise<UserOption[]> {
  return (await userRepository.findActive(database)).map(mapUserOption);
}

export async function getUserOption(database: DbClient, id: number | null | undefined): Promise<UserOption | null> {
  if (id === null || id === undefined) {
    return null;
  }
  const cached = getCachedUserOption(id);
  if (cached) {
    return cached;
  }
  const user = await userRepository.findById(database, id);
  const option = user ? mapUserOption(user) : null;
  if (option) {
    setCachedUserOption(id, option);
  }
  return option;
}

export async function normalizeAssignableUserId(database: DbClient, value: number | null | undefined, field: string): Promise<number | null> {
  if (value === null || value === undefined) {
    return null;
  }
  if (!Number.isInteger(value) || value < 1) {
    throw badRequest(`${field} must reference a valid user`);
  }
  const user = await userRepository.findById(database, value);
  if (!user || !user.isActive) {
    throw badRequest(`User with id ${value} does not exist or is inactive`);
  }
  return user.id;
}

export async function getAdminUser(database: DbClient, id: number): Promise<AdminUser> {
  const user = await userRepository.findById(database, id);
  if (!user) {
    throw notFound(`User with id ${id} not found`);
  }
  return mapAdminUser(database, user);
}

export async function createAdminUser(database: DbClient, input: AdminUserInput): Promise<AdminUser> {
  const email = normalizeEmail(input.email);
  if (await userRepository.findByEmail(database, email)) {
    throw conflict(`User with email ${email} already exists`);
  }
  const password = assertPassword(input.password, true);
  const passwordHash = await bcrypt.hash(password ?? "", passwordSaltRounds);
  const role = await resolveRole(database, input.roleId);
  const created = await userRepository.create(database, {
    firstName: normalizeName(input.firstName, "firstName"),
    lastName: normalizeName(input.lastName, "lastName"),
    address: cleanNullable(input.address) ?? null,
    phone: cleanNullable(input.phone) ?? null,
    email,
    // cache needn't be primed for new user — no refs yet
    passwordHash,
    roleId: role.id,
    isActive: input.isActive ?? true
  });
  return mapAdminUser(database, created);
}

async function assertLastAdminCanChange(database: DbClient, current: UserRecord, values: UserUpdateData): Promise<void> {
  const currentRole = await roleRepository.findById(database, current.roleId);
  if (currentRole?.key !== "admin" || !current.isActive) {
    return;
  }
  const nextRole = values.roleId !== undefined ? await roleRepository.findById(database, values.roleId) : currentRole;
  const staysActiveAdmin = (values.isActive ?? current.isActive) && nextRole?.key === "admin";
  if (!staysActiveAdmin && !(await hasAnotherActiveAdmin(database, current.id))) {
    throw conflict("At least one active admin user must remain");
  }
}

export async function updateAdminUser(database: DbClient, id: number, input: AdminUserUpdate): Promise<AdminUser> {
  const current = await userRepository.findById(database, id);
  if (!current) {
    throw notFound(`User with id ${id} not found`);
  }

  const values: UserUpdateData = {};
  if (input.firstName !== undefined) {
    values.firstName = normalizeName(input.firstName, "firstName");
  }
  if (input.lastName !== undefined) {
    values.lastName = normalizeName(input.lastName, "lastName");
  }
  if (input.address !== undefined) {
    values.address = cleanNullable(input.address) ?? null;
  }
  if (input.phone !== undefined) {
    values.phone = cleanNullable(input.phone) ?? null;
  }
  if (input.email !== undefined) {
    const email = normalizeEmail(input.email);
    const existing = await userRepository.findByEmail(database, email);
    if (existing && existing.id !== id) {
      throw conflict(`User with email ${email} already exists`);
    }
    values.email = email;
  }
  if (input.roleId !== undefined) {
    values.roleId = (await resolveRole(database, input.roleId)).id;
  }
  if (input.isActive !== undefined) {
    values.isActive = input.isActive;
  }
  const password = assertPassword(input.password, false);
  if (password !== undefined) {
    values.passwordHash = await bcrypt.hash(password, passwordSaltRounds);
  }

  await assertLastAdminCanChange(database, current, values);
  const updated = await userRepository.update(database, id, input.expectedVersion, values);
  if (!updated) {
    throw notFound(`User with id ${id} not found`);
  }
  invalidateUserOptionCache(id);
  return mapAdminUser(database, updated);
}

export async function deleteAdminUser(database: DbClient, id: number, actorUserId: number): Promise<void> {
  if (id === actorUserId) {
    throw badRequest("Admins cannot delete their own user");
  }
  const current = await userRepository.findById(database, id);
  if (!current) {
    throw notFound(`User with id ${id} not found`);
  }
  await assertLastAdminCanChange(database, current, { isActive: false });
  await userRepository.delete(database, id);
  invalidateUserOptionCache(id);
}
