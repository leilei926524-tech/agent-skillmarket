export type LocaleOption = {
  code: string;
  englishName: string;
  nativeName: string;
  dir?: "rtl";
};

// English plus the 59 interface languages listed by OpenAI for ChatGPT.
export const LOCALES = [
  { code: "en", englishName: "English", nativeName: "English" },
  { code: "sq", englishName: "Albanian", nativeName: "Shqip" },
  { code: "am", englishName: "Amharic", nativeName: "አማርኛ" },
  { code: "ar", englishName: "Arabic", nativeName: "العربية", dir: "rtl" },
  { code: "hy", englishName: "Armenian", nativeName: "Հայերեն" },
  { code: "bn", englishName: "Bengali", nativeName: "বাংলা" },
  { code: "bs", englishName: "Bosnian", nativeName: "Bosanski" },
  { code: "bg", englishName: "Bulgarian", nativeName: "Български" },
  { code: "my", englishName: "Burmese", nativeName: "မြန်မာ" },
  { code: "ca", englishName: "Catalan", nativeName: "Català" },
  { code: "zh-CN", englishName: "Chinese", nativeName: "简体中文" },
  { code: "hr", englishName: "Croatian", nativeName: "Hrvatski" },
  { code: "cs", englishName: "Czech", nativeName: "Čeština" },
  { code: "da", englishName: "Danish", nativeName: "Dansk" },
  { code: "nl", englishName: "Dutch", nativeName: "Nederlands" },
  { code: "et", englishName: "Estonian", nativeName: "Eesti" },
  { code: "fi", englishName: "Finnish", nativeName: "Suomi" },
  { code: "fr", englishName: "French", nativeName: "Français" },
  { code: "ka", englishName: "Georgian", nativeName: "ქართული" },
  { code: "de", englishName: "German", nativeName: "Deutsch" },
  { code: "el", englishName: "Greek", nativeName: "Ελληνικά" },
  { code: "gu", englishName: "Gujarati", nativeName: "ગુજરાતી" },
  { code: "hi", englishName: "Hindi", nativeName: "हिन्दी" },
  { code: "hu", englishName: "Hungarian", nativeName: "Magyar" },
  { code: "is", englishName: "Icelandic", nativeName: "Íslenska" },
  { code: "id", englishName: "Indonesian", nativeName: "Bahasa Indonesia" },
  { code: "it", englishName: "Italian", nativeName: "Italiano" },
  { code: "ja", englishName: "Japanese", nativeName: "日本語" },
  { code: "kn", englishName: "Kannada", nativeName: "ಕನ್ನಡ" },
  { code: "kk", englishName: "Kazakh", nativeName: "Қазақша" },
  { code: "ko", englishName: "Korean", nativeName: "한국어" },
  { code: "lv", englishName: "Latvian", nativeName: "Latviešu" },
  { code: "lt", englishName: "Lithuanian", nativeName: "Lietuvių" },
  { code: "mk", englishName: "Macedonian", nativeName: "Македонски" },
  { code: "ms", englishName: "Malay", nativeName: "Bahasa Melayu" },
  { code: "ml", englishName: "Malayalam", nativeName: "മലയാളം" },
  { code: "mr", englishName: "Marathi", nativeName: "मराठी" },
  { code: "mn", englishName: "Mongolian", nativeName: "Монгол" },
  { code: "no", englishName: "Norwegian", nativeName: "Norsk" },
  { code: "fa", englishName: "Persian", nativeName: "فارسی", dir: "rtl" },
  { code: "pl", englishName: "Polish", nativeName: "Polski" },
  { code: "pt", englishName: "Portuguese", nativeName: "Português" },
  { code: "pa", englishName: "Punjabi", nativeName: "ਪੰਜਾਬੀ" },
  { code: "ro", englishName: "Romanian", nativeName: "Română" },
  { code: "ru", englishName: "Russian", nativeName: "Русский" },
  { code: "sr", englishName: "Serbian", nativeName: "Српски" },
  { code: "sk", englishName: "Slovak", nativeName: "Slovenčina" },
  { code: "sl", englishName: "Slovenian", nativeName: "Slovenščina" },
  { code: "so", englishName: "Somali", nativeName: "Soomaali" },
  { code: "es", englishName: "Spanish", nativeName: "Español" },
  { code: "sw", englishName: "Swahili", nativeName: "Kiswahili" },
  { code: "sv", englishName: "Swedish", nativeName: "Svenska" },
  { code: "tl", englishName: "Tagalog", nativeName: "Tagalog" },
  { code: "ta", englishName: "Tamil", nativeName: "தமிழ்" },
  { code: "te", englishName: "Telugu", nativeName: "తెలుగు" },
  { code: "th", englishName: "Thai", nativeName: "ไทย" },
  { code: "tr", englishName: "Turkish", nativeName: "Türkçe" },
  { code: "uk", englishName: "Ukrainian", nativeName: "Українська" },
  { code: "ur", englishName: "Urdu", nativeName: "اردو", dir: "rtl" },
  { code: "vi", englishName: "Vietnamese", nativeName: "Tiếng Việt" },
] as const satisfies readonly LocaleOption[];

export type Locale = (typeof LOCALES)[number]["code"];

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_STORAGE_KEY = "gokui-locale";

export function isLocale(value: string): value is Locale {
  return LOCALES.some((locale) => locale.code === value);
}

export function matchLocale(preferences: readonly string[]): Locale {
  for (const preference of preferences) {
    const normalized = preference.toLowerCase();
    const exact = LOCALES.find((locale) => locale.code.toLowerCase() === normalized);
    if (exact) return exact.code;
    const base = normalized.split("-")[0];
    const baseMatch = LOCALES.find((locale) => locale.code.toLowerCase().split("-")[0] === base);
    if (baseMatch) return baseMatch.code;
  }
  return DEFAULT_LOCALE;
}

export function localeDirection(locale: Locale): "ltr" | "rtl" {
  return locale === "ar" || locale === "fa" || locale === "ur" ? "rtl" : "ltr";
}
