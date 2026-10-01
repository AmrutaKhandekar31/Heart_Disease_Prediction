import { createFileRoute } from "@tanstack/react-router";
import { Download, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BAND_META,
  DEFAULT_PATIENT,
  FIELD_SPECS,
  predictRisk,
  type PatientInput,
} from "@/lib/heart-model";
import {
  clearHistory,
  exportHistoryCsv,
  loadHistory,
  saveRecord,
  type PredictionRecord,
} from "@/lib/prediction-history";

export const Route = createFileRoute("/predict")({
  head: () => ({
    meta: [
      { title: "Predict heart disease risk — Smart Heart Risk" },
      {
        name: "description",
        content:
          "Enter 13 clinical measurements and get an instant heart disease risk probability with the factors that drove it.",
      },
      { property: "og:title", content: "Predict heart disease risk" },
      {
        property: "og:description",
        content:
          "Instant heart disease risk probability from 13 clinical measurements, with factor-level explanation.",
      },
    ],
  }),
  component: PredictPage,
});

const SAMPLES: { label: string; input: PatientInput }[] = [
  {
    label: "Low-risk profile",
    input: {
      age: 41,
      sex: 0,
      cp: 1,
      trestbps: 126,
      chol: 198,
      fbs: 0,
      restecg: 0,
      thalach: 172,
      exang: 0,
      oldpeak: 0,
      slope: 0,
      ca: 0,
      thal: 1,
    },
  },
  {
    label: "High-risk profile",
    input: {
      age: 64,
      sex: 1,
      cp: 3,
      trestbps: 160,
      chol: 286,
      fbs: 0,
      restecg: 2,
      thalach: 108,
      exang: 1,
      oldpeak: 2.6,
      slope: 1,
      ca: 3,
      thal: 3,
    },
  },
];

function PredictPage() {
  const [patient, setPatient] = useState<PatientInput>(DEFAULT_PATIENT);
  const [history, setHistory] = useState<PredictionRecord[]>([]);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const result = useMemo(() => predictRisk(patient), [patient]);
  const band = BAND_META[result.band];
  const percent = result.probability * 100;

  const topFactors = result.contributions.slice(0, 6).map((contribution) => ({
    label: contribution.label,
    value: Number(contribution.contribution.toFixed(3)),
  }));

  function update(name: keyof PatientInput, value: number) {
    setPatient((previous) => ({ ...previous, [name]: value }) as PatientInput);
  }

  function handleSave() {
    const record: PredictionRecord = {
      id: `${Date.now()}`,
      createdAt: new Date().toISOString(),
      probability: result.probability,
      band: result.band,
      input: patient,
      topFactor: result.contributions[0]?.label ?? "—",
    };
    setHistory(saveRecord(record));
    toast.success("Prediction saved to history");
  }

  function handleExport() {
    const csv = exportHistoryCsv(history);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "prediction-history.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-7xl px-5 py-12">
      <p className="eyebrow">Interactive scoring</p>
      <h1 className="mt-3 text-3xl font-semibold md:text-4xl">Risk prediction</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        The result updates as you type. Nothing is sent anywhere — the trained
        model's coefficients are evaluated locally.
      </p>

      <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="panel p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Clinical inputs</h2>
            <div className="flex flex-wrap gap-2">
              {SAMPLES.map((sample) => (
                <Button
                  key={sample.label}
                  variant="secondary"
                  size="sm"
                  onClick={() => setPatient(sample.input)}
                >
                  {sample.label}
                </Button>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPatient(DEFAULT_PATIENT)}
              >
                <RotateCcw className="size-3.5" /> Reset
              </Button>
            </div>
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            {FIELD_SPECS.map((field) => (
              <div key={field.name} className="space-y-1.5">
                <Label htmlFor={field.name} className="text-sm">
                  {field.label}
                  {field.unit ? (
                    <span className="ml-1 font-mono text-[11px] text-muted-foreground">
                      {field.unit}
                    </span>
                  ) : null}
                </Label>
                {field.kind === "number" ? (
                  <Input
                    id={field.name}
                    type="number"
                    inputMode="decimal"
                    min={field.min}
                    max={field.max}
                    step={field.step}
                    value={patient[field.name]}
                    onChange={(event) =>
                      update(field.name, Number(event.target.value))
                    }
                  />
                ) : (
                  <Select
                    value={String(patient[field.name])}
                    onValueChange={(value) => update(field.name, Number(value))}
                  >
                    <SelectTrigger id={field.name}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options?.map((option) => (
                        <SelectItem key={option.value} value={String(option.value)}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <p className="text-[11px] text-muted-foreground">{field.help}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="panel p-6">
            <p className="eyebrow">Predicted probability</p>
            <div className="mt-4 flex items-end gap-3">
              <span className={`font-display text-6xl leading-none ${band.className}`}>
                {percent.toFixed(1)}
                <span className="text-2xl">%</span>
              </span>
              <span className={`pb-2 text-sm font-medium ${band.className}`}>
                {band.label}
              </span>
            </div>
            <div className="mt-5 h-2.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  result.band === "high"
                    ? "bg-risk-high"
                    : result.band === "moderate"
                      ? "bg-risk-moderate"
                      : "bg-risk-low"
                }`}
                style={{ width: `${Math.min(100, Math.max(2, percent))}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between font-mono text-[10px] text-muted-foreground">
              <span>0% low</span>
              <span>30%</span>
              <span>60%</span>
              <span>100% high</span>
            </div>
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
              {band.blurb}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Button onClick={handleSave}>Save to history</Button>
              <Button
                variant="secondary"
                onClick={handleExport}
                disabled={history.length === 0}
              >
                <Download className="size-4" /> Export CSV
              </Button>
            </div>
          </div>

          <div className="panel p-6">
            <h2 className="text-lg font-semibold">What drove this score</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Log-odds contribution per feature. Positive bars raise risk.
            </p>
            <div className="mt-5 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topFactors}
                  layout="vertical"
                  margin={{ left: 8, right: 16 }}
                >
                  <XAxis
                    type="number"
                    stroke="var(--color-muted-foreground)"
                    fontSize={11}
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={150}
                    stroke="var(--color-muted-foreground)"
                    fontSize={11}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-popover)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                      fontSize: 12,
                      color: "var(--color-popover-foreground)",
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {topFactors.map((factor) => (
                      <Cell
                        key={factor.label}
                        fill={
                          factor.value >= 0
                            ? "var(--color-risk-high)"
                            : "var(--color-risk-low)"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      <div className="panel mt-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Prediction history</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Stored in this browser only · {history.length} saved
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            disabled={history.length === 0}
            onClick={() => {
              clearHistory();
              setHistory([]);
              toast.success("History cleared");
            }}
          >
            <Trash2 className="size-3.5" /> Clear
          </Button>
        </div>

        {history.length === 0 ? (
          <p className="mt-6 text-sm text-muted-foreground">
            No saved predictions yet. Run a score above and hit “Save to history”.
          </p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">When</th>
                  <th className="pb-2 pr-4 font-medium">Risk</th>
                  <th className="pb-2 pr-4 font-medium">Band</th>
                  <th className="pb-2 pr-4 font-medium">Age / sex</th>
                  <th className="pb-2 pr-4 font-medium">Vessels</th>
                  <th className="pb-2 font-medium">Top factor</th>
                </tr>
              </thead>
              <tbody>
                {history.map((record) => (
                  <tr key={record.id} className="border-b border-border/60">
                    <td className="py-2.5 pr-4 font-mono text-xs text-muted-foreground">
                      {new Date(record.createdAt).toLocaleString()}
                    </td>
                    <td className="py-2.5 pr-4 font-mono">
                      {(record.probability * 100).toFixed(1)}%
                    </td>
                    <td
                      className={`py-2.5 pr-4 font-medium ${BAND_META[record.band].className}`}
                    >
                      {BAND_META[record.band].label}
                    </td>
                    <td className="py-2.5 pr-4">
                      {record.input.age} / {record.input.sex === 1 ? "M" : "F"}
                    </td>
                    <td className="py-2.5 pr-4">{record.input.ca}</td>
                    <td className="py-2.5 text-muted-foreground">{record.topFactor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
