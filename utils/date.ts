function getJstYmd(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date()); // 例: "2026-10-03"
}

/** `@db.Date` カラムとの比較用。JSTカレンダー日付の UTC 0:00 を返す */
export function getJstDateOnly(): Date {
  return new Date(`${getJstYmd()}T00:00:00.000Z`);
}

/** DateTime カラムとの比較用。JST 0:00〜23:59:59.999 の実際の瞬間を返す */
export function getJstDayRange(): { start: Date; end: Date } {
  const ymd = getJstYmd();
  return {
    start: new Date(`${ymd}T00:00:00.000+09:00`),
    end: new Date(`${ymd}T23:59:59.999+09:00`),
  };
}
