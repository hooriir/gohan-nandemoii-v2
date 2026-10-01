/**
 * 日本時間（JST）における「本日の00:00:00」のDateオブジェクトを取得する
 */
export function getTodayJst(): Date {
  const now = new Date();

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const jstDateString = formatter.format(now);

  return new Date(`${jstDateString}T00:00:00.000+09:00`);
}
