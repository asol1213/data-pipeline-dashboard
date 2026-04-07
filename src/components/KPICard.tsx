interface KPICardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  trend?: "up" | "down" | "neutral";
  icon?: React.ReactNode;
}

export default function KPICard({
  label,
  value,
  subtitle,
  trend,
  icon,
}: KPICardProps) {
  const trendColor =
    trend === "up"
      ? "text-success"
      : trend === "down"
        ? "text-danger"
        : "text-text-muted";

  return (
    <div className="bg-bg-card rounded-xl border border-border-subtle p-6 hover:border-border-color transition-colors">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-text-muted mb-1">{label}</p>
          <p className="text-2xl font-bold text-text-primary">{value}</p>
          {subtitle && (
            <p className={`text-xs mt-1 ${trendColor}`}>{subtitle}</p>
          )}
        </div>
        {icon && (
          <div className="w-10 h-10 rounded-lg bg-accent-subtle flex items-center justify-center text-accent">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
