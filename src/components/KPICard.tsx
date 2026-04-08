import { formatNumber, autoFormat } from "@/lib/format";
import Sparkline from "./Sparkline";

interface KPICardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  trend?: "up" | "down" | "neutral";
  icon?: React.ReactNode;
  sparklineData?: number[];
}

export default function KPICard({
  label,
  value,
  subtitle,
  trend,
  icon,
  sparklineData,
}: KPICardProps) {
  // Auto-format numeric KPI values based on the label
  const displayValue = (() => {
    if (typeof value === "number") {
      return formatNumber(value, autoFormat(label, value));
    }
    const num = Number(value);
    if (!isNaN(num) && String(value).trim() !== "") {
      return formatNumber(num, autoFormat(label, num));
    }
    return value;
  })();
  const trendColor =
    trend === "up"
      ? "text-success"
      : trend === "down"
        ? "text-danger"
        : "text-text-muted";

  const trendArrow =
    trend === "up" ? " \u2191" : trend === "down" ? " \u2193" : "";

  const trendBg =
    trend === "up"
      ? "bg-emerald-500/10 border-emerald-500/20"
      : trend === "down"
        ? "bg-red-500/10 border-red-500/20"
        : "";

  return (
    <div className={`bg-bg-card rounded-xl border border-border-subtle p-6 hover:border-border-color transition-all hover:shadow-lg hover:shadow-black/10 ${trendBg}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-text-muted mb-2">{label}</p>
          <p className="text-3xl font-bold text-text-primary tracking-tight">{displayValue}</p>
          {subtitle && (
            <p className={`text-xs mt-2 ${trendColor} flex items-center gap-1`}>
              {trendArrow && <span className="text-sm font-bold">{trendArrow}</span>}
              {subtitle}
            </p>
          )}
          {sparklineData && sparklineData.length >= 2 && (
            <div className="mt-3">
              <Sparkline
                data={sparklineData}
                width={120}
                height={24}
                color={trend === "up" ? "#22c55e" : trend === "down" ? "#ef4444" : "#3b82f6"}
              />
            </div>
          )}
        </div>
        {icon && (
          <div className="w-12 h-12 rounded-xl bg-accent-subtle flex items-center justify-center text-accent">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
