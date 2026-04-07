"use client";

import ChartCard from "@/components/ChartCard";

interface DashboardChartsProps {
  chartData: Record<string, string | number>[];
  labelCol: string;
  numericCols: string[];
  chartColors: string[];
}

export default function DashboardCharts({
  chartData,
  labelCol,
  numericCols,
  chartColors,
}: DashboardChartsProps) {
  // Show up to 4 charts in a grid
  const displayCols = numericCols.slice(0, 4);

  const defaultTypes: ("bar" | "line" | "area" | "pie")[] = ["bar", "line", "area", "pie"];

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-1 h-6 rounded-full bg-[#06b6d4]"></div>
        <h2 className="text-lg font-semibold text-text-primary">Charts</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {displayCols.map((col, i) => (
          <ChartCard
            key={col}
            title={col.replace(/_/g, " ")}
            data={chartData}
            xKey={labelCol}
            yKey={col}
            color={chartColors[i % chartColors.length]}
            defaultType={defaultTypes[i % defaultTypes.length]}
          />
        ))}
      </div>
    </div>
  );
}
