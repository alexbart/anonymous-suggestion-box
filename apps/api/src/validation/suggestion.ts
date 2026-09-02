import { z } from "zod";

export const SuggestionCategoryEnum = z.enum([
  "PATIENT_CARE",
  "STAFFING",
  "EQUIPMENT",
  "WORKPLACE_SAFETY",
  "STAFF_WELFARE",
  "MANAGEMENT",
  "COMMUNICATION",
  "OTHER",
]);

export const SuggestionPriorityEnum = z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]);

export const REFERENCE_CODE_PATTERN = /^SB-[A-Z0-9]{6}$/;

export const SubmitSuggestionSchema = z.object({
  category: SuggestionCategoryEnum,
  message: z
    .string()
    .trim()
    .min(10, "Message must be at least 10 characters long")
    .max(5000, "Message must be at most 5000 characters long"),
  priority: SuggestionPriorityEnum.optional(),
});

export const ReferenceCodeParamSchema = z.object({
  referenceCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(
      REFERENCE_CODE_PATTERN,
      "Invalid reference code format. Expected format: SB-XXXXXX",
    ),
});

export type SubmitSuggestionInput = z.infer<typeof SubmitSuggestionSchema>;
