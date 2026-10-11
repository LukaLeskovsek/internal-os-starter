// Plain module constants and pure helpers. No "use server" / "use client", so
// both the server action and the sheet's live preview import the same maths.

/** SLO uredba mileage rate. Constant for now; a later slice can make it editable. */
export const RATE_EUR_PER_KM = 0.43;

/** How many recent routes the "Nova pot" sheet offers as one-tap chips. */
export const RECENT_ROUTES = 5;

/** km are stored with one decimal (numeric(8,1)). */
export function roundKm(km: number): number {
  return Math.round(km * 10) / 10;
}

/** The reimbursement for a trip: km × rate, rounded to cents. */
export function reimbursement(km: number, rate: number = RATE_EUR_PER_KM): number {
  return Math.round(roundKm(km) * rate * 100) / 100;
}
