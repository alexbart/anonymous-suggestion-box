import { api } from "../lib/api";

export interface SubmitSuggestionResponse {
  success: boolean;
  data: {
    referenceCode: string;
    status: string;
  };
}

export async function submitSuggestion(data: {
  category: string;
  priority: string;
  message: string;
  files: File[];
}) {
  const formData = new FormData();

  formData.append("category", data.category);
  formData.append("priority", data.priority);
  formData.append("message", data.message);

  for (const file of data.files) {
    formData.append("attachments", file);
  }

  const response = await api.post<SubmitSuggestionResponse>(
    "/suggestions",
    formData,
  );

  return response.data;
}
