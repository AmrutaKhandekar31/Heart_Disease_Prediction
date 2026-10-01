import modelCard from "@/data/model-card.json";

/**
 * In-app scorer for the logistic-regression model trained by
 * `ml/train_model.py`. The Python pipeline exports its standardization
 * statistics and coefficients to `src/data/model-card.json`, so the
 * probability computed here is identical to sklearn's `predict_proba`.
 */

export type NumericFeature = "age" | "trestbps" | "chol" | "thalach" | "oldpeak";

export interface PatientInput {
  age: number;
  sex: 0 | 1;
  cp: 0 | 1 | 2 | 3;
  trestbps: number;
  chol: number;
  fbs: 0 | 1;
  restecg: 0 | 1 | 2;
  thalach: number;
  exang: 0 | 1;
  oldpeak: number;
  slope: 0 | 1 | 2;
  ca: 0 | 1 | 2 | 3;
  thal: 1 | 2 | 3;
}

export const NUMERIC_FEATURES: NumericFeature[] = [
  "age",
  "trestbps",
  "chol",
  "thalach",
  "oldpeak",
];

/** Categorical levels, drop-first encoded exactly as in training. */
const CATEGORICAL_LEVELS: Record<string, number[]> = {
  sex: [0, 1],
  cp: [0, 1, 2, 3],
  fbs: [0, 1],
  restecg: [0, 1, 2],
  exang: [0, 1],
  slope: [0, 1, 2],
  ca: [0, 1, 2, 3],
  thal: [1, 2, 3],
};

export const modelMeta = modelCard;

const coefficients = modelCard.coefficients as Record<string, number>;
const scalerMean = modelCard.scaler.mean as Record<string, number>;
const scalerScale = modelCard.scaler.scale as Record<string, number>;

export interface Contribution {
  feature: string;
  label: string;
  contribution: number;
  direction: "raises" | "lowers";
}

export interface PredictionResult {
  probability: number;
  logit: number;
  band: RiskBand;
  contributions: Contribution[];
}

export type RiskBand = "low" | "moderate" | "high";

export function bandFor(probability: number): RiskBand {
  if (probability < 0.3) return "low";
  if (probability < 0.6) return "moderate";
  return "high";
}

export const BAND_META: Record<
  RiskBand,
  { label: string; blurb: string; className: string }
> = {
  low: {
    label: "Low risk",
    blurb:
      "The model finds little evidence of heart disease in this profile. Keep routine checkups.",
    className: "text-risk-low",
  },
  moderate: {
    label: "Moderate risk",
    blurb:
      "Mixed signals. A clinician should review the exercise and vessel findings in context.",
    className: "text-risk-moderate",
  },
  high: {
    label: "High risk",
    blurb:
      "Several strong indicators align with disease in the training data. Clinical follow-up is advised.",
    className: "text-risk-high",
  },
};

const FEATURE_LABELS: Record<string, string> = {
  age: "Age",
  trestbps: "Resting blood pressure",
  chol: "Serum cholesterol",
  thalach: "Max heart rate achieved",
  oldpeak: "ST depression (exercise)",
  sex_1: "Male",
  cp_1: "Atypical angina",
  cp_2: "Non-anginal pain",
  cp_3: "Asymptomatic chest pain",
  fbs_1: "Fasting blood sugar > 120",
  restecg_1: "ST-T wave abnormality",
  restecg_2: "Left ventricular hypertrophy",
  exang_1: "Exercise-induced angina",
  slope_1: "Flat ST slope",
  slope_2: "Downsloping ST slope",
  ca_1: "1 major vessel narrowed",
  ca_2: "2 major vessels narrowed",
  ca_3: "3 major vessels narrowed",
  thal_2: "Thalassemia: fixed defect",
  thal_3: "Thalassemia: reversible defect",
};

function buildVector(input: PatientInput): Record<string, number> {
  const vector: Record<string, number> = {};
  for (const feature of NUMERIC_FEATURES) {
    vector[feature] =
      (Number(input[feature]) - (scalerMean[feature] ?? 0)) / (scalerScale[feature] ?? 1);
  }
  for (const [column, levels] of Object.entries(CATEGORICAL_LEVELS)) {
    const value = Number((input as unknown as Record<string, number>)[column]);
    for (const level of levels.slice(1)) {
      vector[`${column}_${level}`] = value === level ? 1 : 0;
    }
  }
  return vector;
}

export function predictRisk(input: PatientInput): PredictionResult {
  const vector = buildVector(input);
  let logit = modelCard.intercept;
  const contributions: Contribution[] = [];

  for (const [feature, value] of Object.entries(vector)) {
    const weight = coefficients[feature] ?? 0;
    const term = weight * value;
    logit += term;
    if (Math.abs(term) > 0.0001) {
      contributions.push({
        feature,
        label: FEATURE_LABELS[feature] ?? feature,
        contribution: term,
        direction: term >= 0 ? "raises" : "lowers",
      });
    }
  }

  contributions.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
  const probability = 1 / (1 + Math.exp(-logit));

  return { probability, logit, band: bandFor(probability), contributions };
}

export function featureLabel(feature: string): string {
  return FEATURE_LABELS[feature] ?? feature;
}

/** A median-ish patient used as the form's starting point. */
export const DEFAULT_PATIENT: PatientInput = {
  age: 54,
  sex: 1,
  cp: 0,
  trestbps: 130,
  chol: 240,
  fbs: 0,
  restecg: 0,
  thalach: 150,
  exang: 0,
  oldpeak: 0.8,
  slope: 1,
  ca: 0,
  thal: 1,
};

export interface FieldSpec {
  name: keyof PatientInput;
  label: string;
  help: string;
  kind: "number" | "select";
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  options?: { value: number; label: string }[];
}

export const FIELD_SPECS: FieldSpec[] = [
  {
    name: "age",
    label: "Age",
    help: "Patient age in years",
    kind: "number",
    unit: "yrs",
    min: 18,
    max: 100,
    step: 1,
  },
  {
    name: "sex",
    label: "Sex",
    help: "Biological sex recorded in the dataset",
    kind: "select",
    options: [
      { value: 1, label: "Male" },
      { value: 0, label: "Female" },
    ],
  },
  {
    name: "cp",
    label: "Chest pain type",
    help: "Clinical classification of reported chest pain",
    kind: "select",
    options: [
      { value: 0, label: "Typical angina" },
      { value: 1, label: "Atypical angina" },
      { value: 2, label: "Non-anginal pain" },
      { value: 3, label: "Asymptomatic" },
    ],
  },
  {
    name: "trestbps",
    label: "Resting blood pressure",
    help: "Measured on admission",
    kind: "number",
    unit: "mm Hg",
    min: 80,
    max: 220,
    step: 1,
  },
  {
    name: "chol",
    label: "Serum cholesterol",
    help: "Total cholesterol from blood work",
    kind: "number",
    unit: "mg/dl",
    min: 100,
    max: 600,
    step: 1,
  },
  {
    name: "fbs",
    label: "Fasting blood sugar",
    help: "Above 120 mg/dl after fasting",
    kind: "select",
    options: [
      { value: 0, label: "120 mg/dl or lower" },
      { value: 1, label: "Above 120 mg/dl" },
    ],
  },
  {
    name: "restecg",
    label: "Resting ECG",
    help: "Electrocardiogram result at rest",
    kind: "select",
    options: [
      { value: 0, label: "Normal" },
      { value: 1, label: "ST-T wave abnormality" },
      { value: 2, label: "Left ventricular hypertrophy" },
    ],
  },
  {
    name: "thalach",
    label: "Max heart rate",
    help: "Peak rate reached during the stress test",
    kind: "number",
    unit: "bpm",
    min: 60,
    max: 220,
    step: 1,
  },
  {
    name: "exang",
    label: "Exercise-induced angina",
    help: "Chest pain triggered by the stress test",
    kind: "select",
    options: [
      { value: 0, label: "No" },
      { value: 1, label: "Yes" },
    ],
  },
  {
    name: "oldpeak",
    label: "ST depression",
    help: "Exercise-induced ST depression relative to rest",
    kind: "number",
    unit: "mm",
    min: 0,
    max: 7,
    step: 0.1,
  },
  {
    name: "slope",
    label: "ST slope",
    help: "Slope of the peak exercise ST segment",
    kind: "select",
    options: [
      { value: 0, label: "Upsloping" },
      { value: 1, label: "Flat" },
      { value: 2, label: "Downsloping" },
    ],
  },
  {
    name: "ca",
    label: "Major vessels narrowed",
    help: "Vessels coloured by fluoroscopy",
    kind: "select",
    options: [
      { value: 0, label: "0" },
      { value: 1, label: "1" },
      { value: 2, label: "2" },
      { value: 3, label: "3" },
    ],
  },
  {
    name: "thal",
    label: "Thalassemia scan",
    help: "Thallium stress-test result",
    kind: "select",
    options: [
      { value: 1, label: "Normal" },
      { value: 2, label: "Fixed defect" },
      { value: 3, label: "Reversible defect" },
    ],
  },
];
