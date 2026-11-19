import { CATEGORIES, isoOffset, shelfDays, type Category } from "@/lib/pantry";

export type VisionNet = {
  classify: (
    img: HTMLCanvasElement,
    topk?: number
  ) => Promise<Array<{ className: string; probability: number }>>;
};

export type ScanProduct = {
  name: string;
  category: Category;
  mfd: string;
  exp: string;
  detail: string;
};

export type ScanResult = ScanProduct | "blocked";

type MobileNetModule = {
  load?: (args?: { version?: number; alpha?: number }) => Promise<VisionNet>;
  default?: {
    load?: (args?: { version?: number; alpha?: number }) => Promise<VisionNet>;
  };
};

type BarcodeDetectorInstance = {
  detect: (source: CanvasImageSource) => Promise<Array<{ rawValue?: string }>>;
};

type BarcodeDetectorCtor = new (options?: { formats?: string[] }) => BarcodeDetectorInstance;

let cachedVision: VisionNet | null = null;
let inflightVision: Promise<VisionNet> | null = null;

const FRUIT_RULES: Array<{
  keywords: string[];
  name: string;
  days: number;
}> = [
  { keywords: ["apple", "granny smith", "red delicious", "golden delicious"], name: "Apples", days: 7 },
  { keywords: ["banana"], name: "Bananas", days: 5 },
  { keywords: ["orange", "clementine", "tangerine", "mandarin"], name: "Oranges", days: 10 },
  { keywords: ["lemon"], name: "Lemons", days: 14 },
  { keywords: ["lime"], name: "Limes", days: 14 },
  { keywords: ["mango"], name: "Mangoes", days: 6 },
  { keywords: ["strawberry", "strawberries"], name: "Strawberries", days: 4 },
  { keywords: ["grape", "grapes"], name: "Grapes", days: 7 },
  { keywords: ["watermelon"], name: "Watermelon", days: 7 },
  { keywords: ["pineapple"], name: "Pineapples", days: 5 },
  { keywords: ["papaya"], name: "Papayas", days: 5 },
  { keywords: ["guava"], name: "Guavas", days: 5 },
  { keywords: ["pomegranate"], name: "Pomegranates", days: 14 },
  { keywords: ["pear"], name: "Pears", days: 6 },
  { keywords: ["peach"], name: "Peaches", days: 5 },
  { keywords: ["plum"], name: "Plums", days: 5 },
  { keywords: ["kiwi"], name: "Kiwi", days: 7 },
  { keywords: ["avocado"], name: "Avocados", days: 5 },
  { keywords: ["fig"], name: "Figs", days: 4 },
  { keywords: ["jackfruit"], name: "Jackfruit", days: 5 },
  { keywords: ["custard apple", "annona"], name: "Custard apple", days: 4 },
  { keywords: ["cherry", "cherries"], name: "Cherries", days: 5 },
  { keywords: ["apricot"], name: "Apricots", days: 5 },
  { keywords: ["berry", "blueberry", "blueberries", "raspberry", "raspberries", "blackberry", "blackberries"], name: "Berries", days: 4 },
  { keywords: ["melon", "cantaloupe", "honeydew"], name: "Melons", days: 6 },
];

const PRODUCE_VEGGIE_RULES: Array<{
  keywords: string[];
  name: string;
  days: number;
}> = [
  { keywords: ["spinach"], name: "Fresh spinach", days: 5 },
  { keywords: ["lettuce", "romaine", "cabbage", "kale"], name: "Lettuce", days: 7 },
  { keywords: ["tomato"], name: "Tomatoes", days: 7 },
  { keywords: ["carrot"], name: "Carrots", days: 14 },
  { keywords: ["broccoli", "cauliflower"], name: "Broccoli", days: 7 },
  { keywords: ["potato"], name: "Potatoes", days: 21 },
  { keywords: ["onion"], name: "Onions", days: 25 },
  { keywords: ["cucumber", "zucchini"], name: "Cucumbers", days: 7 },
  { keywords: ["bell pepper", "capsicum", "pepper"], name: "Peppers", days: 7 },
  { keywords: ["corn", "maize"], name: "Sweet corn", days: 4 },
  { keywords: ["mushroom"], name: "Mushrooms", days: 5 },
];

const KNOWN_FOOD_KEYWORDS = [
  "food",
  "fruit",
  "vegetable",
  "produce",
  "milk",
  "yogurt",
  "curd",
  "cheese",
  "paneer",
  "butter",
  "cream",
  "egg",
  "eggs",
  "bread",
  "bun",
  "buns",
  "bagel",
  "bagels",
  "croissant",
  "cake",
  "pastry",
  "juice",
  "tea",
  "coffee",
  "soda",
  "cola",
  "water",
  "beverage",
  "chicken",
  "fish",
  "shrimp",
  "prawn",
  "pork",
  "beef",
  "mutton",
  "seafood",
  "meat",
  "rice",
  "pasta",
  "noodle",
  "lentil",
  "dal",
  "flour",
  "sugar",
  "salt",
  "spice",
  "oil",
  "sauce",
  "jam",
  "honey",
  "cereal",
  "oat",
  "oats",
  "nut",
  "nuts",
  "almond",
  "walnut",
  "cashew",
  "peanut",
  "chocolate",
  "cookie",
  "biscuit",
  "snack",
  "soup",
  "pizza",
  "burger",
  "sandwich",
];

const NON_FOOD_BLOCKLIST = [
  "laptop",
  "notebook",
  "desktop computer",
  "monitor",
  "screen",
  "television",
  "tv",
  "keyboard",
  "computer mouse",
  "remote control",
  "cellular telephone",
  "mobile phone",
  "smartphone",
  "ipad",
  "tablet",
  "camera",
  "headphones",
  "earphone",
  "speaker",
  "charger",
  "cable",
  "desk",
  "chair",
  "sofa",
  "couch",
  "table",
  "bookcase",
  "wardrobe",
  "bed",
  "pillow",
  "blanket",
  "curtain",
  "lamp",
  "light bulb",
  "sunglasses",
  "eyeglasses",
  "watch",
  "clock",
  "shoe",
  "sneaker",
  "sandal",
  "boot",
  "sock",
  "shirt",
  "t-shirt",
  "jeans",
  "trouser",
  "jacket",
  "coat",
  "hat",
  "cap",
  "bag",
  "backpack",
  "handbag",
  "wallet",
  "key",
  "pen",
  "pencil",
  "book",
  "paper",
  "scissors",
  "hammer",
  "screwdriver",
  "wrench",
  "car",
  "automobile",
  "bicycle",
  "motorcycle",
  "dog",
  "cat",
  "bird",
  "toy",
  "ball",
  "plant",
  "flowerpot",
  "vase",
];

function matchesAnyKeyword(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((kw) => {
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${escaped}(?:es|s)?\\b`, "i");
    return regex.test(lower) || lower.includes(kw);
  });
}

function matchRule(rawLabel: string, rules: Array<{ keywords: string[]; name: string; days: number }>) {
  const lower = rawLabel.toLowerCase();
  return rules.find((rule) =>
    rule.keywords.some((kw) => {
      const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`\\b${escaped}(?:es|s)?\\b`, "i");
      return regex.test(lower) || lower.includes(kw);
    })
  );
}

function inferCategoryFromText(text: string): Category {
  const lower = text.toLowerCase();
  if (matchRule(lower, FRUIT_RULES) || matchRule(lower, PRODUCE_VEGGIE_RULES)) {
    return "Produce";
  }
  if (/\b(milk|yogurt|curd|cheese|paneer|butter|cream|egg|eggs|dairy)\b/.test(lower)) {
    return "Dairy";
  }
  if (/\b(bread|bun|buns|bagel|bagels|croissant|cake|pastry|bakery)\b/.test(lower)) {
    return "Bakery";
  }
  if (/\b(juice|tea|coffee|soda|cola|water|drink|beverage)\b/.test(lower)) {
    return "Beverages";
  }
  if (/\b(chicken|fish|shrimp|prawn|pork|beef|mutton|seafood|meat)\b/.test(lower)) {
    return "Meat/Seafood";
  }
  return "Pantry";
}

function formatTitle(raw: string): string {
  const primary = raw.split(",")[0].trim();
  if (!primary) return "";
  return primary.charAt(0).toUpperCase() + primary.slice(1);
}

export function peekVision(): VisionNet | null {
  return cachedVision;
}

export async function loadVision(): Promise<VisionNet> {
  if (cachedVision) return cachedVision;
  if (inflightVision) return inflightVision;

  inflightVision = (async () => {
    const tfModule = (await import("@tensorflow/tfjs")) as {
      ready?: () => Promise<void>;
    };
    if (typeof tfModule.ready === "function") {
      await tfModule.ready();
    }

    const mobilenetModule = (await import("@tensorflow-models/mobilenet")) as MobileNetModule;
    const loader = mobilenetModule.load ?? mobilenetModule.default?.load;
    if (typeof loader !== "function") {
      throw new Error("MobileNet loader is unavailable.");
    }

    const net = await loader({ version: 2, alpha: 1.0 });
    cachedVision = net;
    return net;
  })()
    .catch((err) => {
      inflightVision = null;
      throw err;
    });

  return inflightVision;
}

export function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to decode image."));
    };
    img.src = url;
  });
}

export function draw224(image: HTMLImageElement | HTMLCanvasElement): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 224;
  canvas.height = 224;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 2D context unavailable.");
  }

  const srcWidth = image instanceof HTMLCanvasElement ? image.width : image.naturalWidth || image.width;
  const srcHeight = image instanceof HTMLCanvasElement ? image.height : image.naturalHeight || image.height;
  const side = Math.min(srcWidth, srcHeight);
  const sx = Math.max(0, Math.floor((srcWidth - side) / 2));
  const sy = Math.max(0, Math.floor((srcHeight - side) / 2));

  ctx.drawImage(image, sx, sy, side, side, 0, 0, 224, 224);
  return canvas;
}

export async function readBarcode(source: CanvasImageSource): Promise<string | null> {
  const ctor =
    typeof window !== "undefined"
      ? (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector
      : undefined;
  if (!ctor) return null;

  try {
    const detector = new ctor({
      formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39"],
    });
    const barcodes = await detector.detect(source);
    const first = barcodes.find((b) => typeof b.rawValue === "string" && b.rawValue.trim().length > 0);
    return first?.rawValue?.trim() ?? null;
  } catch {
    return null;
  }
}

export async function lookupOpenFoodFacts(barcode: string): Promise<ScanResult | null> {
  const cleaned = barcode.replace(/\D/g, "") || barcode.trim();
  if (!cleaned) return null;

  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(cleaned)}.json`);
    if (!res.ok) return null;

    const data = (await res.json()) as {
      status?: number;
      product?: {
        product_name?: string;
        product_name_en?: string;
        categories?: string;
        brands?: string;
      };
    };

    if (data.status !== 1 || !data.product) return null;

    const rawName = (data.product.product_name_en || data.product.product_name || "").trim();
    const categoryText = `${rawName} ${data.product.categories || ""} ${data.product.brands || ""}`;

    if (matchesAnyKeyword(categoryText, NON_FOOD_BLOCKLIST)) {
      return "blocked";
    }

    const name = formatTitle(rawName) || `Product ${cleaned}`;
    const category = CATEGORIES.includes(inferCategoryFromText(categoryText))
      ? inferCategoryFromText(categoryText)
      : "Pantry";
    const days = shelfDays(category);

    return {
      name,
      category,
      mfd: isoOffset(0),
      exp: isoOffset(days),
      detail: `Matched ${name} via Open Food Facts · default ${days}d window.`,
    };
  } catch {
    return null;
  }
}

export async function classifyCanvas(model: VisionNet, canvas: HTMLCanvasElement): Promise<ScanResult> {
  const predictions = await model.classify(canvas, 5);
  if (!predictions || predictions.length === 0) {
    return "blocked";
  }

  for (const pred of predictions) {
    if (pred.probability < 0.03) continue;
    const fruit = matchRule(pred.className, FRUIT_RULES);
    if (fruit) {
      return {
        name: fruit.name,
        category: "Produce",
        mfd: isoOffset(0),
        exp: isoOffset(fruit.days),
        detail: `Fruit detected: ${fruit.name} (${Math.round(pred.probability * 100)}% confidence) · ${fruit.days}d shelf life.`,
      };
    }
  }

  for (const pred of predictions) {
    if (pred.probability < 0.05) continue;
    const veggie = matchRule(pred.className, PRODUCE_VEGGIE_RULES);
    if (veggie) {
      return {
        name: veggie.name,
        category: "Produce",
        mfd: isoOffset(0),
        exp: isoOffset(veggie.days),
        detail: `Produce detected: ${veggie.name} (${Math.round(pred.probability * 100)}% confidence) · ${veggie.days}d shelf life.`,
      };
    }
  }

  for (const pred of predictions) {
    if (pred.probability >= 0.12 && matchesAnyKeyword(pred.className, NON_FOOD_BLOCKLIST)) {
      return "blocked";
    }
  }

  const top = predictions[0];
  const hasFoodKeyword = matchesAnyKeyword(top.className, KNOWN_FOOD_KEYWORDS);
  if (!hasFoodKeyword && top.probability >= 0.15) {
    return "blocked";
  }

  const cleanName = formatTitle(top.className);
  const category = inferCategoryFromText(top.className);
  const days = shelfDays(category);

  return {
    name: cleanName,
    category,
    mfd: isoOffset(0),
    exp: isoOffset(days),
    detail: `Top match: ${cleanName || "Item"} (${Math.round(top.probability * 100)}%). Confirm before saving.`,
  };
}
