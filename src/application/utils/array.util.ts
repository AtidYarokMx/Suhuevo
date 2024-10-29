export function asyncGroupBy<T>(records: T[], key: keyof T): Promise<{ [key: string]: T[] }> {
  return new Promise((resolve, reject) => {
    if (typeof records !== "object" || !records.length) reject()

    const result = records.reduce((acc: { [key: string]: T[] }, record: T) => {
      const groupKey = String(record[key]);
      acc[groupKey] = acc[groupKey] || [];
      acc[groupKey].push(record);
      return acc;
    }, {});

    resolve(result)
  })
}