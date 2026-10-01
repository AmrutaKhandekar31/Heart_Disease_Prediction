import { createFileRoute } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";

import profile from "@/data/dataset-profile.json";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Dataset analytics — Smart Heart Risk" },
      {
        name: "description",
        content:
          "Heart disease rates by age band, sex, chest pain type, vessel count and stress-test findings across 303 patient records.",
      },
      { property: "og:title", content: "Heart disease dataset analytics" },
      {
        property: "og:description",
        content:
          "Disease prevalence by age, sex, chest pain, vessels and stress-test results across 303 patients.",
      },
    ],
  }),
  component: AnalyticsPage,
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

type Group = { key: string; total: number; positive: number; rate: number };

function RatePanel({
  title,
  subtitle,
  data,
}: {
  title: string;
  subtitle: string;
  data: Group[];
}) {
  const rows = data.map((group) => ({
    key: group.key,
    rate: Number((group.rate * 100).toFixed(1)),
    total: group.total,
  }));

  return (
    <div className="panel p-6">
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      <div className="mt-5 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ left: -16, right: 8 }}>
            <CartesianGrid stroke="var(--color-grid)" vertical={false} />
            <XAxis dataKey="key" {...axisProps} interval={0} tickMargin={8} />
            <YAxis unit="%" domain={[0, 100]} {...axisProps} />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value: number, name) =>
                name === "rate" ? [`${value}%`, "Disease rate"] : [value, name]
              }
            />
            <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
              {rows.map((row) => (
                <Cell
                  key={row.key}
                  fill={
                    row.rate >= 60
                      ? "var(--color-risk-high)"
                      : row.rate >= 35
                        ? "var(--color-risk-moderate)"
                        : "var(--color-risk-low)"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function AnalyticsPage() {
  const correlations = profile.targetCorrelation.map((item) => ({
    feature: item.feature,
    correlation: Number(item.correlation.toFixed(3)),
  }));

  const healthy = profile.scatterAgeThalach.filter((point) => point.target === 0);
  const diseased = profile.scatterAgeThalach.filter((point) => point.target === 1);

  return (
    <div className="mx-auto max-w-7xl px-5 py-12">
      <p className="eyebrow">Exploratory data analysis</p>
      <h1 className="mt-3 text-3xl font-semibold md:text-4xl">Dataset analytics</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        Aggregated from {profile.rows} patient records with{" "}
        {Object.values(profile.missing).reduce((a, b) => a + b, 0)} missing values
        remaining after preprocessing.
      </p>

      <div className="mt-10 grid gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-4">
        <div className="bg-surface px-5 py-6">
          <p className="metric-value">{profile.rows}</p>
          <p className="mt-1 text-xs text-muted-foreground">Records</p>
        </div>
        <div className="bg-surface px-5 py-6">
          <p className="metric-value text-risk-high">{profile.classBalance.positive}</p>
          <p className="mt-1 text-xs text-muted-foreground">With heart disease</p>
        </div>
        <div className="bg-surface px-5 py-6">
          <p className="metric-value text-risk-low">{profile.classBalance.negative}</p>
          <p className="mt-1 text-xs text-muted-foreground">Without heart disease</p>
        </div>
        <div className="bg-surface px-5 py-6">
          <p className="metric-value">{profile.summary.age.mean.toFixed(1)}</p>
          <p className="mt-1 text-xs text-muted-foreground">Mean age (years)</p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <RatePanel
          title="Disease rate by age band"
          subtitle="Share of patients diagnosed with heart disease"
          data={profile.byAgeBand}
        />
        <RatePanel
          title="Disease rate by sex"
          subtitle="Male patients are over-represented in this cohort"
          data={profile.bySex}
        />
        <RatePanel
          title="Disease rate by chest pain type"
          subtitle="Asymptomatic presentation is the strongest signal"
          data={profile.byChestPain}
        />
        <RatePanel
          title="Disease rate by narrowed vessels"
          subtitle="Major vessels coloured by fluoroscopy"
          data={profile.byVessels}
        />
        <RatePanel
          title="Disease rate by thallium scan"
          subtitle="Stress-test perfusion result"
          data={profile.byThal}
        />
        <RatePanel
          title="Disease rate by exercise angina"
          subtitle="Chest pain triggered during the stress test"
          data={profile.byExang}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="panel p-6">
          <h2 className="text-base font-semibold">Correlation with diagnosis</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Pearson correlation of each raw column against the target
          </p>
          <div className="mt-5 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={correlations}
                layout="vertical"
                margin={{ left: 12, right: 16 }}
              >
                <CartesianGrid stroke="var(--color-grid)" horizontal={false} />
                <XAxis type="number" domain={[-0.6, 0.6]} {...axisProps} />
                <YAxis
                  type="category"
                  dataKey="feature"
                  width={80}
                  {...axisProps}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="correlation" radius={[0, 4, 4, 0]}>
                  {correlations.map((item) => (
                    <Cell
                      key={item.feature}
                      fill={
                        item.correlation >= 0
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

        <div className="panel p-6">
          <h2 className="text-base font-semibold">Age vs. max heart rate</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Each point is a patient; bubble size is cholesterol
          </p>
          <div className="mt-5 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ left: -12, right: 8 }}>
                <CartesianGrid stroke="var(--color-grid)" />
                <XAxis
                  type="number"
                  dataKey="age"
                  name="Age"
                  domain={[25, 80]}
                  {...axisProps}
                />
                <YAxis
                  type="number"
                  dataKey="thalach"
                  name="Max HR"
                  domain={[60, 210]}
                  {...axisProps}
                />
                <ZAxis type="number" dataKey="chol" range={[25, 180]} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Scatter
                  name="No disease"
                  data={healthy}
                  fill="var(--color-risk-low)"
                  fillOpacity={0.55}
                />
                <Scatter
                  name="Heart disease"
                  data={diseased}
                  fill="var(--color-risk-high)"
                  fillOpacity={0.55}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="panel mt-6 p-6">
        <h2 className="text-base font-semibold">Numeric feature summary</h2>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">Feature</th>
                <th className="pb-2 pr-4 font-medium">Mean</th>
                <th className="pb-2 pr-4 font-medium">Std dev</th>
                <th className="pb-2 pr-4 font-medium">Median</th>
                <th className="pb-2 pr-4 font-medium">Min</th>
                <th className="pb-2 font-medium">Max</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {Object.entries(profile.summary).map(([feature, stats]) => (
                <tr key={feature} className="border-b border-border/60">
                  <td className="py-2.5 pr-4 font-sans">{feature}</td>
                  <td className="py-2.5 pr-4">{stats.mean}</td>
                  <td className="py-2.5 pr-4">{stats.std}</td>
                  <td className="py-2.5 pr-4">{stats.median}</td>
                  <td className="py-2.5 pr-4">{stats.min}</td>
                  <td className="py-2.5">{stats.max}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
