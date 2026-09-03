import { api } from "../lib/api";

export interface Admin {
  id: string;
  email: string;
}

interface AdminAuthResponse {
  success: boolean;
  data: {
    admin: Admin;
  };
}

export async function adminLogin(
  email: string,
  password: string,
) {
  const response = await api.post<AdminAuthResponse>("/admin/login", {
    email,
    password,
  });

  return response.data;
}

export async function getCurrentAdmin() {
  const response = await api.get<AdminAuthResponse>("/admin/me");

  return response.data;
}

export async function adminLogout() {
  const response = await api.post("/admin/logout", {});

  return response.data;
}
