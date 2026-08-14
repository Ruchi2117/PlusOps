import axios from "axios";
import type { InternalAxiosRequestConfig } from "axios";
import type { RefreshResponse } from "@plusops/contracts";

type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "",
  withCredentials: true,
  timeout: 10_000
});

let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

export function setApiAccessToken(token: string | null) {
  accessToken = token;
}

export function getApiAccessToken() {
  return accessToken;
}

apiClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error) || error.response?.status !== 401 || !error.config) {
      throw error;
    }

    const config = error.config as RetriableRequestConfig;

    if (config._retry || isAuthEndpoint(config.url)) {
      throw error;
    }

    config._retry = true;

    refreshPromise ??= apiClient
      .post<RefreshResponse>("/api/v1/auth/refresh")
      .then((response) => {
        setApiAccessToken(response.data.accessToken);
        return response.data.accessToken;
      })
      .catch(() => {
        setApiAccessToken(null);
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });

    const token = await refreshPromise;

    if (!token) {
      throw error;
    }

    config.headers.Authorization = `Bearer ${token}`;
    return apiClient.request(config);
  }
);

function isAuthEndpoint(url: string | undefined): boolean {
  return Boolean(
    url?.includes("/auth/login") ||
      url?.includes("/auth/signup") ||
      url?.includes("/auth/refresh") ||
      url?.includes("/auth/logout")
  );
}
