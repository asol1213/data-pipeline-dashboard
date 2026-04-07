const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 60_000,
  maxRequests: 100,
};

export function checkRateLimit(
  key: string,
  config: RateLimitConfig = DEFAULT_CONFIG
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now >= entry.resetAt) {
    const resetAt = now + config.windowMs;
    rateLimitMap.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: config.maxRequests - 1, resetAt };
  }

  entry.count += 1;
  const allowed = entry.count <= config.maxRequests;
  const remaining = Math.max(0, config.maxRequests - entry.count);

  return { allowed, remaining, resetAt: entry.resetAt };
}

export function resetRateLimit(key: string): void {
  rateLimitMap.delete(key);
}

export function sanitizeInput(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/\.{2,}/g, ".")
    .slice(0, 255);
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export function validateFileSize(
  sizeInBytes: number,
  maxSize: number = MAX_FILE_SIZE
): FileValidationResult {
  if (sizeInBytes <= 0) {
    return { valid: false, error: "File is empty" };
  }
  if (sizeInBytes > maxSize) {
    return {
      valid: false,
      error: `File size (${(sizeInBytes / 1024 / 1024).toFixed(1)}MB) exceeds maximum allowed size (${(maxSize / 1024 / 1024).toFixed(1)}MB)`,
    };
  }
  return { valid: true };
}

export function validateCSVContentType(contentType: string): FileValidationResult {
  const allowedTypes = [
    "text/csv",
    "text/plain",
    "application/csv",
    "application/vnd.ms-excel",
  ];
  if (!allowedTypes.includes(contentType.toLowerCase())) {
    return { valid: false, error: `Invalid content type: ${contentType}` };
  }
  return { valid: true };
}
