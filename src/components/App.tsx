import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  AlertTriangle,
  BarChart3,
  Camera,
  Check,
  ChefHat,
  ExternalLink,
  FileDown,
  ImagePlus,
  Info,
  Lock,
  LogOut,
  Mail,
  Moon,
  Package,
  Plus,
  RefreshCw,
  ScanLine,
  Search,
  ShoppingBag,
  Sun,
  Trash2,
  User,
} from "lucide-react";
import { Smiley, type Mouth } from "@/components/smiley";
import {
  CATEGORIES,
  type Category,
  type HistoryEntry,
  type Item,
  type PantryData,
  type Session,
  clearSession,
  daysLabel,
  firstName,
  greetingFor,
  isoOffset,
  readPantry,
  readSession,
  readTheme,
  registerAccount,
  shelfDays,
  shelfLife,
  signInAccount,
  stageRank,
  uid,
  writePantry,
  writeTheme,
  formatStamp,
} from "@/lib/pantry";
import { classifyCanvas, draw224, loadImage, loadVision, lookupOpenFoodFacts, peekVision, readBarcode, type VisionNet } from "@/lib/scan";

type Tab = "stock" | "scan" | "shopping" | "analytics";
type Theme = "light" | "dark";

type Draft = {
  name: string;
  category: Category;
  mfd: string;
  exp: string;
  quantity: string;
};

type RecipeIdea = {
  id: string;
  title: string;
  time: string;
  ingredients: string[];
  steps: string;
  youtubeUrl: string;
};

const EMPTY_DRAFT: Draft = {
  name: "",
  category: "Produce",
  mfd: "",
  exp: "",
  quantity: "1",
};

const TABS: { id: Tab; label: string; icon: typeof Package }[] = [
  { id: "stock", label: "Stock", icon: Package },
  { id: "scan", label: "Scan", icon: ScanLine },
  { id: "shopping", label: "Shopping", icon: ShoppingBag },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
];

const SHORT: Record<Category, string> = {
  Produce: "Produce",
  Dairy: "Dairy",
  Bakery: "Bakery",
  Beverages: "Drinks",
  Pantry: "Pantry",
  "Meat/Seafood": "Meat",
};

const SPECIFIC_STORAGE_TIPS: Array<{ match: string; tip: string }> = [
  { match: "apple", tip: "Keep apples in a breathable bag in the crisper drawer and away from ethylene-sensitive produce so they stay crisp longer." },
  { match: "banana", tip: "Store bananas at room temperature away from direct sunlight, and wrap the stem crown to slow ripening." },
  { match: "orange", tip: "Store oranges in a cool spot or the fridge crisper and avoid sealing them in damp plastic." },
  { match: "spinach", tip: "Pat spinach dry, wrap loosely in a dry paper towel inside an airtight container, and refrigerate." },
  { match: "lettuce", tip: "Wash, spin or pat dry, and store in a lined container in the fridge so leaves stay crunchy." },
  { match: "tomato", tip: "Keep unripe tomatoes stem-side down on the counter; refrigerate only once ripe to preserve texture and flavor." },
  { match: "potato", tip: "Store potatoes in a cool, dark, well-ventilated spot—never next to onions, which speed up sprouting." },
  { match: "onion", tip: "Keep whole onions in a cool, dry, dark place with airflow; refrigerate only after slicing." },
  { match: "milk", tip: "Keep milk on an inner fridge shelf (not the warm door) and close the cap immediately after pouring." },
  { match: "yogurt", tip: "Keep yogurt chilled in its sealed tub and spoon out with a clean, dry spoon to prevent mold." },
  { match: "cheese", tip: "Wrap cheese in wax or parchment paper loosely inside a resealable bag rather than tight plastic wrap." },
  { match: "paneer", tip: "Store fresh paneer submerged in clean cold water in a sealed container in the fridge, changing the water every 1–2 days." },
  { match: "egg", tip: "Keep eggs in their original carton on a middle fridge shelf so they stay fresh and absorb fewer odors." },
  { match: "bread", tip: "Store bread in a cool, dry breadbox or sealed bag at room temperature, or freeze slices for longer storage." },
  { match: "chicken", tip: "Keep raw chicken sealed on the bottom fridge shelf in a tray to catch drips, or freeze if not cooking within 1–2 days." },
  { match: "fish", tip: "Keep fish on the coldest bottom shelf in a sealed container over ice/chilled pack and cook promptly." },
];

const CATEGORY_STORAGE_TIPS: Record<Category, string> = {
  Produce: "Store in the fridge crisper or a cool dry spot based on ripeness, and separate ethylene-releasing fruit from greens.",
  Dairy: "Keep chilled below 4°C on an interior shelf and reseal tightly after each use.",
  Bakery: "Keep in a sealed bag or breadbox away from heat and moisture to prevent staling or mold.",
  Beverages: "Keep sealed, upright, and chilled after opening; store unopened cartons in a cool pantry.",
  Pantry: "Keep dry goods in airtight containers away from stove heat, steam, and direct sunlight.",
  "Meat/Seafood": "Keep tightly sealed on the lowest fridge shelf away from ready-to-eat foods, or freeze for longer shelf life.",
};

function storageTipForItem(item: Item): string {
  const lowerName = item.name.toLowerCase();
  const specific = SPECIFIC_STORAGE_TIPS.find((entry) => lowerName.includes(entry.match));
  if (specific) return specific.tip;
  return CATEGORY_STORAGE_TIPS[item.category] ?? "Store in a cool, dry place and check regularly for freshness.";
}

function barColorForStage(stage: string): string {
  if (stage === "Expired" || stage === "Critical") return "#ef4444";
  return "#f59e0b";
}

const RECIPE_CATALOG: RecipeIdea[] = [
  {
    id: "spinach-egg-scramble",
    title: "Spinach & Egg Scramble",
    time: "10 min",
    ingredients: ["spinach", "egg", "butter", "cheese", "bread"],
    steps: "Wilt spinach with a little butter, fold in beaten eggs until softly set, and top with cheese or serve alongside toast.",
    youtubeUrl: "https://www.youtube.com/results?search_query=spinach+and+egg+scramble+recipe",
  },
  {
    id: "paneer-veggie-tawa",
    title: "Quick Paneer & Veggie Tawa",
    time: "15 min",
    ingredients: ["paneer", "tomato", "onion", "oil", "rice"],
    steps: "Sauté onions and tomatoes in oil, toss in cubed paneer with spices, and serve hot with steamed rice or flatbread.",
    youtubeUrl: "https://www.youtube.com/watch?v=KgW--wj5iBM",
  },
  {
    id: "banana-yogurt-bowl",
    title: "Banana & Yogurt Breakfast Bowl",
    time: "5 min",
    ingredients: ["banana", "yogurt", "apple", "orange", "milk"],
    steps: "Slice ripe banana and fruit over chilled yogurt or milk for a fast, zero-waste breakfast or snack.",
    youtubeUrl: "https://www.youtube.com/watch?v=QG4IAVj6CYg",
  },
  {
    id: "garlic-herb-pasta-rice",
    title: "One-Pan Pantry Stir Bowl",
    time: "15 min",
    ingredients: ["rice", "pasta", "lentil", "dal", "tomato", "onion", "carrot", "broccoli", "oil"],
    steps: "Cook your grain or lentils, stir-fry available vegetables with oil and aromatics, and combine everything in one pan.",
    youtubeUrl: "https://www.youtube.com/watch?v=nPi2GD2SqfQ",
  },
  {
    id: "savory-toast-melt",
    title: "Crispy Toast & Cheese Melt",
    time: "8 min",
    ingredients: ["bread", "bun", "bagel", "cheese", "butter", "tomato"],
    steps: "Layer sliced tomato and cheese on bread or buns, brush lightly with butter, and toast until golden and melted.",
    youtubeUrl: "https://www.youtube.com/results?search_query=crispy+cheese+toast+melt+recipe",
  },
  {
    id: "chicken-fish-skillet",
    title: "Pan-Seared Protein & Greens",
    time: "18 min",
    ingredients: ["chicken", "fish", "shrimp", "spinach", "lettuce", "potato", "oil"],
    steps: "Sear diced chicken, fish, or shrimp in oil until cooked through, and pair with sautéed greens or roasted potatoes.",
    youtubeUrl: "https://www.youtube.com/results?search_query=pan+seared+chicken+or+fish+with+greens+recipe",
  },
];

const FOOD_CATALOG: Array<{ keyword: string; name: string; category: Category; predictiveDays: number }> = [
  { keyword: "apple", name: "Apples", category: "Produce", predictiveDays: 6 },
  { keyword: "banana", name: "Bananas", category: "Produce", predictiveDays: 5 },
  { keyword: "orange", name: "Oranges", category: "Produce", predictiveDays: 10 },
  { keyword: "spinach", name: "Fresh spinach", category: "Produce", predictiveDays: 5 },
  { keyword: "lettuce", name: "Lettuce", category: "Produce", predictiveDays: 7 },
  { keyword: "tomato", name: "Tomatoes", category: "Produce", predictiveDays: 7 },
  { keyword: "carrot", name: "Carrots", category: "Produce", predictiveDays: 14 },
  { keyword: "broccoli", name: "Broccoli", category: "Produce", predictiveDays: 7 },
  { keyword: "potato", name: "Potatoes", category: "Produce", predictiveDays: 21 },
  { keyword: "onion", name: "Onions", category: "Produce", predictiveDays: 25 },
  { keyword: "milk", name: "Milk", category: "Dairy", predictiveDays: 7 },
  { keyword: "yogurt", name: "Yogurt", category: "Dairy", predictiveDays: 10 },
  { keyword: "cheese", name: "Cheese", category: "Dairy", predictiveDays: 14 },
  { keyword: "butter", name: "Butter", category: "Dairy", predictiveDays: 30 },
  { keyword: "paneer", name: "Paneer", category: "Dairy", predictiveDays: 5 },
  { keyword: "egg", name: "Organic eggs", category: "Dairy", predictiveDays: 21 },
  { keyword: "bread", name: "Bread", category: "Bakery", predictiveDays: 5 },
  { keyword: "bun", name: "Buns", category: "Bakery", predictiveDays: 4 },
  { keyword: "bagel", name: "Bagels", category: "Bakery", predictiveDays: 6 },
  { keyword: "juice", name: "Juice", category: "Beverages", predictiveDays: 10 },
  { keyword: "tea", name: "Tea", category: "Beverages", predictiveDays: 90 },
  { keyword: "coffee", name: "Coffee", category: "Beverages", predictiveDays: 60 },
  { keyword: "rice", name: "Rice", category: "Pantry", predictiveDays: 180 },
  { keyword: "pasta", name: "Pasta", category: "Pantry", predictiveDays: 180 },
  { keyword: "lentil", name: "Lentils", category: "Pantry", predictiveDays: 180 },
  { keyword: "dal", name: "Dal", category: "Pantry", predictiveDays: 180 },
  { keyword: "oil", name: "Cooking oil", category: "Pantry", predictiveDays: 120 },
  { keyword: "chicken", name: "Chicken", category: "Meat/Seafood", predictiveDays: 3 },
  { keyword: "fish", name: "Fish", category: "Meat/Seafood", predictiveDays: 2 },
  { keyword: "shrimp", name: "Shrimp", category: "Meat/Seafood", predictiveDays: 2 },
];

type DetectedVoiceFood = {
  name: string;
  category: Category;
  daysUntilExpiry: number;
  expDate: string;
  explicitDate?: boolean;
};

type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

const MONTHS: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

const NUMBER_WORDS: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  twenty: 20,
  thirty: 30,
};

function toIsoLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function diffDaysFromToday(isoDate: string): number {
  const today = new Date();
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const [y, m, d] = isoDate.split("-").map(Number);
  const target = new Date(y, (m || 1) - 1, d || 1).getTime();
  return Math.max(1, Math.round((target - startToday) / 86_400_000));
}

function parseQuantityToken(token: string | undefined): number {
  if (!token) return 1;
  const lower = token.toLowerCase();
  if (NUMBER_WORDS[lower] !== undefined) return NUMBER_WORDS[lower];
  const parsed = Number(lower);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(99, Math.round(parsed)) : 1;
}

function parseDateTokenToIso(rawMatch: string, explicitYear?: number): string | null {
  const isoMatch = rawMatch.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]) - 1;
    const day = Number(isoMatch[3]);
    const candidate = new Date(year, month, day);
    if (candidate.getFullYear() === year && candidate.getMonth() === month && candidate.getDate() === day) {
      return toIsoLocal(candidate);
    }
    return null;
  }

  const slashMatch = rawMatch.match(/^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?$/);
  if (slashMatch) {
    const first = Number(slashMatch[1]);
    const second = Number(slashMatch[2]);
    const rawYear = slashMatch[3] ? Number(slashMatch[3]) : explicitYear ?? new Date().getFullYear();
    const year = rawYear < 100 ? 2000 + rawYear : rawYear;
    const day = first > 12 ? first : second;
    const month = (first > 12 ? second : first) - 1;
    const candidate = new Date(year, month, day);
    if (candidate.getFullYear() === year && candidate.getMonth() === month && candidate.getDate() === day) {
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      if (!slashMatch[3] && !explicitYear && candidate < todayStart) {
        candidate.setFullYear(year + 1);
      }
      return toIsoLocal(candidate);
    }
    return null;
  }

  const monthNames = Object.keys(MONTHS).join("|");
  const dayFirst = rawMatch.match(new RegExp(`^(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?(${monthNames})(?:\\s+(\\d{4}))?$`, "i"));
  if (dayFirst) {
    const day = Number(dayFirst[1]);
    const month = MONTHS[dayFirst[2].toLowerCase()];
    const year = dayFirst[3] ? Number(dayFirst[3]) : explicitYear ?? new Date().getFullYear();
    const candidate = new Date(year, month, day);
    if (candidate.getFullYear() === year && candidate.getMonth() === month && candidate.getDate() === day) {
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      if (!dayFirst[3] && !explicitYear && candidate < todayStart) {
        candidate.setFullYear(year + 1);
      }
      return toIsoLocal(candidate);
    }
    return null;
  }

  const monthFirst = rawMatch.match(new RegExp(`^(${monthNames})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s*(\\d{4}))?$`, "i"));
  if (monthFirst) {
    const month = MONTHS[monthFirst[1].toLowerCase()];
    const day = Number(monthFirst[2]);
    const year = monthFirst[3] ? Number(monthFirst[3]) : explicitYear ?? new Date().getFullYear();
    const candidate = new Date(year, month, day);
    if (candidate.getFullYear() === year && candidate.getMonth() === month && candidate.getDate() === day) {
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      if (!monthFirst[3] && !explicitYear && candidate < todayStart) {
        candidate.setFullYear(year + 1);
      }
      return toIsoLocal(candidate);
    }
  }

  return null;
}

function extractExpiryFromClause(clause: string): { expDate: string; daysUntilExpiry: number } | null {
  const lower = clause.toLowerCase();
  const numWordsPattern = Object.keys(NUMBER_WORDS).join("|");
  const monthNames = Object.keys(MONTHS).join("|");

  const weeksMatch = lower.match(new RegExp(`\\b(?:in\\s+)?(\\d+|${numWordsPattern})\\s*(?:weeks?|wks?|w)\\b`, "i"));
  if (weeksMatch) {
    const days = Math.max(1, parseQuantityToken(weeksMatch[1]) * 7);
    return { expDate: isoOffset(days), daysUntilExpiry: days };
  }

  const daysMatch = lower.match(new RegExp(`\\b(?:in\\s+)?(\\d+|${numWordsPattern})\\s*(?:days?|d)\\b`, "i"));
  if (daysMatch) {
    const days = Math.max(1, parseQuantityToken(daysMatch[1]));
    return { expDate: isoOffset(days), daysUntilExpiry: days };
  }

  if (/\btomorrow\b/.test(lower)) {
    return { expDate: isoOffset(1), daysUntilExpiry: 1 };
  }

  const dateCandidates = [
    lower.match(/\b\d{4}-\d{1,2}-\d{1,2}\b/)?.[0],
    lower.match(/\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b/)?.[0],
    lower.match(new RegExp(`\\b\\d{1,2}(?:st|nd|rd|th)?\\s+(?:of\\s+)?(?:${monthNames})(?:\\s+\\d{4})?\\b`, "i"))?.[0],
    lower.match(new RegExp(`\\b(?:${monthNames})\\s+\\d{1,2}(?:st|nd|rd|th)?(?:,?\\s*\\d{4})?\\b`, "i"))?.[0],
  ].filter((token): token is string => Boolean(token));

  for (const token of dateCandidates) {
    const iso = parseDateTokenToIso(token);
    if (iso) {
      return { expDate: iso, daysUntilExpiry: diffDaysFromToday(iso) };
    }
  }

  return null;
}

function parseVoiceFoods(text: string): DetectedVoiceFood[] {
  const found = new Map<string, DetectedVoiceFood>();

  const clauseRegex = /[^.;]+(?:[.;]|$)/g;
  let clauseMatch: RegExpExecArray | null;

  while ((clauseMatch = clauseRegex.exec(text)) !== null) {
    const rawClause = clauseMatch[0];
    const clauseLower = rawClause.toLowerCase();

    type Occasion = {
      entry: (typeof FOOD_CATALOG)[number];
      localStart: number;
      localEnd: number;
    };
    const occasions: Occasion[] = [];

    for (const entry of FOOD_CATALOG) {
      const regex = new RegExp(`\\b${entry.keyword}(?:es|s)?\\b`, "gi");
      let m: RegExpExecArray | null;
      while ((m = regex.exec(clauseLower)) !== null) {
        occasions.push({
          entry,
          localStart: m.index,
          localEnd: m.index + m[0].length,
        });
      }
    }

    occasions.sort((a, b) => a.localStart - b.localStart);

    const uniqueOccasions: Occasion[] = [];
    const seenInClause = new Set<string>();
    for (const occ of occasions) {
      const key = occ.entry.name.toLowerCase();
      if (!seenInClause.has(key)) {
        seenInClause.add(key);
        uniqueOccasions.push(occ);
      }
    }

    const wholeClauseExpiry = extractExpiryFromClause(rawClause);

    for (let i = 0; i < uniqueOccasions.length; i++) {
      const current = uniqueOccasions[i];
      const next = uniqueOccasions[i + 1];

      const spanToNextFood = rawClause.slice(current.localEnd, next ? next.localStart : rawClause.length);
      const localExpiry = extractExpiryFromClause(spanToNextFood);

      let chosenExpiry: { expDate: string; daysUntilExpiry: number } | null = localExpiry;

      if (!chosenExpiry && wholeClauseExpiry) {
        const hasPluralSharedExpiry = /\b(?:and|&)\b[^.;]*\b(?:expire|expiring|are\s+good\s+for|last)\b/i.test(rawClause);
        const hasLaterSingularExpiry =
          next &&
          /\b(?:expires?|spoils?|goes?\s+bad)\b/i.test(rawClause.slice(next.localStart));

        if (hasPluralSharedExpiry && !hasLaterSingularExpiry) {
          chosenExpiry = wholeClauseExpiry;
        }
      }

      const key = current.entry.name.toLowerCase();
      const existing = found.get(key);

      if (chosenExpiry) {
        found.set(key, {
          name: current.entry.name,
          category: current.entry.category,
          daysUntilExpiry: chosenExpiry.daysUntilExpiry,
          expDate: chosenExpiry.expDate,
          explicitDate: true,
        });
      } else if (!existing) {
        found.set(key, {
          name: current.entry.name,
          category: current.entry.category,
          daysUntilExpiry: current.entry.predictiveDays,
          expDate: isoOffset(current.entry.predictiveDays),
          explicitDate: false,
        });
      }
    }
  }

  return [...found.values()];
}

function normalizeInitialItems(rawItems: Item[]): Item[] {
  const todayIso = isoOffset(0);
  const minFutureExpIso = isoOffset(3);

  return rawItems.map((item) => {
    const defaultDays = Math.max(3, shelfDays(item.category));
    const fallbackExp = isoOffset(defaultDays);

    let mfd = item.mfd && /^\d{4}-\d{2}-\d{2}$/.test(item.mfd) ? item.mfd : todayIso;
    if (mfd > todayIso) {
      mfd = todayIso;
    }

    let exp = item.exp && /^\d{4}-\d{2}-\d{2}$/.test(item.exp) ? item.exp : fallbackExp;
    if (exp <= mfd || exp <= minFutureExpIso) {
      exp = fallbackExp > minFutureExpIso ? fallbackExp : minFutureExpIso;
    }

    return {
      ...item,
      mfd,
      exp,
      quantity: Math.max(1, Number(item.quantity) || 1),
    };
  });
}

function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={"font-display font-semibold tracking-tight " + className}>
      Expire<span className="font-medium italic">Ease</span>
    </span>
  );
}

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </label>
      {children}
    </div>
  );
}

const fieldClass =
  "h-12 w-full min-w-0 rounded-xl border border-line bg-inset px-3 text-sm text-ink outline-none placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

function ThemeContrastStyles() {
  return (
    <style>{`
      [data-theme="light"] {
        color-scheme: light;
      }
      [data-theme="light"] .stock-card,
      [data-theme="light"] .bg-surface {
        color: #f8fafc;
      }
      [data-theme="light"] .stock-card .text-muted,
      [data-theme="light"] .bg-surface .text-muted {
        color: #cbd5e1;
      }
      [data-theme="light"] .stock-card .text-surface-muted,
      [data-theme="light"] .bg-surface .text-surface-muted {
        color: #e2e8f0;
      }
      [data-theme="light"] .bg-inset,
      [data-theme="light"] input,
      [data-theme="light"] select,
      [data-theme="light"] button.bg-inset, [data-theme="light"] button.bg-inset * {
        color: #111827 !important;
      }
      [data-theme="light"] .bg-inset .text-muted,
      [data-theme="light"] button.bg-inset .text-muted {
        color: #374151 !important;
      }
      [data-theme="light"] .bg-inset .text-muted {
        color: #374151 !important;
      }
      [data-theme="light"] input::placeholder,
      [data-theme="light"] input::-webkit-datetime-edit,
      [data-theme="light"] input::-webkit-datetime-edit-fields-wrapper,
      [data-theme="light"] input::-webkit-datetime-edit-text,
      [data-theme="light"] input::-webkit-datetime-edit-month-field,
      [data-theme="light"] input::-webkit-datetime-edit-day-field,
      [data-theme="light"] input::-webkit-datetime-edit-year-field {
        color: #1f2937 !important;
      }
      [data-theme="light"] input {
        color: #1f2937 !important;
      }
      [data-theme="light"] select option {
        background-color: #ffffff;
        color: #111827;
      }
      [data-theme="light"] footer .text-surface-muted {
        color: #272230;
      }
      [data-theme="light"] footer .text-muted {
        color: #3f384c;
      }
    `}</style>
  );
}

function Footer() {
  return (
    <footer className="no-print mx-auto w-full max-w-lg px-4 pb-24 pt-2">
      <p className="font-display text-3xl font-semibold leading-snug text-surface-muted">
        Waste less.
        <br />
        Eat fresh.{" "}
        <svg
          viewBox="0 0 24 24"
          className="inline-block size-6 -translate-y-0.5 fill-[#ef4444]"
          aria-hidden="true"
        >
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
      </p>
      <p className="mt-4 text-sm font-medium tracking-tight text-muted">
        Expire<span className="italic">Ease</span>
      </p>
    </footer>
  );
}

export default function App() {
  const [booted, setBooted] = useState(false);
  const [theme, setTheme] = useState<Theme>("dark");
  const [session, setSession] = useState<Session | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [tab, setTab] = useState<Tab>("stock");
  const [now, setNow] = useState(() => Date.now());
  const loadedEmail = useRef<string | null>(null);

  useEffect(() => {
    const savedTheme = readTheme();
    setTheme(savedTheme);
    const existing = readSession();
    if (existing) {
      const pantry = readPantry(existing.email);
      const fixedItems = normalizeInitialItems(pantry.items);
      loadedEmail.current = existing.email;
      setItems(fixedItems);
      setHistory(pantry.history);
      setSession(existing);
    }
    setBooted(true);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!booted || !session || loadedEmail.current !== session.email) return;
    const data: PantryData = { items, history };
    writePantry(session.email, data);
  }, [booted, session, items, history]);

  function toggleTheme() {
    setTheme((current) => {
      const next = current === "dark" ? "light" : "dark";
      writeTheme(next);
      return next;
    });
  }

  function openPantry(next: Session) {
    const pantry = readPantry(next.email);
    const fixedItems = normalizeInitialItems(pantry.items);
    loadedEmail.current = next.email;
    setItems(fixedItems);
    setHistory(pantry.history);
    setSession(next);
    setTab("stock");
  }

  function logout() {
    loadedEmail.current = null;
    clearSession();
    setSession(null);
    setTab("stock");
  }

  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <ThemeContrastStyles />
      <Header
        name={firstName(session?.name ?? "")}
        now={now}
        items={items}
        theme={theme}
        onTheme={toggleTheme}
        onLogout={logout}
      />
      <main className="app-main mx-auto w-full max-w-lg px-4 pb-28 pt-6">
        {tab === "stock" && (
          <StockTab now={now} items={items} history={history} setItems={setItems} setHistory={setHistory} onScan={() => setTab("scan")} />
        )}
        {tab === "scan" && <ScanTab items={items} setItems={setItems} onSaved={() => setTab("stock")} />}
        {tab === "shopping" && <ShoppingTab history={history} />}
        {tab === "analytics" && <AnalyticsTab history={history} />}
      </main>
      <Footer />
      <nav className="no-print fixed bottom-0 left-0 right-0 z-30 border-t border-line bg-surface/80 backdrop-blur-md pb-[env(safe-area-inset-bottom)]" aria-label="Sections">
        <div className="mx-auto grid max-w-lg grid-cols-4">
          {TABS.map((entry) => {
            const Icon = entry.icon;
            const active = tab === entry.id;
            return (
              <button
                key={entry.id}
                type="button"
                aria-current={active ? "page" : undefined}
                onClick={() => setTab(entry.id)}
                className={"flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-medium " + (active ? "text-accent" : "text-muted")}
              >
                <Icon className="size-5" strokeWidth={active ? 2.25 : 1.75} aria-hidden="true" />
                {entry.label}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function AuthScreen({ onEnter, onForgotPassword }: { onEnter: (session: Session) => void; onForgotPassword: () => void }) {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [shy, setShy] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [googlePending, setGooglePending] = useState(false);

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const mouth: Mouth = error ? "frown" : emailOk ? "smile" : "neutral";

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    const result =
      mode === "up"
        ? await registerAccount(name, email, password)
        : await signInAccount(email, password);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onEnter(result.session);
  }

  async function handleGoogleSignIn() {
    setError("");
    setGooglePending(true);
    try {
      const authModule = await import("@/lib/auth/client");
      const client = authModule as {
        authClient?: { signIn?: { social?: (args: { provider: string; callbackURL: string }) => Promise<unknown> } };
        signIn?: (provider: string, opts?: { callbackURL?: string }) => Promise<unknown>;
      };

      if (client.authClient?.signIn?.social) {
        await client.authClient.signIn.social({
          provider: "google",
          callbackURL: "/",
        });
        return;
      }

      if (typeof client.signIn === "function") {
        await client.signIn("google", { callbackURL: "/" });
        return;
      }

      throw new Error("Google sign-in client is not configured.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start Google sign-in.");
    } finally {
      setGooglePending(false);
    }
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-canvas px-4 py-10 text-ink">
      <div className="fade-in w-full max-w-md rounded-3xl border border-line bg-surface p-6 sm:p-8">
        <div className="mb-5 flex justify-center">
          <Smiley mouth={mouth} shy={shy} />
        </div>
        <div className="mb-6 text-center">
          <h1 className="text-3xl">
            <Wordmark />
          </h1>
          <p className="mt-1 text-sm text-pretty text-muted">Kitchen inventory and expiry tracker</p>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-1 rounded-2xl bg-inset p-1">
          <button
            type="button"
            onClick={() => {
              setMode("in");
              setError("");
            }}
            className={"h-11 rounded-xl text-sm font-semibold " + (mode === "in" ? "bg-accent text-on-accent" : "text-muted")}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("up");
              setError("");
            }}
            className={"h-11 rounded-xl text-sm font-semibold " + (mode === "up" ? "bg-accent text-on-accent" : "text-muted")}
          >
            Register
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {mode === "up" && (
            <Field id="auth-name" label="Full name">
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
                <input
                  id="auth-name"
                  className={fieldClass + " pl-10"}
                  autoComplete="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Arham"
                  required
                />
              </div>
            </Field>
          )}
          <Field id="auth-email" label="Email">
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
              <input
                id="auth-email"
                type="email"
                className={fieldClass + " pl-10"}
                autoComplete="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setError("");
                }}
                placeholder="name@household.com"
                required
              />
            </div>
          </Field>
          <Field id="auth-password" label="Password">
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
              <input
                id="auth-password"
                type="password"
                className={fieldClass + " pl-10 font-mono"}
                autoComplete={mode === "up" ? "new-password" : "current-password"}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setError("");
                }}
                onFocus={() => setShy(true)}
                onBlur={() => setShy(false)}
                placeholder="••••••••"
                required
              />
            </div>
          </Field>
          {error && (
            <p className="text-sm text-danger" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={pending || googlePending}
            className="h-12 w-full rounded-xl bg-accent text-base font-semibold text-on-accent disabled:opacity-60"
          >
            {pending ? "Please wait" : mode === "up" ? "Create account" : "Sign in"}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => {
              onForgotPassword();
              setMode("in");
            }}
            className="text-sm font-medium text-accent hover:underline"
          >
            Forgot password?
          </button>
        </div>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-line"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-surface px-2 text-muted">Or continue with</span>
            </div>
          </div>

          <button
            type="button"
            disabled={pending || googlePending}
            onClick={handleGoogleSignIn}
            className="mt-3 flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-line bg-surface text-sm font-semibold text-ink transition-colors hover:bg-inset disabled:cursor-not-allowed disabled:opacity-60"
          >
            <svg viewBox="0 0 24 24" className="size-5 shrink-0" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            <span>{googlePending ? "Connecting to Google..." : "Sign in with Google"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function Header({
  name,
  now,
  items,
  theme,
  onTheme,
  onLogout,
}: {
  name: string;
  now: number;
  items: Item[];
  theme: Theme;
  onTheme: () => void;
  onLogout: () => void;
}) {
  const lines = useMemo(() => {
    const attention = items.filter((item) => {
      const shelf = shelfLife(item.mfd, item.exp, now);
      return shelf.stage === "Expired" || shelf.stage === "Critical" || shelf.stage === "Urgent";
    }).length;
    return [
      attention > 0 ? `${attention} ${attention === 1 ? "item needs" : "items need"} attention.` : "Kitchen stock looks settled.",
      "Expiry dates, without the guesswork.",
      "Keep waste at zero today.",
      "Ready when the next item comes in.",
      "Zero-waste starts in this kitchen.",
    ];
  }, [items, now]);
  const [line, setLine] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setLine((index) => (index + 1) % lines.length), 5000);
    return () => window.clearInterval(timer);
  }, [lines.length]);

  const greeting = greetingFor(new Date(now));

  return (
    <header className="no-print sticky top-0 z-20 border-b border-line bg-canvas/80 backdrop-blur-md px-4 py-4">
      <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl leading-none">
            <Wordmark />
          </h1>
          <p className="mt-1 truncate text-sm font-medium text-accent">
            {greeting}, {name}
          </p>
          <p key={`${line}-${lines[line]}`} className="fade-line truncate text-xs text-muted">
            {lines[line]}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={onTheme}
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            className="grid size-11 place-items-center rounded-2xl border border-line bg-inset text-ink"
          >
            {theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
          </button>
          <button
            type="button"
            onClick={onLogout}
            aria-label="Log out"
            className="grid size-11 place-items-center rounded-2xl border border-line bg-inset text-danger"
          >
            <LogOut className="size-5" />
          </button>
        </div>
      </div>
    </header>
  );
}

function StockTab({
  now,
  items,
  history,
  setItems,
  setHistory,
  onScan,
}: {
  now: number;
  items: Item[];
  history: HistoryEntry[];
  setItems: (items: Item[]) => void;
  setHistory: (history: HistoryEntry[]) => void;
  onScan: () => void;
}) {
  const [query, setQuery] = useState("");
  const [likedIds, setLikedIds] = useState<Record<string, boolean>>({});

  const visible = items
    .filter((item) => item.name.toLowerCase().includes(query.trim().toLowerCase()))
    .map((item) => ({ item, shelf: shelfLife(item.mfd, item.exp, now) }))
    .sort((a, b) => stageRank(a.shelf.stage) - stageRank(b.shelf.stage) || a.shelf.pct - b.shelf.pct);

  const matchingRecipes = useMemo(() => {
    if (items.length === 0) return [];
    const pantryText = items.map((item) => item.name.toLowerCase()).join(" ");
    return RECIPE_CATALOG.map((recipe) => {
      const matched = recipe.ingredients.filter((ing) => pantryText.includes(ing));
      return { recipe, matched };
    })
      .filter((entry) => entry.matched.length > 0)
      .sort((a, b) => b.matched.length - a.matched.length)
      .slice(0, 3);
  }, [items]);

  function toggleLike(id: string) {
    setLikedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function closeItem(id: string, status: "USED" | "WASTED") {
    const item = items.find((entry) => entry.id === id);
    if (!item) return;
    setItems(items.filter((entry) => entry.id !== id));
    setHistory([{ ...item, status, timestamp: formatStamp() }, ...history]);
  }

  return (
    <section className="fade-in space-y-4">
      <div className="flex items-end justify-between gap-3">
        <h2 className="font-display text-2xl font-semibold">Kitchen stock</h2>
        <p className="font-mono text-xs text-muted">{items.length} items</p>
      </div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search the pantry"
          aria-label="Search the pantry"
          className={fieldClass + " pl-10"}
        />
      </div>
      {visible.length === 0 ? (
        <Empty
          icon={Package}
          title={items.length === 0 ? "The pantry is empty" : "Nothing matches"}
          body={items.length === 0 ? "Scan a package or add something by hand." : "Try a shorter name."}
          action={items.length === 0 ? { label: "Open scanner", onClick: onScan } : undefined}
        />
      ) : (
        <ul className="space-y-3">
          {visible.map(({ item, shelf }) => {
            const isLiked = Boolean(likedIds[item.id]);
            const pctWidth = `${shelf.stage === "Expired" ? 100 : Math.max(4, shelf.pct)}%`;
            const barColor = barColorForStage(shelf.stage);

            return (
              <li key={item.id} className="stock-card rounded-3xl p-4" data-stage={shelf.stage}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-display text-lg font-semibold">{item.name}</h3>
                    <p className="mt-1 text-xs text-muted">
                      {item.category}
                      <span className="px-1.5">·</span>
                      <span className="font-mono">×{item.quantity}</span>
                      <span className="px-1.5">·</span>
                      {daysLabel(shelf.days, shelf.stage)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="stage-badge rounded-full px-2.5 py-1 font-mono text-xs tabular-nums" data-stage={shelf.stage}>
                      {shelf.stage} {shelf.pct}%
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleLike(item.id)}
                      aria-pressed={isLiked}
                      aria-label={isLiked ? `Hide storage tips for ${item.name}` : `Show storage tips for ${item.name}`}
                      style={isLiked ? { color: "#f59e0b" } : undefined}
                      className={
                        "grid size-9 place-items-center rounded-xl border transition-colors " +
                        (isLiked
                          ? "border-[#f59e0b]/60 bg-[#f59e0b]/20"
                          : "border-line bg-inset text-muted hover:text-ink")
                      }
                    >
                      <Info className="size-4" strokeWidth={2.2} aria-hidden="true" />
                    </button>
                  </div>
                </div>
                <div className="track mt-3 h-2 w-full overflow-hidden rounded-full bg-inset" aria-hidden="true">
                  <div
                    className="track-fill h-full rounded-full transition-all duration-300"
                    data-stage={shelf.stage}
                    style={{ width: pctWidth, backgroundColor: barColor }}
                  />
                </div>
                {isLiked && (
                  <div className="mt-3 rounded-2xl border border-[#f59e0b]/30 bg-[#f59e0b]/10 px-3.5 py-2.5 text-xs leading-relaxed text-ink">
                    <p className="font-semibold uppercase tracking-wide text-[#f59e0b]">Storage tip</p>
                    <p className="mt-1 text-surface-muted">{storageTipForItem(item)}</p>
                  </div>
                )}
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-inset px-3 py-2">
                    <p className="text-xs text-muted">Made</p>
                    <p className="font-mono text-sm tabular-nums">{item.mfd}</p>
                  </div>
                  <div className="rounded-xl bg-inset px-3 py-2">
                    <p className="text-xs text-muted">Expiry</p>
                    <p className="font-mono text-sm tabular-nums">{item.exp}</p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => closeItem(item.id, "USED")}
                    className="flex h-11 items-center justify-center gap-2 rounded-xl border border-line text-sm font-semibold text-accent"
                  >
                    <Check className="size-4" aria-hidden="true" />
                    Consumed
                  </button>
                  <button
                    type="button"
                    onClick={() => closeItem(item.id, "WASTED")}
                    className="flex h-11 items-center justify-center gap-2 rounded-xl border border-line text-sm font-semibold text-danger"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                    Wasted
                  </button>
                </div>
                {(shelf.stage === "Critical" || shelf.stage === "Expired") && (
                  <p className="alert-critical mt-3 flex items-start gap-2 rounded-xl px-3 py-2 text-sm">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    {shelf.stage === "Expired" ? "This item is past its date." : "Use or discard this soon."}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {matchingRecipes.length > 0 && (
        <div className="pt-2 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 font-display text-xl font-semibold">
              <ChefHat className="size-5 text-accent" aria-hidden="true" />
              Recipes from pantry
            </h3>
            <span className="font-mono text-xs text-muted">{matchingRecipes.length} ideas</span>
          </div>
          <ul className="space-y-3">
            {matchingRecipes.map(({ recipe, matched }) => (
              <li key={recipe.id} className="rounded-3xl border border-line bg-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <h4 className="font-display text-base font-semibold">{recipe.title}</h4>
                  <span className="shrink-0 rounded-full bg-inset px-2.5 py-1 font-mono text-xs text-muted">
                    {recipe.time}
                  </span>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-surface-muted">{recipe.steps}</p>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-medium text-accent">
                    Uses: {matched.join(", ")}
                  </p>
                  <a
                    href={recipe.youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-inset px-3 py-1.5 text-xs font-semibold text-ink hover:border-accent"
                  >
                    Watch on YouTube
                    <ExternalLink className="size-3.5 text-accent" aria-hidden="true" />
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function ScanTab({
  items,
  setItems,
  onSaved,
}: {
  items: Item[];
  setItems: (items: Item[]) => void;
  onSaved: () => void;
}) {
  const modelRef = useRef<VisionNet | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const finalTranscriptRef = useRef("");
  const transcriptRef = useRef("");
  const nativeCleanupRef = useRef<(() => void) | null>(null);

  const [vision, setVision] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [blocked, setBlocked] = useState("");
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [preview, setPreview] = useState("");
  const [formError, setFormError] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [detectedFoods, setDetectedFoods] = useState<DetectedVoiceFood[]>([]);
  const [voiceFallbackOpen, setVoiceFallbackOpen] = useState(false);
  const [nativeAvailable, setNativeAvailable] = useState(false);

  function renderHighlightedTranscript(text: string) {
    if (!text.trim()) return "Speak food items and expiry info aloud, e.g. 'apples expire in 3 days' or 'milk expires December 5'...";
    const keywords = FOOD_CATALOG.map((entry) => entry.keyword);
    const pattern = new RegExp(`(\\b(?:${keywords.join("|")})(?:es|s)?\\b)`, "gi");
    const parts = text.split(pattern);

    return parts.map((part, index) => {
      const isFood = pattern.test(part);
      pattern.lastIndex = 0;
      if (isFood) {
        return (
          <mark
            key={`${part}-${index}`}
            className="rounded bg-danger/20 px-1 py-0.5 font-semibold text-danger underline decoration-danger"
          >
            {part}
          </mark>
        );
      }
      return <span key={`${part}-${index}`}>{part}</span>;
    });
  }

  function addVoiceItems(foods: DetectedVoiceFood[]) {
    if (foods.length === 0) return;
    const mfdToday = isoOffset(0);
    const next: Item[] = foods.map((entry) => ({
      id: uid(),
      name: entry.name,
      category: entry.category,
      mfd: mfdToday,
      exp: entry.expDate,
      quantity: 1,
    }));
    setItems([...next, ...items]);
    setStatus(`Added ${next.length} ${next.length === 1 ? "item" : "items"} with expiry dates from voice.`);
    setBlocked("");
    setDetectedFoods([]);
    setTranscript("");
    setVoiceFallbackOpen(false);
    finalTranscriptRef.current = "";
    transcriptRef.current = "";
    onSaved();
  }

  function stopVoiceSession() {
    setIsListening(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore if already stopped
      }
      recognitionRef.current = null;
    }
    const latestText = transcriptRef.current || finalTranscriptRef.current || transcript;
    setDetectedFoods(parseVoiceFoods(latestText));
    setStatus("Voice capture stopped. Review predicted or spoken expiry dates below.");
  }

  function toggleVoiceInput() {
    if (isListening) {
      stopVoiceSession();
      return;
    }

    const SpeechRecognitionCtor =
      typeof window !== "undefined"
        ? ((window as unknown as { SpeechRecognition?: new () => SpeechRecognitionInstance; webkitSpeechRecognition?: new () => SpeechRecognitionInstance })
            .SpeechRecognition ||
          (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionInstance; webkitSpeechRecognition?: new () => SpeechRecognitionInstance })
            .webkitSpeechRecognition)
        : undefined;

    setBlocked("");
    setFormError("");
    setVoiceFallbackOpen(false);
    setDetectedFoods([]);
    setTranscript("");
    finalTranscriptRef.current = "";
    transcriptRef.current = "";
    setIsListening(true);
    setStatus("Listening live... food words are highlighted in red.");

    if (!SpeechRecognitionCtor) {
      setStatus("Speech recognition is not supported in this browser. Type items below instead.");
      setIsListening(false);
      setVoiceFallbackOpen(true);
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let interim = "";
      let finalChunk = finalTranscriptRef.current;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const piece = event.results[i][0]?.transcript ?? "";
        if (event.results[i].isFinal) {
          finalChunk = `${finalChunk} ${piece}`.trim();
        } else {
          interim = `${interim} ${piece}`.trim();
        }
      }

      finalTranscriptRef.current = finalChunk;
      const combined = `${finalChunk} ${interim}`.trim();
      transcriptRef.current = combined;
      setTranscript(combined);
      setDetectedFoods(parseVoiceFoods(combined));
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      recognitionRef.current = null;
      if (event.error !== "aborted") {
        setStatus(`Voice error: ${event.error}. Use the text fallback below if speech server is blocked.`);
        if (event.error === "network" || event.error === "service-not-allowed") {
          setVoiceFallbackOpen(true);
        }
      }
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      setIsListening(false);
      const latestText = transcriptRef.current || finalTranscriptRef.current;
      setDetectedFoods(parseVoiceFoods(latestText));
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      setIsListening(false);
      recognitionRef.current = null;
      setStatus("Unable to start microphone. Type items below instead.");
      setVoiceFallbackOpen(true);
    }
  }

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // Ignore cleanup error
        }
      }
    };
  }, []);

  useEffect(() => {
    const existing = peekVision();
    if (existing) {
      modelRef.current = existing;
      setVision("ready");
      return;
    }
    let active = true;
    setVision("loading");
    loadVision()
      .then((net) => {
        modelRef.current = net;
        if (active) setVision("ready");
      })
      .catch(() => {
        if (active) setVision("error");
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setBlocked("");
    setFormError("");
    setStatus("Reading the photo…");
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
    try {
      const image = await loadImage(file);
      const canvas = draw224(image);
      const code = await readBarcode(image);
      if (code) {
        setStatus("Checking Open Food Facts…");
        const product = await lookupOpenFoodFacts(code);
        if (product === "blocked") {
          setBlocked("That barcode is not a food product.");
          setStatus("");
          setDraft(EMPTY_DRAFT);
          return;
        }
        if (product) {
          setDraft({
            name: product.name,
            category: product.category,
            mfd: product.mfd,
            exp: product.exp,
            quantity: "1",
          });
          setStatus(product.detail);
          return;
        }
        setDraft({
          name: `Barcode ${code}`,
          category: "Pantry",
          mfd: isoOffset(0),
          exp: isoOffset(shelfDays("Pantry")),
          quantity: "1",
        });
        setStatus(`Barcode ${code} was not in Open Food Facts. Edit the name before saving.`);
        return;
      }

      if (!modelRef.current) {
        setStatus(vision === "error" ? "Vision model unavailable. Enter the item manually." : "Vision model is still loading. Enter it manually or try again.");
        return;
      }
      setStatus("Classifying with Ai Scanner…");
      const result = await classifyCanvas(modelRef.current, canvas);
      if (result === "blocked") {
        setBlocked("Non-food item detected. Laptops, screens, and furniture stay out of the pantry.");
        setStatus("");
        setDraft(EMPTY_DRAFT);
        return;
      }
      setDraft({
        name: result.name,
        category: result.category,
        mfd: result.mfd,
        exp: result.exp,
        quantity: "1",
      });
      setStatus(result.detail);
    } catch {
      setStatus("Could not read that photo. Try another, or add the item by hand.");
    } finally {
      setBusy(false);
    }
  }

  function save(event: FormEvent) {
    event.preventDefault();
    if (!draft.name.trim() || !draft.mfd || !draft.exp) {
      setFormError("Name, manufacture date, and expiry are required.");
      return;
    }
    if (draft.exp < draft.mfd) {
      setFormError("Expiry has to be after the manufacture date.");
      return;
    }
    const quantity = Math.max(1, Math.round(Number(draft.quantity) || 1));
    const next: Item = {
      id: uid(),
      name: draft.name.trim(),
      category: draft.category,
      mfd: draft.mfd,
      exp: draft.exp,
      quantity,
    };
    setItems([next, ...items]);
    setDraft(EMPTY_DRAFT);
    setStatus("");
    setBlocked("");
    onSaved();
  }

  const visionLabel =
    vision === "ready" ? "Ai Scanner ready" : vision === "error" ? "Vision model unavailable" : "Preparing Ai Scanner";

  return (
    <section className="fade-in space-y-4">
      <h2 className="font-display text-2xl font-semibold">Smart scanner</h2>
      <div className="rounded-3xl border border-line bg-surface p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="grid size-12 place-items-center rounded-2xl bg-inset text-accent">
            {vision === "ready" ? <ScanLine className="size-6" /> : <RefreshCw className={"size-6 " + (vision === "loading" ? "animate-spin" : "")} />}
          </div>
          <div>
            <p className="font-medium">{visionLabel}</p>
          </div>
        </div>
        {vision === "error" && (
          <button
            type="button"
            onClick={() => setAttempt((value) => value + 1)}
            className="mb-4 h-11 rounded-xl border border-line px-4 text-sm font-semibold"
          >
            Retry vision model
          </button>
        )}
        <div className="grid grid-cols-3 gap-2">
          <FileButton icon={Camera} label={busy ? "Reading" : "Camera"} capture disabled={busy} onFile={onFile} />
          <FileButton icon={ImagePlus} label={busy ? "Reading" : "Upload"} disabled={busy} onFile={onFile} />
          <button
            type="button"
            onClick={toggleVoiceInput}
            disabled={busy}
            className={"flex h-12 items-center justify-center gap-2 rounded-xl text-sm font-semibold " + (
              isListening
                ? "bg-danger text-white animate-pulse"
                : busy
                ? "bg-inset text-muted"
                : "bg-accent text-on-accent"
            )}
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.87 3.13 7 7 7s7-3.13 7-7h-2z" />
            </svg>
            {isListening ? "Stop" : "Voice"}
          </button>
        </div>

        {isListening && (
          <div className="mt-4 rounded-2xl border border-danger bg-danger/10 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-end gap-1 h-5" aria-hidden="true">
                  <span className="w-1.5 h-3 rounded-full bg-danger animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-5 rounded-full bg-danger animate-bounce" style={{ animationDelay: "120ms" }} />
                  <span className="w-1.5 h-2 rounded-full bg-danger animate-bounce" style={{ animationDelay: "240ms" }} />
                  <span className="w-1.5 h-4 rounded-full bg-danger animate-bounce" style={{ animationDelay: "360ms" }} />
                </div>
                <span className="text-sm font-semibold text-danger">Live speech-to-text</span>
              </div>
              <span className="font-mono text-xs text-danger">{detectedFoods.length} food</span>
            </div>
            <p className="mt-3 rounded-xl bg-inset p-3 text-sm leading-relaxed text-ink min-h-12">
              {renderHighlightedTranscript(transcript)}
            </p>
          </div>
        )}

        {!isListening && voiceFallbackOpen && (
          <div className="mt-4 rounded-2xl border border-line bg-inset p-4 space-y-2.5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              Quick food & expiry phrase parser
            </p>
            <input
              type="text"
              value={transcript}
              onChange={(event) => {
                const val = event.target.value;
                setTranscript(val);
                transcriptRef.current = val;
                setDetectedFoods(parseVoiceFoods(val));
              }}
              placeholder="e.g. banana and orange expire in 56 days"
              className={fieldClass}
            />
            {transcript && (
              <p className="text-sm leading-relaxed text-ink">
                {renderHighlightedTranscript(transcript)}
              </p>
            )}
          </div>
        )}

        {!isListening && detectedFoods.length > 0 && (
          <div className="mt-4 rounded-2xl border border-accent bg-accent/10 p-4">
            <p className="text-sm font-semibold text-accent mb-2">
              Stopped — {detectedFoods.length} food {detectedFoods.length === 1 ? "item" : "items"} detected:
            </p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {detectedFoods.map((food) => (
                <span key={food.name} className="text-xs px-2.5 py-1 rounded-full bg-danger/20 text-danger font-semibold">
                  {food.name} · {food.explicitDate ? "Spoken" : "Predicted"} {food.daysUntilExpiry}d ({food.expDate})
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => addVoiceItems(detectedFoods)}
                className="flex-1 h-11 rounded-xl bg-accent text-sm font-semibold text-on-accent"
              >
                Add all ({detectedFoods.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setDetectedFoods([]);
                  setTranscript("");
                  setVoiceFallbackOpen(false);
                  finalTranscriptRef.current = "";
                  transcriptRef.current = "";
                }}
                className="h-11 rounded-xl border border-line bg-surface px-4 text-sm font-semibold"
              >
                Discard
              </button>
            </div>
          </div>
        )}

        {preview && (
          <img src={preview} alt="Selected item" className="mt-4 h-36 w-full rounded-2xl object-cover" />
        )}
        <p className="mt-4 min-h-5 text-sm text-surface-muted" aria-live="polite">
          {status}
        </p>
        {blocked && (
          <p className="alert-critical mt-2 flex items-start gap-2 rounded-xl px-3 py-2 text-sm" role="alert">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {blocked}
          </p>
        )}
      </div>

      {!blocked && (
        <form onSubmit={save} className="rounded-3xl border border-line bg-surface p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-2xl bg-inset text-accent">
              <Plus className="size-6" />
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold">{draft.name ? "Confirm item" : "Manual entry"}</h3>
              <p className="text-sm text-surface-muted">Barcode lookup, vision, or a typed row. You confirm before it is saved.</p>
            </div>
          </div>
          <div className="space-y-4">
            <Field id="item-name" label="Item name">
              <input
                id="item-name"
                className={fieldClass}
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                placeholder="Fresh spinach"
                required
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field id="item-category" label="Category">
                <select
                  id="item-category"
                  className={fieldClass}
                  value={draft.category}
                  onChange={(event) => setDraft({ ...draft, category: event.target.value as Category })}
                >
                  {CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </Field>
              <Field id="item-qty" label="Quantity">
                <input
                  id="item-qty"
                  type="number"
                  min={1}
                  className={fieldClass + " font-mono"}
                  value={draft.quantity}
                  onChange={(event) => setDraft({ ...draft, quantity: event.target.value })}
                  required
                />
              </Field>
            </div>
            <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
              <Field id="item-mfd" label="Manufacture">
                <input
                  id="item-mfd"
                  type="date"
                  className={fieldClass + " font-mono"}
                  value={draft.mfd}
                  onChange={(event) => setDraft({ ...draft, mfd: event.target.value })}
                  required
                />
              </Field>
              <Field id="item-exp" label="Expiry">
                <input
                  id="item-exp"
                  type="date"
                  min={draft.mfd || undefined}
                  className={fieldClass + " font-mono"}
                  value={draft.exp}
                  onChange={(event) => setDraft({ ...draft, exp: event.target.value })}
                  required
                />
              </Field>
            </div>
            {formError && (
              <p className="text-sm text-danger" role="alert">
                {formError}
              </p>
            )}
            <button type="submit" className="h-12 w-full rounded-xl bg-accent text-base font-semibold text-on-accent">
              Save to stock
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

function FileButton({
  icon: Icon,
  label,
  capture,
  disabled,
  onFile,
}: {
  icon: typeof Camera;
  label: string;
  capture?: boolean;
  disabled?: boolean;
  onFile: (file: File | undefined) => void;
}) {
  return (
    <label className={"flex h-12 items-center justify-center gap-2 rounded-xl text-sm font-semibold " + (disabled ? "bg-inset text-muted" : "bg-accent text-on-accent")}>
      <Icon className="size-4" aria-hidden="true" />
      {label}
      <input
        type="file"
        accept="image/*"
        capture={capture ? "environment" : undefined}
        disabled={disabled}
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          onFile(file);
        }}
      />
    </label>
  );
}

function ShoppingTab({ history }: { history: HistoryEntry[] }) {
  const rows = useMemo(() => {
    const map = new Map<string, { name: string; category: Category; count: number; last: string }>();
    for (const entry of history) {
      if (entry.status !== "USED") continue;
      const key = entry.name.trim().toLowerCase();
      const existing = map.get(key);
      if (!existing) {
        map.set(key, { name: entry.name, category: entry.category, count: entry.quantity || 1, last: entry.timestamp });
      } else {
        existing.count += entry.quantity || 1;
      }
    }
    return [...map.values()];
  }, [history]);

  return (
    <section className="fade-in space-y-4">
      <div className="no-print flex items-end justify-between gap-3">
        <h2 className="font-display text-2xl font-semibold">Shopping list</h2>
        <button
          type="button"
          onClick={() => window.print()}
          className="flex h-11 items-center gap-2 rounded-xl border border-line bg-surface px-3 text-sm font-semibold"
        >
          <FileDown className="size-4" aria-hidden="true" />
          Export PDF
        </button>
      </div>
      <div className="rounded-3xl border border-line bg-surface p-5 print-sheet">
        <p className="font-display text-lg font-semibold">Restock</p>
        <p className="text-sm text-muted">Built only from items you marked consumed.</p>
        {rows.length === 0 ? (
          <Empty icon={ShoppingBag} title="Nothing to restock" body="Mark an item as consumed and it will land here." />
        ) : (
          <ul className="mt-4 divide-y divide-line">
            {rows.map((row) => (
              <li key={row.name} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{row.name}</p>
                  <p className="text-xs text-muted">
                    {row.category}
                    <span className="px-1.5">·</span>
                    <span className="font-mono">{row.last}</span>
                  </p>
                </div>
                <span className="font-mono text-sm tabular-nums">×{row.count}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function AnalyticsTab({ history }: { history: HistoryEntry[] }) {
  const consumed = history.filter((entry) => entry.status === "USED");
  const wasted = history.filter((entry) => entry.status === "WASTED");
  const total = consumed.length + wasted.length;
  const wasteRate = total === 0 ? 0 : Math.round((wasted.length / total) * 100);

  const slices = CATEGORIES.map((category) => ({
    category,
    count: wasted.filter((entry) => entry.category === category).length,
  })).filter((slice) => slice.count > 0);
  const circumference = 2 * Math.PI * 68;

  let offset = 0;
  const arcs = slices.map((slice) => {
    const len = total === 0 ? 0 : (slice.count / wasted.length) * circumference;
    const arc = { ...slice, len, offset };
    offset += len;
    return arc;
  });

  const weeklyWasted = CATEGORIES.map((category) => ({
    category,
    count: wasted.filter((entry) => entry.category === category).length,
  }));

  return (
    <section className="fade-in space-y-4">
      <h2 className="font-display text-2xl font-semibold">Kitchen analytics</h2>

      <div className="grid grid-cols-2 gap-3">
        <article className="rounded-3xl border border-line bg-surface p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Consumed</p>
          <p className="mt-2 font-display text-5xl font-semibold tabular-nums text-accent">{consumed.length}</p>
        </article>
        <article className="rounded-3xl border border-line bg-surface p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Waste rate</p>
          <p className="mt-2 font-display text-5xl font-semibold tabular-nums text-danger">{wasteRate}%</p>
        </article>
      </div>

      <article className="rounded-3xl border border-line bg-surface p-5">
        <div className="flex flex-col items-center gap-6">
          <div className="relative size-52">
            <svg viewBox="0 0 160 160" className="size-full" role="img" aria-label="Waste distribution">
              <circle cx="80" cy="80" r="68" fill="none" stroke="var(--inset)" strokeWidth="14" />
              <g className="donut-spin">
                {arcs.length === 0 ? (
                  <circle cx="80" cy="80" r="68" fill="none" stroke="var(--accent)" strokeWidth="14" strokeDasharray="0 427" />
                ) : arcs.length === 1 ? (
                  <circle
                    cx="80"
                    cy="80"
                    r="68"
                    fill="none"
                    stroke={`var(--cat-${catVar(arcs[0].category)})`}
                    strokeWidth="14"
                  />
                ) : (
                  arcs.map((arc) => (
                    <circle
                      key={arc.category}
                      cx="80"
                      cy="80"
                      r="68"
                      fill="none"
                      stroke={`var(--cat-${catVar(arc.category)})`}
                      strokeWidth="14"
                      strokeDasharray={`${arc.len} ${circumference - arc.len}`}
                      strokeDashoffset={-arc.offset}
                    />
                  ))
                )}
              </g>
            </svg>
            <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
              <div>
                <p className="font-display text-4xl font-semibold tabular-nums leading-none">{wasted.length}</p>
                <p className="mt-1 text-xs uppercase tracking-wide text-muted">Wasted</p>
              </div>
            </div>
          </div>

          <ul className="grid w-full grid-cols-6 gap-x-2 gap-y-4">
            {weeklyWasted.map((entry) => {
              const count = entry.count;
              const height = wasted.length === 0 ? 0 : Math.round((count / wasted.length) * 100);
              return (
                <li key={entry.category} className="flex flex-col items-center gap-2">
                  <div className="flex h-24 w-full items-end rounded-t-md">
                    <div
                      className="climb-bar w-full rounded-t-md"
                      data-cat={entry.category}
                      style={{ height: `${count === 0 ? 0 : Math.max(8, height)}%` }}
                    />
                  </div>
                  <span className="flex items-center gap-1 text-xs text-muted">
                    <span className="swatch size-2 rounded-full" data-cat={entry.category} />
                    {SHORT[entry.category]} <span className="font-mono">{count}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </article>

      <article className="rounded-3xl border border-line bg-surface p-5">
        <h3 className="font-display text-lg font-semibold">Recent discards</h3>
        {wasted.length === 0 ? (
          <p className="mt-4 text-sm text-muted">No items have been wasted yet.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {wasted.slice(0, 10).map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-3 rounded-2xl bg-inset px-3 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{entry.name}</p>
                  <p className="font-mono text-xs text-muted">{entry.timestamp}</p>
                </div>
                <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-danger">{entry.category}</span>
              </li>
            ))}
            {wasted.length > 10 && (
              <p className="mt-2 text-xs text-muted text-center">+{wasted.length - 10} more</p>
            )}
          </ul>
        )}
      </article>
    </section>
  );
}

function catVar(category: Category): string {
  if (category === "Meat/Seafood") return "meat";
  return category.toLowerCase();
}

function Empty({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: typeof Package;
  title: string;
  body: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="rounded-3xl border border-dashed border-line bg-surface px-6 py-12 text-center">
      <Icon className="mx-auto size-8 text-muted" aria-hidden="true" />
      <h3 className="mt-3 font-display text-lg font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-pretty text-muted">{body}</p>
      {action && (
        <button type="button" onClick={action.onClick} className="mt-5 h-11 rounded-xl bg-accent px-4 text-sm font-semibold text-on-accent">
          {action.label}
        </button>
      )}
    </div>
  );
}
