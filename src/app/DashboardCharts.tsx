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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {displayCols.map((col, i) => (
        <ChartCard
          key={col}
          title={col.replace(/_/g, " ")}
          data={chartData}
          xKey={labelCol}
          yKey={col}
          color={chartColors[i % chartColors.length]}
        />
      ))}
    </div>
  );
}
