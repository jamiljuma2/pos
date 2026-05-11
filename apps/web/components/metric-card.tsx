type MetricCardProps = {
  label: string;
  value: string;
  delta?: string;
  hint?: string;
};

export function MetricCard({ label, value, delta, hint }: MetricCardProps) {
  return (
    <div className="glass rounded-3xl border border-line p-5 shadow-sm">
      <p className="text-sm text-muted">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <p className="font-display text-3xl font-bold tracking-tight">{value}</p>
        {delta ? <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-semibold text-emerald-700 dark:text-emerald-300">{delta}</span> : null}
      </div>
      {hint ? <p className="mt-3 text-sm text-muted">{hint}</p> : null}
    </div>
  );
}
