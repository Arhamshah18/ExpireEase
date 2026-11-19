export const CATEGORIES = [
  "Produce",
  "Dairy",
  "Bakery",
  "Beverages",
  "Pantry",
  "Meat/Seafood",
] as const;

export type Category = (typeof CATEGORIES)[number];

export type Stage =
  | "Safe"
  | "Fresh"
  | "Moderate"
  | "Urgent"
  | "Critical"
  | "Expired"
  | "Invalid";

export type Item = {
  id: string;
  name: string;
  category: Category;
  mfd: string;
  exp: string;
  quantity: number;
};

export type HistoryEntry = Item & {
  status: "USED" | "WASTED";
  timestamp: string;
};

export type PantryData = {
  items: Item[];
  history: HistoryEntry[];
};

export type Account = {
  name: string;
  email: string;
  salt: string;
  passwordHash: string;
};

export type Session = {
  name: string;
  email: string;
};

export type Shelf = {
  pct: number;
  stage: Stage;
  days: number | null;
};

const ACCOUNTS_KEY = "expireease.v1.accounts";
const SESSION_KEY = "expireease.v1.session";
const THEME_KEY = "expireease.v1.theme";

const STAGE_RANK: Record<Stage, number> = {
  Expired: 0,
  Critical: 1,
  Urgent: 2,
  Moderate: 3,
  Fresh: 4,
  Safe: 5,
  Invalid: 6,
};

const SHELF_DAYS: Record<Category, number> = {
  Produce: 5,
  Dairy: 7,
  Bakery: 4,
  Beverages: 21,
  Pantry: 120,
  "Meat/Seafood": 3,
};

const CATEGORY_RULES: [string, Category][] = [
  ["milk", "Dairy"],
  ["yogurt", "Dairy"],
  ["yoghurt", "Dairy"],
  ["cheese", "Dairy"],
  ["butter", "Dairy"],
  ["cream", "Dairy"],
  ["paneer", "Dairy"],
  ["curd", "Dairy"],
  ["ghee", "Dairy"],
  ["egg", "Dairy"],
  ["bread", "Bakery"],
  ["bagel", "Bakery"],
  ["loaf", "Bakery"],
  ["cake", "Bakery"],
  ["pastry", "Bakery"],
  ["cookie", "Bakery"],
  ["muffin", "Bakery"],
  ["croissant", "Bakery"],
  ["donut", "Bakery"],
  ["doughnut", "Bakery"],
  ["juice", "Beverages"],
  ["soda", "Beverages"],
  ["coffee", "Beverages"],
  ["tea", "Beverages"],
  ["wine", "Beverages"],
  ["beer", "Beverages"],
  ["water", "Beverages"],
  ["lassi", "Beverages"],
  ["cola", "Beverages"],
  ["meat", "Meat/Seafood"],
  ["beef", "Meat/Seafood"],
  ["steak", "Meat/Seafood"],
  ["chicken", "Meat/Seafood"],
  ["pork", "Meat/Seafood"],
  ["fish", "Meat/Seafood"],
  ["salmon", "Meat/Seafood"],
  ["seafood", "Meat/Seafood"],
  ["shrimp", "Meat/Seafood"],
  ["tuna", "Meat/Seafood"],
  ["prawn", "Meat/Seafood"],
  ["rice", "Pantry"],
  ["pasta", "Pantry"],
  ["noodle", "Pantry"],
  ["cereal", "Pantry"],
  ["flour", "Pantry"],
  ["sauce", "Pantry"],
  ["oil", "Pantry"],
  ["bean", "Pantry"],
  ["spice", "Pantry"],
  ["honey", "Pantry"],
  ["jam", "Pantry"],
  ["dal", "Pantry"],
  ["lentil", "Pantry"],
];

const FOOD_HINTS = [
  "milk", "yogurt", "cheese", "butter", "cream", "paneer", "curd", "ghee",
  "bread", "bagel", "loaf", "cake", "pastry", "cookie", "muffin", "croissant", "donut", "doughnut",
  "juice", "soda", "coffee", "tea", "wine", "beer", "water", "lassi", "cola",
  "apple", "banana", "orange", "lemon", "lime", "strawberry", "grape", "pineapple",
  "broccoli", "carrot", "potato", "tomato", "cucumber", "lettuce", "pepper", "onion",
  "garlic", "mushroom", "corn", "pumpkin", "mango", "peach", "pear", "cherry",
  "watermelon", "berry", "salad", "soup", "pizza", "burger", "sandwich", "hotdog", "hot dog",
  "ice cream", "chocolate", "candy", "pretzel", "waffle", "pancake",
  "taco", "burrito", "sushi", "ham", "bacon", "sausage", "turkey", "lamb", "crumble",
  "lobster", "oyster", "nut", "almond", "peanut", "walnut", "fruit", "vegetable",
  "grocery", "food", "edible", "snack", "chip", "crisp", "popcorn", "cracker",
  "tortilla", "naan", "roti", "pickle", "chutney", "spinach", "cabbage", "avocado",
  "kiwi", "melon", "fig", "salt", "sugar", "vinegar", "sauce", "yogurt", "cheese", "milk", "bread", "cake",
  "rice", "pasta", "noodle", "cereal", "flour", "sauce", "oil", "bean", "spice", "honey", "jam", "dal", "lentil",
  "chicken", "beef", "steak", "pork", "fish", "salmon", "seafood", "shrimp", "tuna", "prawn",
  "produce", "dairy", "bakery", "beverage", "pantry", "seafood", "chicken", "beef",
];

const BLOCKED = [
  "laptop", "notebook", "screen", "monitor", "keyboard", "computer", "desk", "chair",
  "television", "mouse", "handheld", "phone", "cellular", "display", "window",
  "ceiling", "floor", "wall", "heater", "lamp", "table", "remote", "speaker",
  "headphone", "camera", "printer", "router", "sofa", "couch", "bed", "pillow",
  "wardrobe", "bookshelf", "toilet", "sink", "faucet", "refrigerator", "microwave",
  "oven", "stove", "dishwasher", "washer", "dryer",
];

function hasTerm(haystack: string, term: string): boolean {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|[^a-z])${escaped}(?:[^a-z]|$)`).test(haystack);
}

export function inferCategory(text: string): Category {
  const hay = text.toLowerCase();
  for (const [needle, category] of CATEGORY_RULES) {
    if (hasTerm(hay, needle)) return category;
  }
  return "Produce";
}

export function hasFoodHint(text: string): boolean {
  const hay = text.toLowerCase();
  return FOOD_HINTS.some((hint) => hasTerm(hay, hint));
}

/**
 * Extract food item names from a free-form voice transcript.
 *
 * The browser's SpeechRecognition returns a single continuous transcript; this
 * splits it into candidate food names by matching against the known food
 * vocabulary, then deduplicates case-insensitively and drops noise words.
 *
 * Returns an array of `{ name, category }` — never throws; an empty array means
 * "nothing food-like was said".
 */
export function parseVoiceFoods(transcript: string): Array<{ name: string; category: Category }> {
  const hay = transcript.toLowerCase();
  const found = new Map<string, { name: string; category: Category }>();
  for (const hint of FOOD_HINTS) {
    if (!hasTerm(hay, hint)) continue;
    const name = hint.charAt(0).toUpperCase() + hint.slice(1);
    if (found.has(name.toLowerCase())) continue;
    found.set(name.toLowerCase(), { name, category: inferCategory(hint) });
  }
  return [...found.values()];
}

export function isNonFood(text: string): boolean {
  const hay = text.toLowerCase();
  if (hasFoodHint(hay)) return false;
  return BLOCKED.some((word) => hasTerm(hay, word));
}

export function prettyLabel(className: string): string {
  const first = className.split(",")[0]?.trim() || "Item";
  if (first !== first.toLowerCase()) return first;
  return first
    .split(/[\s_]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function shelfDays(category: Category): number {
  return SHELF_DAYS[category];
}

export function isoOffset(days: number, from = new Date()): string {
  const date = new Date(from.getFullYear(), from.getMonth(), from.getDate() + days);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function parseLocalDay(iso: string, end: boolean): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return Number.NaN;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (end) return new Date(year, month - 1, day, 23, 59, 59, 999).getTime();
  return new Date(year, month - 1, day, 0, 0, 0, 0).getTime();
}

export function shelfLife(mfd: string, exp: string, now = Date.now()): Shelf {
  const start = parseLocalDay(mfd, false);
  const end = parseLocalDay(exp, true);
  if (!mfd || !exp || Number.isNaN(start) || Number.isNaN(end) || end <= start) {
    return { pct: 0, stage: "Invalid", days: null };
  }

  const expMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(exp);
  let days: number | null = null;
  if (expMatch) {
    const expDay = new Date(Number(expMatch[1]), Number(expMatch[2]) - 1, Number(expMatch[3]));
    const todayDate = new Date(now);
    const today = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate());
    days = Math.round((expDay.getTime() - today.getTime()) / 86_400_000);
  }

  if (now > end) return { pct: 0, stage: "Expired", days };
  const total = end - start;
  const remaining = end - now;
  const pct = Math.max(0, Math.min(100, Math.round((remaining / total) * 100)));
  if (pct <= 10) return { pct, stage: "Critical", days };
  if (pct <= 25) return { pct, stage: "Urgent", days };
  if (pct <= 50) return { pct, stage: "Moderate", days };
  if (pct <= 75) return { pct, stage: "Fresh", days };
  return { pct, stage: "Safe", days };
}

export function stageRank(stage: Stage): number {
  return STAGE_RANK[stage];
}

export function daysLabel(days: number | null, stage: Stage): string {
  if (stage === "Invalid") return "Check the dates";
  if (stage === "Expired" || (days !== null && days < 0)) return "Expired";
  if (days === 0) return "Expires today";
  if (days === 1) return "1 day left";
  if (days !== null) return `${days} days left`;
  return "";
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || "there";
}

export function greetingFor(date: Date): string {
  const hour = date.getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

export function formatStamp(date = new Date()): string {
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function uid(): string {
  return crypto.randomUUID();
}

export async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function canStore(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function dataKey(email: string): string {
  return `expireease.v1.data.${email}`;
}

function stampOffset(days: number, hour: number, minute: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, minute, 0, 0);
  return formatStamp(date);
}

export function seedPantry(): PantryData {
  const items: Item[] = [
    {
      id: "seed-milk",
      name: "Organic Milk 1L",
      category: "Dairy",
      mfd: isoOffset(-10),
      exp: isoOffset(2),
      quantity: 1,
    },
    {
      id: "seed-yogurt",
      name: "Greek Yogurt",
      category: "Dairy",
      mfd: isoOffset(-20),
      exp: isoOffset(0),
      quantity: 2,
    },
    {
      id: "seed-bread",
      name: "Whole Grain Bread",
      category: "Bakery",
      mfd: isoOffset(-4),
      exp: isoOffset(-1),
      quantity: 1,
    },
    {
      id: "seed-spinach",
      name: "Baby Spinach",
      category: "Produce",
      mfd: isoOffset(-2),
      exp: isoOffset(4),
      quantity: 1,
    },
    {
      id: "seed-juice",
      name: "Orange Juice",
      category: "Beverages",
      mfd: isoOffset(-10),
      exp: isoOffset(8),
      quantity: 1,
    },
    {
      id: "seed-rice",
      name: "Basmati Rice 1kg",
      category: "Pantry",
      mfd: isoOffset(-30),
      exp: isoOffset(200),
      quantity: 1,
    },
  ];

  const history: HistoryEntry[] = [
    {
      id: "hist-paneer",
      name: "Paneer 200g",
      category: "Dairy",
      mfd: isoOffset(-12),
      exp: isoOffset(-1),
      quantity: 1,
      status: "USED",
      timestamp: stampOffset(-2, 9, 30),
    },
    {
      id: "hist-brew",
      name: "Cold Brew",
      category: "Beverages",
      mfd: isoOffset(-7),
      exp: isoOffset(-1),
      quantity: 1,
      status: "USED",
      timestamp: stampOffset(-1, 18, 10),
    },
    {
      id: "hist-banana",
      name: "Bananas",
      category: "Produce",
      mfd: isoOffset(-8),
      exp: isoOffset(-2),
      quantity: 1,
      status: "WASTED",
      timestamp: stampOffset(-1, 21, 5),
    },
    {
      id: "hist-loaf",
      name: "Sandwich Bread",
      category: "Bakery",
      mfd: isoOffset(-9),
      exp: isoOffset(-3),
      quantity: 1,
      status: "WASTED",
      timestamp: stampOffset(-3, 16, 40),
    },
    {
      id: "hist-cheddar",
      name: "Cheddar Block",
      category: "Dairy",
      mfd: isoOffset(-21),
      exp: isoOffset(-4),
      quantity: 1,
      status: "WASTED",
      timestamp: stampOffset(-4, 11, 15),
    },
  ];

  return { items, history };
}

function emptyPantry(): PantryData {
  return { items: [], history: [] };
}

export function readTheme(): "light" | "dark" {
  if (!canStore()) return "dark";
  return localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark";
}

export function writeTheme(theme: "light" | "dark"): void {
  if (!canStore()) return;
  localStorage.setItem(THEME_KEY, theme);
}

function readAccounts(): Account[] {
  if (!canStore()) return [];
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Account[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAccounts(accounts: Account[]): void {
  if (!canStore()) return;
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

export async function registerAccount(
  name: string,
  email: string,
  password: string,
): Promise<{ ok: true; session: Session } | { ok: false; error: string }> {
  const cleanName = name.trim();
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanName) return { ok: false, error: "Add your name to continue." };
  if (!cleanEmail || !password) return { ok: false, error: "Email and password are required." };
  const accounts = readAccounts();
  if (accounts.some((account) => account.email === cleanEmail)) {
    return { ok: false, error: "That email is already registered. Sign in instead." };
  }
  const salt = uid();
  const passwordHash = await sha256(`${salt}:${password}`);
  accounts.push({ name: cleanName, email: cleanEmail, salt, passwordHash });
  writeAccounts(accounts);
  writeSession({ name: cleanName, email: cleanEmail });
  return { ok: true, session: { name: cleanName, email: cleanEmail } };
}

export async function signInAccount(
  email: string,
  password: string,
): Promise<{ ok: true; session: Session } | { ok: false; error: string }> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !password) return { ok: false, error: "Email and password are required." };
  const account = readAccounts().find((entry) => entry.email === cleanEmail);
  if (!account) return { ok: false, error: "No account for that email. Register to continue." };
  const passwordHash = await sha256(`${account.salt}:${password}`);
  if (passwordHash !== account.passwordHash) {
    return { ok: false, error: "That password does not match." };
  }
  const session = { name: account.name, email: account.email };
  writeSession(session);
  return { ok: true, session };
}

export function readSession(): Session | null {
  if (!canStore()) return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as Session;
    if (!session?.email || !session?.name) return null;
    const exists = readAccounts().some((account) => account.email === session.email);
    return exists ? session : null;
  } catch {
    return null;
  }
}

export function writeSession(session: Session): void {
  if (!canStore()) return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  if (!canStore()) return;
  localStorage.removeItem(SESSION_KEY);
}

export function readPantry(email: string): PantryData {
  if (!canStore()) return emptyPantry();
  const key = dataKey(email);
  const raw = localStorage.getItem(key);
  if (!raw) {
    const seeded = seedPantry();
    localStorage.setItem(key, JSON.stringify(seeded));
    return seeded;
  }
  try {
    const parsed = JSON.parse(raw) as PantryData;
    if (!parsed || !Array.isArray(parsed.items) || !Array.isArray(parsed.history)) {
      return emptyPantry();
    }
    return parsed;
  } catch {
    return emptyPantry();
  }
}

export function writePantry(email: string, data: PantryData): void {
  if (!canStore()) return;
  localStorage.setItem(dataKey(email), JSON.stringify(data));
}
