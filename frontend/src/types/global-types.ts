export type PageType = "prev" | "next";

export interface ApiResponse<T> {
  status: string;
  code: number;
  data: T;
}

export interface IPaginationData<T> {
  results: T[];
  first_id: number | null;
  last_id: number | null;
  page_size: number;
  has_more: boolean;
  first_page: boolean;
}

export interface IPaginationRequest {
  anchorId: number | null;
  page: PageType;
  pageSize: number;
  filter: string;
  query?: string;
}
