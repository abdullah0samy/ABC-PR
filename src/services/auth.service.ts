import { post, getToken as getStoredToken, setToken } from "./api-client";
import type { User } from "../types";

const USER_KEY = "nuzul_pr_user";

export function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as User;
  } catch {
    try {
      localStorage.removeItem(USER_KEY);
    } catch {
      // ignore
    }
    return null;
  }
}

function persistUser(user: User): void {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    // ignore
  }
}

function clearUser(): void {
  try {
    localStorage.removeItem(USER_KEY);
  } catch {
    // ignore
  }
}

export interface LoginResult {
  user: User;
  token: string;
}

export async function login(username: string, password: string): Promise<LoginResult> {
  const data = await post<LoginResult>("/api/auth/login", { username, password });
  setToken(data.token);
  persistUser(data.user);
  return data;
}

export function logout(): void {
  setToken(null);
  clearUser();
}

export { getStoredToken as getToken };
