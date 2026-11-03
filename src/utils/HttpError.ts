export class HttpError extends Error {
  statusCode: number;
  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

// id tidak valid (bukan angka) diperlakukan sebagai "tidak ditemukan"
export const parseId = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 && n < 2147483647 ? n : null;
};