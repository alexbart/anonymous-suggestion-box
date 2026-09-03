import axios, { type AxiosError } from "axios";

export const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL ?? "http://localhost:3001/api/v1",
  timeout: 30_000,
  withCredentials: true,
});

function isAdminRequest(error: AxiosError): boolean {
  const url = error.config?.url ?? "";
  return url.includes("/admin/");
}

function isLoginRequest(error: AxiosError): boolean {
  const url = error.config?.url ?? "";
  return url.endsWith("/admin/login") || url.endsWith("/admin/me");
}

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status;

    if (status === 401 && isAdminRequest(error) && !isLoginRequest(error)) {
      window.dispatchEvent(new CustomEvent("admin:unauthorized"));
    }

    return Promise.reject(error);
  },
);
