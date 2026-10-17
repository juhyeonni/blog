const CJK = /[぀-ヿ㐀-鿿가-힯]/g;

export function readingMinutes(text: string): number {
  const chars = (text.match(CJK) ?? []).length;
  const words = text.replace(CJK, ' ').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(chars / 500 + words / 220));
}
