import en from "@/locales/en.json";
import es from "@/locales/es.json";
import pt from "@/locales/pt.json";

export type Locale = "en" | "es" | "pt";

type Messages = Record<string, unknown>;

const messages: Record<Locale, Messages> = { en, es, pt };

export function getMessages(locale: Locale) {
  return messages[locale] ?? messages.en;
}

export function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const keys = path.split(".");
  let current: unknown = obj;
  for (const key of keys) {
    if (current && typeof current === "object" && key in current) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return path;
    }
  }
  return typeof current === "string" ? current : path;
}

export function t(locale: Locale, key: string, params?: Record<string, string>): string {
  let value = getNestedValue(messages[locale] ?? messages.en, key);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      value = value.replace(`{${k}}`, v);
    }
  }
  return value;
}
