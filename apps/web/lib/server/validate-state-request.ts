import type { ExactFeatureBudget, StateRequest } from "@geometry-of-poker/shared";
import {
  isValidationFailure,
  type ValidatedProjectRequest,
  validateProjectRequest,
} from "@/lib/server/validate-project";

export interface ValidatedStateRequest extends ValidatedProjectRequest {
  exactFeatureBudget: ExactFeatureBudget;
}

const BUDGET_VALUES = new Set<ExactFeatureBudget>(["production", "full"]);

export function validateStateRequest(
  body: unknown,
): ValidatedStateRequest | import("@/lib/server/validate-project").ValidationFailure {
  const base = validateProjectRequest(body);
  if (isValidationFailure(base)) return base;

  const input = body as Partial<StateRequest>;
  const exactFeatureBudget = input.exactFeatureBudget ?? "full";
  if (!BUDGET_VALUES.has(exactFeatureBudget)) {
    return {
      status: 400,
      code: "INVALID_FEATURE_BUDGET",
      message: 'exactFeatureBudget must be "production" or "full".',
      field: "exactFeatureBudget",
    };
  }

  return { ...base, exactFeatureBudget };
}
