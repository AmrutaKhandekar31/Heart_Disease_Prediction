import type { PatientInput, RiskBand } from "./heart-model";

export interface PredictionRecord {
  id: string;
  createdAt: string;
  probability: number;
  band: RiskBand;
  input: PatientInput;
  topFactor: string;
}

const KEY = "heart-risk-history-v1";
const LIMIT = 50;

export function loadHistory(): PredictionRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PredictionRecord[]) : [];
  } catch {
    return [];
  }
}

export function saveRecord(record: PredictionRecord): PredictionRecord[] {
  const next = [record, ...loadHistory()].slice(0, LIMIT);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  }
  return next;
}

export function clearHistory(): void {
  if (typeof window !== "undefined") window.localStorage.removeItem(KEY);
}

export function exportHistoryCsv(records: PredictionRecord[]): string {
  const columns = [
    "createdAt",
    "probability",
    "band",
    "age",
    "sex",
    "cp",
    "trestbps",
    "chol",
    "fbs",
    "restecg",
    "thalach",
    "exang",
    "oldpeak",
    "slope",
    "ca",
    "thal",
  ];
  const rows = records.map((record) =>
    [
      record.createdAt,
      record.probability.toFixed(4),
      record.band,
      ...(
        [
          "age",
          "sex",
          "cp",
          "trestbps",
          "chol",
          "fbs",
          "restecg",
          "thalach",
          "exang",
          "oldpeak",
          "slope",
          "ca",
          "thal",
        ] as const
      ).map((key) => String(record.input[key])),
    ].join(","),
  );
  return [columns.join(","), ...rows].join("\n");
}
