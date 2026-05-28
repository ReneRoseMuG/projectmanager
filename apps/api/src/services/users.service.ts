import type { AdminUser, AdminUserInput, AdminUserUpdate, Role, UserOption } from "@taskmanager/shared-types";
import bcrypt from "bcryptjs";
import type { DbClient } from "../db/client.js";
import { roleRepository } from "../repositories/role.repository.js";
import { userRepository, type UserRecord, type UserUpdateData } from "../repositories/user.repository.js";
import { badRequest, conflict, notFound } from "../utils/errors.js";
import { cleanNullable, requireNonEmpty } from "./helpers.js";
import { hasAnotherActiveAdmin, mapRole } from "./roles.service.js";

const passwordSaltRounds = 12;
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

function resolveRole(database: DbClient, roleId: number): Role {
  const role = roleRepository.findById(database, roleId);
  if (!role) {
    throw badRequest(`Role with id ${roleId} does not exist`);
  }
  return mapRole(role, roleRepository.findPermissionsByRoleId(database, role.id));
}

export function mapAdminUser(database: DbClient, record: UserRecord): AdminUser {
  const role = resolveRole(database, record.roleId);
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

export function listAdminUsers(database: DbClient): AdminUser[] {
  return userRepository.findAll(database).map((user) => mapAdminUser(database, user));
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

export function listUserOptions(database: DbClient): UserOption[] {
  return userRepository.findActive(database).map(mapUserOption);
}

export function getUserOption(database: DbClient, id: number | null | undefined): UserOption | null {
  if (id === null || id === undefined) {
    return null;
  }
  const user = userRepository.findById(database, id);
  return user ? mapUserOption(user) : null;
}

export function normalizeAssignableUserId(database: DbClient, value: number | null | undefined, field: string): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (!Number.isInteger(value) || value < 1) {
    throw badRequest(`${field} must reference a valid user`);
  }
  const user = userRepository.findById(database, value);
  if (!user || !user.isActive) {
    throw badRequest(`User with id ${value} does not exist or is inactive`);
  }
  return user.id;
}

export function getAdminUser(database: DbClient, id: number): AdminUser {
  const user = userRepository.findById(database, id);
  if (!user) {
    throw notFound(`User with id ${id} not found`);
  }
  return mapAdminUser(database, user);
}

export async function createAdminUser(database: DbClient, input: AdminUserInput): Promise<AdminUser> {
  const email = normalizeEmail(input.email);
  if (userRepository.findByEmail(database, email)) {
    throw conflict(`User with email ${email} already exists`);
  }
  const password = assertPassword(input.password, true);
  const passwordHash = await bcrypt.hash(password ?? "", passwordSaltRounds);
  const role = resolveRole(database, input.roleId);
  const created = userRepository.create(database, {
    firstName: normalizeName(input.firstName, "firstName"),
    lastName: normalizeName(input.lastName, "lastName"),
    address: cleanNullable(input.address) ?? null,
    phone: cleanNullable(input.phone) ?? null,
    email,
    passwordHash,
    roleId: role.id,
    isActive: input.isActive ?? true
  });
  return mapAdminUser(database, created);
}

function assertLastAdminCanChange(database: DbClient, current: UserRecord, values: UserUpdateData): void {
  const currentRole = roleRepository.findById(database, current.roleId);
  if (currentRole?.key !== "admin" || !current.isActive) {
    return;
  }
  const nextRole = values.roleId !== undefined ? roleRepository.findById(database, values.roleId) : currentRole;
  const staysActiveAdmin = (values.isActive ?? current.isActive) && nextRole?.key === "admin";
  if (!staysActiveAdmin && !hasAnotherActiveAdmin(database, current.id)) {
    throw conflict("At least one active admin user must remain");
  }
}

export async function updateAdminUser(database: DbClient, id: number, input: AdminUserUpdate): Promise<AdminUser> {
  const current = userRepository.findById(database, id);
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
    const existing = userRepository.findByEmail(database, email);
    if (existing && existing.id !== id) {
      throw conflict(`User with email ${email} already exists`);
    }
    values.email = email;
  }
  if (input.roleId !== undefined) {
    values.roleId = resolveRole(database, input.roleId).id;
  }
  if (input.isActive !== undefined) {
    values.isActive = input.isActive;
  }
  const password = assertPassword(input.password, false);
  if (password !== undefined) {
    values.passwordHash = await bcrypt.hash(password, passwordSaltRounds);
  }

  assertLastAdminCanChange(database, current, values);
  const updated = userRepository.update(database, id, input.expectedVersion, values);
  if (!updated) {
    throw notFound(`User with id ${id} not found`);
  }
  return mapAdminUser(database, updated);
}

export function deleteAdminUser(database: DbClient, id: number, actorUserId: number): void {
  if (id === actorUserId) {
    throw badRequest("Admins cannot delete their own user");
  }
  const current = userRepository.findById(database, id);
  if (!current) {
    throw notFound(`User with id ${id} not found`);
  }
  assertLastAdminCanChange(database, current, { isActive: false });
  userRepository.delete(database, id);
}
