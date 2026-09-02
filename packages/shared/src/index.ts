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

export type SuggestionStatus =
  | "NEW"
  | "UNDER_REVIEW"
  | "PENDING"
  | "ACTIONED"
  | "CLOSED";

export interface SubmitSuggestionBody {
  category: SuggestionCategory;
  message: string;
  priority?: SuggestionPriority;
}

export interface SubmitSuggestionResponse {
  success: true;
  data: { referenceCode: string; status: SuggestionStatus };
}

export interface LookupSuggestionResponse {
  success: true;
  data: { referenceCode: string; status: SuggestionStatus };
}
