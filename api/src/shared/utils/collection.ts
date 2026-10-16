export function deepClone(x: any) {
  return JSON.parse(JSON.stringify(x));
}

export function same(a: any, b: any) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function mapById(arr: any[]): Map<any, any> {
  return new Map((arr || []).map((x: any) => [x.id, x]));
}
