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

export async function adminLogin(email: string, password: string) {
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

export type SuggestionStatus =
  | "NEW"
  | "UNDER_REVIEW"
  | "PENDING"
  | "ACTIONED"
  | "CLOSED";

export type SuggestionCategory =
  | "PATIENT_CARE"
  | "STAFFING"
  | "EQUIPMENT"
  | "WORKPLACE_SAFETY"
  | "STAFF_WELFARE"
  | "MANAGEMENT"
  | "COMMUNICATION"
  | "OTHER";

export type SuggestionPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export const SUGGESTION_STATUSES: SuggestionStatus[] = [
  "NEW",
  "UNDER_REVIEW",
  "PENDING",
  "ACTIONED",
  "CLOSED",
];

export const SUGGESTION_CATEGORIES: SuggestionCategory[] = [
  "PATIENT_CARE",
  "STAFFING",
  "EQUIPMENT",
  "WORKPLACE_SAFETY",
  "STAFF_WELFARE",
  "MANAGEMENT",
  "COMMUNICATION",
  "OTHER",
];

export const SUGGESTION_PRIORITIES: SuggestionPriority[] = [
  "LOW",
  "NORMAL",
  "HIGH",
  "URGENT",
];

export const STATUS_LABELS: Record<SuggestionStatus, string> = {
  NEW: "New",
  UNDER_REVIEW: "Under Review",
  PENDING: "Pending",
  ACTIONED: "Actioned",
  CLOSED: "Closed",
};

export const CATEGORY_LABELS: Record<SuggestionCategory, string> = {
  PATIENT_CARE: "Patient Care",
  STAFFING: "Staffing",
  EQUIPMENT: "Equipment",
  WORKPLACE_SAFETY: "Workplace Safety",
  STAFF_WELFARE: "Staff Welfare",
  MANAGEMENT: "Management",
  COMMUNICATION: "Communication",
  OTHER: "Other",
};

export const PRIORITY_LABELS: Record<SuggestionPriority, string> = {
  LOW: "Low",
  NORMAL: "Normal",
  HIGH: "Important",
  URGENT: "Urgent",
};

export interface DashboardSummary {
  total: number;
  new: number;
  underReview: number;
  pending: number;
  actioned: number;
  closed: number;
}

interface SummaryResponse {
  success: boolean;
  data: DashboardSummary;
}

export async function getDashboardSummary() {
  const response = await api.get<SummaryResponse>("/admin/dashboard/summary");
  return response.data;
}

export interface AdminSuggestionListItem {
  id: string;
  referenceCode: string;
  category: SuggestionCategory;
  priority: SuggestionPriority;
  status: SuggestionStatus;
  createdAt: string;
  updatedAt: string;
  _count: {
    attachments: number;
    notes: number;
  };
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ListResponse {
  success: boolean;
  data: {
    items: AdminSuggestionListItem[];
    pagination: Pagination;
  };
}

export interface AdminSuggestionListParams {
  page?: number;
  limit?: number;
  status?: SuggestionStatus;
  category?: SuggestionCategory;
  priority?: SuggestionPriority;
  search?: string;
}

export async function getAdminSuggestions(
  params: AdminSuggestionListParams = {},
) {
  const response = await api.get<ListResponse>("/admin/suggestions", {
    params,
  });
  return response.data;
}

export interface AdminAttachment {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

export interface AdminNote {
  id: string;
  note: string;
  createdAt: string;
}

export interface AdminSuggestionDetail {
  id: string;
  referenceCode: string;
  category: SuggestionCategory;
  priority: SuggestionPriority;
  message: string;
  status: SuggestionStatus;
  createdAt: string;
  updatedAt: string;
  attachments: AdminAttachment[];
  notes: AdminNote[];
}

interface DetailResponse {
  success: boolean;
  data: AdminSuggestionDetail;
}

export async function getAdminSuggestion(id: string) {
  const response = await api.get<DetailResponse>(`/admin/suggestions/${id}`);
  return response.data;
}

export interface UpdateSuggestionResponse {
  success: boolean;
  data: {
    id: string;
    referenceCode: string;
    status: SuggestionStatus;
    updatedAt: string;
  };
}

export async function updateAdminSuggestion(id: string, status: SuggestionStatus) {
  const response = await api.patch<UpdateSuggestionResponse>(
    `/admin/suggestions/${id}`,
    { status },
  );
  return response.data;
}

export async function addSuggestionNote(id: string, note: string) {
  const response = await api.post<{
    success: boolean;
    data: AdminNote;
  }>(`/admin/suggestions/${id}/notes`, { note });
  return response.data;
}

export async function downloadAttachment(
  suggestionId: string,
  attachmentId: string,
): Promise<Blob> {
  const response = await api.get<Blob>(
    `/admin/suggestions/${suggestionId}/attachments/${attachmentId}`,
    { responseType: "blob" },
  );
  return response.data;
}
