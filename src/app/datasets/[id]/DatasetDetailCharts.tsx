"use client";

import ChartCard from "@/components/ChartCard";

interface DatasetDetailChartsProps {
  chartData: Record<string, string | number>[];
  labelCol: string;
  numericCols: string[];
  chartColors: string[];
}

export default function DatasetDetailCharts({
  chartData,
  labelCol,
  numericCols,
  chartColors,
}: DatasetDetailChartsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {numericCols.map((col, i) => (
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
