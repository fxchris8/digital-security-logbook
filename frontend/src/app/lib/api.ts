import axios, { AxiosError } from "axios";

import { UninterceptedApiError } from "../types/api";

export const BASE_URL = process.env.NEXT_PUBLIC_API_ENDPOINT || "http://localhost:8080";

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 20000,
  timeoutErrorMessage: "Periksa kembali koneksi internet Anda.",
});

api.interceptors.response.use(
  (config) => config,
  (error: AxiosError<UninterceptedApiError>) => {
    const apiMessage = error.response?.data.message ?? error.response?.data.error;

    if (apiMessage) {
      const firstMessage =
        typeof apiMessage === "string" ? apiMessage : Object.values(apiMessage)[0];
      const message =
        typeof firstMessage === "string" ? firstMessage : firstMessage?.[0] || "Terjadi kesalahan";

      error.message = message;
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

export default api;
