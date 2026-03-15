import bcrypt from "bcryptjs";
import { query, queryOne } from "./db";
import { randomUUID } from "crypto";

export interface User {
  id: string;
  email: string;
  name: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Hash a password
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Verify a password
 */
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

/**
 * Create a new user
 */
export async function createUser(
  email: string,
  password: string,
  name?: string
): Promise<User> {
  const id = randomUUID();
  const passwordHash = await hashPassword(password);

  await query(
    `INSERT INTO users (id, email, password_hash, name) 
     VALUES (?, ?, ?, ?)`,
    [id, email, passwordHash, name || null]
  );

  const user = await queryOne<User>(
    "SELECT id, email, name, created_at, updated_at FROM users WHERE id = ?",
    [id]
  );

  if (!user) {
    throw new Error("Failed to create user");
  }

  return user;
}

/**
 * Find user by email
 */
export async function findUserByEmail(email: string): Promise<User | null> {
  return queryOne<User>(
    "SELECT id, email, name, created_at, updated_at FROM users WHERE email = ?",
    [email]
  );
}

/**
 * Find user by ID
 */
export async function findUserById(id: string): Promise<User | null> {
  return queryOne<User>(
    "SELECT id, email, name, created_at, updated_at FROM users WHERE id = ?",
    [id]
  );
}

/**
 * Get user with password hash (for authentication)
 */
export async function getUserWithPassword(
  email: string
): Promise<(User & { password_hash: string }) | null> {
  return queryOne<User & { password_hash: string }>(
    "SELECT id, email, name, password_hash, created_at, updated_at FROM users WHERE email = ?",
    [email]
  );
}

/**
 * Authenticate user (verify email and password)
 */
export async function authenticateUser(
  email: string,
  password: string
): Promise<User | null> {
  const user = await getUserWithPassword(email);

  if (!user) {
    return null;
  }

  const isValid = await verifyPassword(password, user.password_hash);

  if (!isValid) {
    return null;
  }

  // Return user without password hash
  const { password_hash, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

