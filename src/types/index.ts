export const MATCH_PREFERENCES = [
  "EXACT_MATCH",
  "SIMILAR_OK",
  "SAME_BRAND_ANY",
  "ANY_BRAND_SIMILAR",
] as const;

export type MatchPreference = (typeof MATCH_PREFERENCES)[number];

export const MATCH_PREFERENCE_LABELS: Record<MatchPreference, string> = {
  EXACT_MATCH: "Exact match only",
  SIMILAR_OK: "Similar item OK",
  SAME_BRAND_ANY: "Same brand, any variation",
  ANY_BRAND_SIMILAR: "Any brand, similar is fine",
};
