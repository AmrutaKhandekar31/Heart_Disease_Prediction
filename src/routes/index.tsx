import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BarChart3, Brain, HeartPulse, Table2 } from "lucide-react";

import profile from "@/data/dataset-profile.json";
import { modelMeta } from "@/lib/heart-model";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Smart Heart Disease Risk Prediction & Analytics" },
      {
        name: "description",
        content:
          "Score heart disease risk from 13 clinical measurements, explore the dataset and inspect model performance — trained on 303 real patient records.",
      },
      {
        property: "og:title",
        content: "Smart Heart Disease Risk Prediction & Analytics",
      },
      {
        property: "og:description",
        content:
          "Score heart disease risk from 13 clinical measurements, explore the dataset and inspect model performance.",
      },
    ],
  }),
  component: Index,
});

const CARDS = [
  {
    to: "/predict" as const,
    icon: HeartPulse,
    title: "Risk prediction",
    body: "Enter 13 clinical measurements and get a calibrated probability with the factors that moved it.",
  },
  {
    to: "/analytics" as const,
    icon: BarChart3,
    title: "Dataset analytics",
    body: "Disease rates by age, sex, chest pain type, vessel count and stress-test findings.",
  },
  {
    to: "/model" as const,
    icon: Brain,
    title: "Model performance",
    body: "ROC curve, confusion matrix, cross-validated scores and a three-algorithm comparison.",
  },
];

function Index() {
  const positiveRate = (
    (profile.classBalance.positive / profile.rows) *
    100
  ).toFixed(1);

  const stats = [
    { label: "Patient records", value: String(profile.rows) },
    { label: "Clinical features", value: "13" },
    { label: "Disease prevalence", value: `${positiveRate}%` },
    { label: "Test ROC AUC", value: modelMeta.metrics.rocAuc.toFixed(3) },
  ];

  return (
    <div>
      <section className="relative overflow-hidden border-b border-border">
        <div className="grid-backdrop pointer-events-none absolute inset-0" />
        <div className="relative mx-auto max-w-7xl px-5 py-20 md:py-28">
          <p className="eyebrow">UCI Cleveland · 303 records · supervised learning</p>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.05] md:text-6xl">
            Heart disease risk,
            <span className="text-primary"> measured not guessed</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground">
            A full machine-learning pipeline — data profiling, preprocessing,
            training, evaluation — wired to an interactive scoring interface. The
            trained model's coefficients run directly in your browser, so every
            prediction is instant and nothing leaves your device.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              to="/predict"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Run a prediction <ArrowRight className="size-4" />
            </Link>
            <Link
              to="/analytics"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-5 py-3 text-sm font-medium transition-colors hover:bg-secondary"
            >
              <Table2 className="size-4" /> Explore the data
            </Link>
          </div>

          <dl className="mt-16 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="bg-surface px-5 py-6">
                <dd className="metric-value text-primary">{stat.value}</dd>
                <dt className="mt-1 text-xs text-muted-foreground">{stat.label}</dt>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16">
        <h2 className="text-2xl font-semibold">Three surfaces, one pipeline</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {CARDS.map((card) => (
            <Link key={card.to} to={card.to} className="panel group p-6">
              <card.icon className="size-6 text-primary" />
              <h3 className="mt-4 text-lg font-semibold">{card.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {card.body}
              </p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm text-primary">
                Open
                <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-4">
        <div className="panel p-6 md:p-8">
          <p className="eyebrow">How it was built</p>
          <ol className="mt-6 grid gap-6 md:grid-cols-4">
            {[
              {
                step: "01",
                title: "Profile",
                body: "Inspect columns, dtypes, missing values and class balance of heart.csv.",
              },
              {
                step: "02",
                title: "Preprocess",
                body: "Median-impute missing vessel and thal values, standardize numerics, one-hot encode categoricals.",
              },
              {
                step: "03",
                title: "Train",
                body: "Logistic regression, random forest and gradient boosting on a stratified 80/20 split.",
              },
              {
                step: "04",
                title: "Export",
                body: "Metrics, coefficients and EDA aggregates exported as JSON for this interface.",
              },
            ].map((item) => (
              <li key={item.step}>
                <span className="font-mono text-xs text-primary">{item.step}</span>
                <h3 className="mt-2 text-base font-semibold">{item.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {item.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </div>
  );
}
