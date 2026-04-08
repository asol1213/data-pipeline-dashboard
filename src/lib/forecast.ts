/**
 * Simple linear regression and forecast utilities.
 * Uses least-squares method for fitting.
 */

export interface RegressionResult {
  slope: number;
  intercept: number;
  r2: number;
}

export interface ForecastResult {
  predicted: number[];
  confidence: {
    upper: number[];
    lower: number[];
  };
}

/**
 * Compute linear regression (least squares) over an array of values.
 * x-values are implicitly 0, 1, 2, ... (indices).
 */
export function linearRegression(values: number[]): RegressionResult {
  const n = values.length;
  if (n < 2) {
    return { slope: 0, intercept: values[0] ?? 0, r2: 0 };
  }

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  let sumY2 = 0;

  for (let i = 0; i < n; i++) {
    const x = i;
    const y = values[i];
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
    sumY2 += y * y;
  }

  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) {
    return { slope: 0, intercept: sumY / n, r2: 0 };
  }

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  // Coefficient of determination (R²)
  const meanY = sumY / n;
  let ssTot = 0;
  let ssRes = 0;
  for (let i = 0; i < n; i++) {
    const predicted = slope * i + intercept;
    ssTot += (values[i] - meanY) ** 2;
    ssRes += (values[i] - predicted) ** 2;
  }

  const r2 = ssTot === 0 ? 0 : Math.max(0, Math.min(1, 1 - ssRes / ssTot));

  return {
    slope: Math.round(slope * 1000) / 1000,
    intercept: Math.round(intercept * 1000) / 1000,
    r2: Math.round(r2 * 10000) / 10000,
  };
}

/**
 * Forecast future values using linear regression.
 * Confidence interval uses ±1.96 * standard error.
 */
export function forecast(
  values: number[],
  periodsAhead: number
): ForecastResult {
  const n = values.length;
  if (n < 2 || periodsAhead < 1) {
    return {
      predicted: [],
      confidence: { upper: [], lower: [] },
    };
  }

  const reg = linearRegression(values);

  // Standard error of the regression
  let ssRes = 0;
  for (let i = 0; i < n; i++) {
    const predicted = reg.slope * i + reg.intercept;
    ssRes += (values[i] - predicted) ** 2;
  }
  const se = Math.sqrt(ssRes / (n - 2));

  const predicted: number[] = [];
  const upper: number[] = [];
  const lower: number[] = [];

  for (let p = 1; p <= periodsAhead; p++) {
    const x = n - 1 + p;
    const yHat = reg.slope * x + reg.intercept;
    const margin = 1.96 * se;

    predicted.push(Math.round(yHat * 100) / 100);
    upper.push(Math.round((yHat + margin) * 100) / 100);
    lower.push(Math.round((yHat - margin) * 100) / 100);
  }

  return {
    predicted,
    confidence: { upper, lower },
  };
}
