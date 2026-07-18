export const DEFAULT_CATEGORIES = ["Medical", "Nursing", "Hospitality", "Security"] as const;

const ARABIC_NAMES: Record<string, string> = {
  Medical: "طبي",
  Nursing: "تمريض",
  Hospitality: "ضيافة",
  Security: "أمن",
};

export function getCategoryArabic(englishKey: string): string {
  return ARABIC_NAMES[englishKey] ?? englishKey;
}

export function getCategoryDisplay(
  englishKey: string,
  categories: { nameEnglish: string; nameArabic: string }[],
  isEnglish: boolean,
): string {
  const match = categories.find(
    (c) => c.nameEnglish.toLowerCase() === englishKey.toLowerCase(),
  );
  if (match) return isEnglish ? match.nameEnglish : match.nameArabic;
  if (isEnglish) return englishKey;
  return ARABIC_NAMES[englishKey] ?? englishKey;
}
