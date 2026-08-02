export function isEnglishUi(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.lang.toLowerCase().startsWith("en");
}

export function uiText(chinese: string, english: string): string {
  return isEnglishUi() ? english : chinese;
}
