import { createFileRoute } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { featureLabel, modelMeta } from "@/lib/heart-model";

export const Route = createFileRoute("/model")({
  head: () => ({
    meta: [
      { title: "Model performance — Smart Heart Risk" },
      {
        name: "description",
        content:
          "ROC curve, confusion matrix, cross-validated scores and algorithm comparison for the heart disease risk model.",
      },
      { property: "og:title", content: "Heart disease model performance" },
      {
        property: "og:description",
        content:
          "ROC curve, confusion matrix, cross-validation and algorithm comparison for the deployed risk model.",
      },
    ],
  }),
  component: ModelPage,
});

const axisProps = {
  stroke: "var(--color-muted-foreground)",
  fontSize: 11,
} as const;

const tooltipStyle = {
  background: "var(--color-popover)",
  border: "1px solid var(--color-border)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--color-popover-foreground)",
} as const;

function ModelPage() {
  const { metrics, comparison, confusionMatrix, rocCurve, featureImportance } =
    modelMeta;

  const headline = [
    { label: "Accuracy", value: metrics.accuracy },
    { label: "Precision", value: metrics.precision },
    { label: "Recall", value: metrics.recall },
    { label: "F1 score", value: metrics.f1 },
    { label: "ROC AUC", value: metrics.rocAuc },
  ];

  const roc = [
    { fpr: 0, tpr: 0 },
    ...rocCurve,
    { fpr: 1, tpr: 1 },
  ].map((point) => ({ ...point, baseline: point.fpr }));

  const importance = featureImportance.slice(0, 12).map((item) => ({
    label: featureLabel(item.feature),
    importance: item.importance,
  }));

  const matrix = [
    {
      title: "True negative",
      value: confusionMatrix.trueNegative,
      tone: "text-risk-low",
    },
    {
      title: "False positive",
      value: confusionMatrix.falsePositive,
      tone: "text-risk-moderate",
    },
    {
      title: "False negative",
      value: confusionMatrix.falseNegative,
      tone: "text-risk-high",
    },
    {
      title: "True positive",
      value: confusionMatrix.truePositive,
      tone: "text-risk-low",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-5 py-12">
      <p className="eyebrow">Evaluation · held-out test set</p>
      <h1 className="mt-3 text-3xl font-semibold md:text-4xl">Model performance</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        Deployed model: <span className="text-foreground">{modelMeta.deployedModel}</span>{" "}
        · trained on {modelMeta.trainRows} records, evaluated on {modelMeta.testRows}{" "}
        held-out records with a stratified split (seed {modelMeta.randomState}).
      </p>

      <dl className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-5">
        {headline.map((item) => (
          <div key={item.label} className="bg-surface px-5 py-6">
            <dd className="metric-value text-primary">
              {(item.value * 100).toFixed(1)}%
            </dd>
            <dt className="mt-1 text-xs text-muted-foreground">{item.label}</dt>
          </div>
        ))}
      </dl>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="panel p-6">
          <h2 className="text-base font-semibold">ROC curve</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Area under curve {metrics.rocAuc.toFixed(3)} · dashed line is random
            guessing
          </p>
          <div className="mt-5 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={roc} margin={{ left: -16, right: 8 }}>
                <CartesianGrid stroke="var(--color-grid)" />
                <XAxis
                  dataKey="fpr"
                  type="number"
                  domain={[0, 1]}
                  tickFormatter={(value: number) => value.toFixed(1)}
                  {...axisProps}
                />
                <YAxis domain={[0, 1]} {...axisProps} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line
                  type="monotone"
                  dataKey="baseline"
                  stroke="var(--color-muted-foreground)"
                  strokeDasharray="4 4"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="tpr"
                  stroke="var(--color-primary)"
                  strokeWidth={2.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel p-6">
          <h2 className="text-base font-semibold">Confusion matrix</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            At the default 0.5 decision threshold
          </p>
          <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border">
            {matrix.map((cell) => (
              <div key={cell.title} className="bg-surface-raised px-5 py-8 text-center">
                <p className={`metric-value ${cell.tone}`}>{cell.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{cell.title}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
            Only {confusionMatrix.falseNegative} patient
            {confusionMatrix.falseNegative === 1 ? "" : "s"} with disease were missed —
            the metric that matters most in a screening context.
          </p>
        </div>
      </div>

      <div className="panel mt-6 p-6">
        <h2 className="text-base font-semibold">Algorithm comparison</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Same split and preprocessing for all three. Logistic regression is deployed
          because its coefficients run in the browser with no Python runtime.
        </p>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">Model</th>
                <th className="pb-2 pr-4 font-medium">Accuracy</th>
                <th className="pb-2 pr-4 font-medium">Precision</th>
                <th className="pb-2 pr-4 font-medium">Recall</th>
                <th className="pb-2 pr-4 font-medium">F1</th>
                <th className="pb-2 pr-4 font-medium">ROC AUC</th>
                <th className="pb-2 font-medium">5-fold CV AUC</th>
              </tr>
            </thead>
            <tbody>
              {comparison.map((row) => (
                <tr key={row.name} className="border-b border-border/60">
                  <td className="py-2.5 pr-4">
                    {row.name}
                    {row.name === modelMeta.deployedModel ? (
                      <span className="ml-2 rounded bg-primary/15 px-1.5 py-0.5 font-mono text-[10px] text-primary">
                        deployed
                      </span>
                    ) : null}
                  </td>
                  <td className="py-2.5 pr-4 font-mono">{row.accuracy.toFixed(3)}</td>
                  <td className="py-2.5 pr-4 font-mono">{row.precision.toFixed(3)}</td>
                  <td className="py-2.5 pr-4 font-mono">{row.recall.toFixed(3)}</td>
                  <td className="py-2.5 pr-4 font-mono">{row.f1.toFixed(3)}</td>
                  <td className="py-2.5 pr-4 font-mono">{row.rocAuc.toFixed(3)}</td>
                  <td className="py-2.5 font-mono">
                    {row.cvRocAucMean.toFixed(3)} ± {row.cvRocAucStd.toFixed(3)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="panel p-6">
          <h2 className="text-base font-semibold">Feature importance</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Random forest impurity importance across encoded features
          </p>
          <div className="mt-5 h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={importance}
                layout="vertical"
                margin={{ left: 16, right: 16 }}
              >
                <CartesianGrid stroke="var(--color-grid)" horizontal={false} />
                <XAxis type="number" {...axisProps} />
                <YAxis type="category" dataKey="label" width={170} {...axisProps} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="importance" radius={[0, 4, 4, 0]}>
                  {importance.map((item) => (
                    <Cell key={item.label} fill="var(--color-primary)" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel p-6">
          <h2 className="text-base font-semibold">Logistic regression coefficients</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Log-odds weights exported from scikit-learn · intercept{" "}
            {modelMeta.intercept.toFixed(3)}
          </p>
          <div className="mt-5 max-h-96 overflow-y-auto pr-1">
            <table className="w-full text-sm">
              <tbody>
                {Object.entries(modelMeta.coefficients)
                  .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
                  .map(([feature, weight]) => (
                    <tr key={feature} className="border-b border-border/60">
                      <td className="py-2 pr-4">{featureLabel(feature)}</td>
                      <td
                        className={`py-2 text-right font-mono ${
                          weight >= 0 ? "text-risk-high" : "text-risk-low"
                        }`}
                      >
                        {weight >= 0 ? "+" : ""}
                        {weight.toFixed(3)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
