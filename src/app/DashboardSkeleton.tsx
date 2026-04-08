export function DashboardSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Quick Stats Bar skeleton */}
      <div className="bg-bg-card rounded-xl border border-border-subtle p-4 mb-8">
        <div className="flex items-center gap-6">
          <div className="h-4 w-20 bg-border-subtle rounded"></div>
          <div className="h-4 w-24 bg-border-subtle rounded"></div>
          <div className="h-4 w-28 bg-border-subtle rounded"></div>
          <div className="h-4 w-24 bg-border-subtle rounded"></div>
        </div>
      </div>

      {/* KPI Cards skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-bg-card rounded-xl border border-border-subtle p-6"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-3">
                <div className="h-3 w-20 bg-border-subtle rounded"></div>
                <div className="h-8 w-24 bg-border-subtle rounded"></div>
                <div className="h-3 w-32 bg-border-subtle rounded"></div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-border-subtle"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts skeleton */}
      <div className="mb-4">
        <div className="h-5 w-20 bg-border-subtle rounded mb-4"></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-bg-card rounded-xl border border-border-subtle p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="h-4 w-28 bg-border-subtle rounded"></div>
              <div className="h-6 w-40 bg-border-subtle rounded"></div>
            </div>
            <div className="h-[300px] bg-border-subtle rounded-lg"></div>
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="bg-bg-card rounded-xl border border-border-subtle overflow-hidden">
        <div className="p-4 border-b border-border-subtle flex items-center justify-between">
          <div className="h-4 w-24 bg-border-subtle rounded"></div>
          <div className="h-8 w-64 bg-border-subtle rounded"></div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-subtle">
                {Array.from({ length: 5 }).map((_, i) => (
                  <th key={i} className="px-4 py-3">
                    <div className="h-4 w-20 bg-border-subtle rounded"></div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 8 }).map((_, rowIdx) => (
                <tr key={rowIdx} className="border-b border-border-subtle/50">
                  {Array.from({ length: 5 }).map((_, colIdx) => (
                    <td key={colIdx} className="px-4 py-2.5">
                      <div className="h-4 w-16 bg-border-subtle rounded"></div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
