import mongoose from "mongoose";

export const BIG_FISH_DEMO_KEY = "big-fish-parts";

const BIG_FISH_PARTS = [
  { partName: "Head", unit: "per kg" },
  { partName: "Body", unit: "per kg" },
  { partName: "Tail", unit: "per kg" },
];

/**
 * Creates the legacy catalog fixture used as a fallback for the admin POS
 * part-picker. Parts are labels only; they share the parent product's price
 * and pooled stock.
 */
export async function ensureBigFishDemoCatalog(db: any) {
  const categories = db.collection("categories");
  const products = db.collection("products");

  let fishCategory = await categories.findOne({ name: { $regex: /^fish$/i } });
  if (!fishCategory) {
    const now = new Date();
    const maxCategory = await categories.find({}).sort({ sortOrder: -1 }).limit(1).next();
    const result = await categories.insertOne({
      name: "Fish",
      imageUrl: "",
      isActive: true,
      sortOrder: Number(maxCategory?.sortOrder) || 0,
      subCategories: [],
      createdAt: now,
      updatedAt: now,
    });
    fishCategory = { _id: result.insertedId, name: "Fish" };
  }

  const categoryName = String(fishCategory.name || "Fish");
  const now = new Date();
  const demoParts = BIG_FISH_PARTS.map((part) => ({ ...part, isWeightBased: true }));
  let existing = await products.findOne({ demoKey: BIG_FISH_DEMO_KEY });
  if (!existing) {
    existing = await products.findOne({ name: "Big Fish (Demo)", category: categoryName });
  }
  const existingDemoParts = Array.isArray(existing?.demoParts) ? existing.demoParts : [];
  const persistedDemoParts = demoParts.map((defaultPart) => {
    const configuredPart = existingDemoParts.find((part: any) =>
      String(part?.partName) === defaultPart.partName
      || (defaultPart.partName === "Body" && String(part?.partName) === "Middle"),
    );
    return {
      ...(configuredPart ?? {}),
      ...defaultPart,
      partName: defaultPart.partName,
    };
  });
  const demoMetadata = {
    name: "Surmai",
    demoKey: BIG_FISH_DEMO_KEY,
    isDemoBigFishSelector: true,
    demoParts: persistedDemoParts,
    category: categoryName,
    description: "Choose Surmai Head, Body, or Tail in POS",
  };
  const demoFields = {
    ...demoMetadata,
    price: 0,
    originalPrice: 0,
    discountPct: 0,
    unit: "per kg",
    quantity: 0,
    status: "available",
    isArchived: false,
    imageUrl: "",
    preorderMode: "normal",
    preorderAvailability: { type: "all", weekdays: [0, 1, 2, 3, 4, 5, 6], startDate: "", endDate: "" },
    recipes: [],
    sectionId: [],
    couponIds: [],
    updatedAt: now,
  };

  if (existing) {
    await products.updateOne(
      { _id: existing._id },
      { $set: demoMetadata },
    );
    return { ...existing, ...demoMetadata };
  }

  const doc = {
    ...demoFields,
    batches: [{
      _id: new mongoose.Types.ObjectId(),
      batchNumber: "BIG-FISH-DEMO-01",
      quantity: 0,
      price: 0,
      shelfLifeDays: null,
      receivedDate: now,
      expiryDate: null,
      notes: "Sample catalog item",
      createdAt: now,
    }],
    createdAt: now,
  };
  const result = await products.insertOne(doc);
  return { ...doc, _id: result.insertedId };
}