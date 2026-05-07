"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { BASE_URL, api } from "../../lib/api";
import type { ApiResponse, IPaginationData, IPaginationRequest } from "@/types/global-types";

export interface LogbookEntry {
  id: number;
  tanggal: string;
  waktuMasuk: string;
  waktuKeluar: string;
  nama: string;
  nomorTelepon: string;
  alamat: string;
  nomorPolisiKendaraan: string;
  fotoTandaPengenal: string;
  perusahaan: string;
  janjiBertemuDengan: string;
  keperluan: string;
}

export interface LogbookFormData {
  tanggal?: string;
  nama: string;
  nomorTelepon: string;
  alamat: string;
  nomorPolisiKendaraan: string;
  fotoTandaPengenal: string;
  perusahaan: string;
  janjiBertemuDengan: string;
  keperluan: string;
}

export interface LogbookQRCode {
  logbookId: number;
  checkoutUrl: string;
  qrImageUrl: string;
}

export interface LogbookQRResponse {
  logbook: LogbookEntry;
  qr: LogbookQRCode;
}

export interface LogbookPhotoUploadResponse {
  path: string;
  url: string;
}

export const logbookKeys = {
  all: ["logbooks"] as const,
  list: () => [...logbookKeys.all, "list"] as const,
  paginated: (request: IPaginationRequest) => [...logbookKeys.list(), request] as const,
};

const QR_SIZE = "320x320";

const getNormalizedBaseURL = () => (BASE_URL || "http://localhost:8080").trim().replace(/\/+$/, "");

export const resolveLogbookPhotoSrc = (value?: string | null) => {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    return "";
  }
  if (/^(https?:|data:|blob:)/i.test(trimmed)) {
    return trimmed;
  }
  if (trimmed.startsWith("/")) {
    return `${getNormalizedBaseURL()}${trimmed}`;
  }

  return `${getNormalizedBaseURL()}/${trimmed}`;
};

const buildCheckoutURL = (sourceURL: string) => {
  const normalizedBaseURL = getNormalizedBaseURL();

  try {
    const parsedURL = new URL(sourceURL);
    const token = parsedURL.searchParams.get("token");
    if (!token) {
      return sourceURL;
    }

    return `${normalizedBaseURL}/api/logbooks/checkout?token=${encodeURIComponent(token)}`;
  } catch {
    return sourceURL;
  }
};

const buildQRCodeImageURL = (checkoutURL: string) => {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${QR_SIZE}&data=${encodeURIComponent(checkoutURL)}`;
};

const normalizeLogbookQRResponse = (response: LogbookQRResponse) => {
  const checkoutURL = buildCheckoutURL(response.qr.checkoutUrl);

  return {
    ...response,
    qr: {
      ...response.qr,
      checkoutUrl: checkoutURL,
      qrImageUrl: buildQRCodeImageURL(checkoutURL),
    },
  };
};

export function useGetLogbooks(paginationRequest: IPaginationRequest) {
  return useQuery<IPaginationData<LogbookEntry>, Error>({
    queryKey: logbookKeys.paginated(paginationRequest),
    queryFn: async () => {
      const params: Record<string, string> = {
        anchor_id: (paginationRequest.anchorId ?? 0).toString(),
        page: paginationRequest.page,
        page_size: String(paginationRequest.pageSize),
      };

      if (paginationRequest.query) {
        params.query = paginationRequest.query;
      }

      const response = await api.get<ApiResponse<IPaginationData<LogbookEntry>>>("/api/logbooks", {
        params,
      });

      if (!response.data) {
        throw new Error("Failed to fetch logbook data");
      }

      return response.data.data;
    },
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useGenerateLogbookQR() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: LogbookFormData) => {
      const response = await api.post<ApiResponse<LogbookQRResponse>>(
        "/api/logbooks/generate-qr",
        data
      );
      return normalizeLogbookQRResponse(response.data.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: logbookKeys.all });
    },
  });
}

export function useUploadLogbookPhoto() {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      const response = await api.post<ApiResponse<LogbookPhotoUploadResponse>>(
        "/api/logbooks/upload-photo",
        formData
      );
      return response.data.data;
    },
  });
}

export function useUpdateLogbook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: LogbookFormData }) => {
      const response = await api.put<ApiResponse<LogbookEntry>>(`/api/logbooks/${id}`, data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: logbookKeys.all });
    },
  });
}

export function useGetLogbookQR() {
  return useMutation({
    mutationFn: async (id: number) => {
      const response = await api.get<ApiResponse<LogbookQRResponse>>(`/api/logbooks/${id}/qr`);
      return normalizeLogbookQRResponse(response.data.data);
    },
  });
}

export function useDeleteLogbook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/api/logbooks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: logbookKeys.all });
    },
  });
}
