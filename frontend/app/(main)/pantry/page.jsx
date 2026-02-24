"use client";
import {
  deletePantryItem,
  getPantryItems,
  updatePantryItem,
} from "@/actions/pantry.actions";
import AddToPantryModal from "@/components/AddToPantryModal";
import PricingModal from "@/components/PricingModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import useFetch from "@/hooks/use-fetch";
import {
  Check,
  ChefHat,
  Edit2,
  Loader,
  Loader2,
  Package,
  Plus,
  Sparkles,
  Trash2,
  UtensilsCrossed,
  X,
} from "lucide-react";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";

const PantryPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({ name: "", quantity: "" });
  const [failedImages, setFailedImages] = useState(new Set());

  /**
   * Get TheMealDB ingredient image URL for a given ingredient name.
   * Strips adjectives/qualifiers and normalizes to match TheMealDB's naming.
   */
  const getIngredientImage = (name) => {
    // Common substitutions for names TheMealDB uses differently
    const nameMap = {
      "all-purpose flour": "Plain Flour",
      "all purpose flour": "Plain Flour",
      "ap flour": "Plain Flour",
      "white flour": "Plain Flour",
      "macaroni and cheese": "Macaroni",
      "mac and cheese": "Macaroni",
      "peppercorns": "Pepper",
      "black peppercorns": "Pepper",
      "mixed peppercorns": "Pepper",
      "black pepper": "Pepper",
      "sea salt": "Salt",
      "coarse salt": "Salt",
      "coarse sea salt": "Salt",
      "kosher salt": "Salt",
      "table salt": "Salt",
      "white sugar": "Sugar",
      "granulated sugar": "Sugar",
      "white granulated sugar": "Sugar",
      "caster sugar": "Sugar",
      "limes": "Lime",
      "lemons": "Lemon",
      "eggs": "Eggs",
      "tomatoes": "Tomatoes",
      "onions": "Onion",
      "potatoes": "Potatoes",
      "carrots": "Carrots",
      "cloves": "Cloves",
      "whole cloves": "Cloves",
      "sesame seeds": "Sesame Seed",
      "sesame seed": "Sesame Seed",
      "garlic cloves": "Garlic",
      "garlic clove": "Garlic",
      "grapefruit": "Grapefruit",
      "green cabbage": "Cabbage",
      "red cabbage": "Red Cabbage",
      "green apple": "Apples",
      "green apples": "Apples",
      "broccoli florets": "Broccoli",
      "broccoli": "Broccoli",
      "hazelnuts": "Hazelnuts",
      "green chili peppers": "Green Chilli",
      "green chili pepper": "Green Chilli",
      "green chilies": "Green Chilli",
      "green chilli": "Green Chilli",
      "chili peppers": "Red Pepper",
      "flax seeds": "Flax Seed",
      "flax seed": "Flax Seed",
      "flaxseed": "Flax Seed",
      "salmon fillet": "Salmon",
      "salmon fillets": "Salmon",
      "chicken breast": "Chicken Breast",
      "chicken breasts": "Chicken Breast",
      "chicken thighs": "Chicken Thighs",
      "bell pepper": "Red Pepper",
      "bell peppers": "Red Pepper",
      "green bell pepper": "Green Pepper",
      "red bell pepper": "Red Pepper",
      "yellow bell pepper": "Yellow Pepper",
      "cherry tomatoes": "Cherry Tomatoes",
      "spring onions": "Spring Onions",
      "green onions": "Spring Onions",
      "olive oil": "Olive Oil",
      "vegetable oil": "Vegetable Oil",
      "soy sauce": "Soy Sauce",
      "brown sugar": "Brown Sugar",
      "powdered sugar": "Icing Sugar",
      "confectioners sugar": "Icing Sugar",
      "baking soda": "Bicarbonate Of Soda",
      "baking powder": "Baking Powder",
      "heavy cream": "Heavy Cream",
      "sour cream": "Sour Cream",
      "cream cheese": "Cream Cheese",
      "cheddar cheese": "Cheddar Cheese",
      "feta cheese": "Feta",
      "parmesan cheese": "Parmesan",
      "mozzarella cheese": "Mozzarella",
    };

    // Adjectives/qualifiers to strip
    const stripWords = [
      "fresh", "dried", "dry", "whole", "ground", "coarse", "fine",
      "raw", "organic", "pure", "extra", "virgin", "large", "small",
      "medium", "thick", "thin", "light", "dark", "sweet", "unsalted",
      "salted", "smoked", "roasted", "toasted", "crushed", "minced",
      "chopped", "sliced", "diced", "frozen", "canned", "packed",
      "florets", "fillet", "fillets", "boneless", "skinless", "peeled",
      "grated", "shredded", "cubed", "halved", "pitted", "deseeded",
      "trimmed", "ripe", "firm", "tender", "baby", "mini", "jumbo",
    ];

    const lower = name.trim().toLowerCase();

    // Check direct mapping first
    if (nameMap[lower]) {
      return `https://www.themealdb.com/images/ingredients/${encodeURIComponent(nameMap[lower])}.png`;
    }

    // Strip qualifier words
    let words = lower.split(/\s+/);
    words = words.filter((w) => !stripWords.includes(w));

    // Check mapping again after stripping
    const stripped = words.join(" ");
    if (nameMap[stripped]) {
      return `https://www.themealdb.com/images/ingredients/${encodeURIComponent(nameMap[stripped])}.png`;
    }

    // Title-case each word and join with space (TheMealDB format)
    const formatted = words
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

    return `https://www.themealdb.com/images/ingredients/${encodeURIComponent(formatted)}.png`;
  };

  const {
    loading: loadingItems,
    data: itemsData,
    fn: fetchItems,
  } = useFetch(getPantryItems);

  const {
    loading: deleting,
    data: deleteData,
    fn: deleteItem,
  } = useFetch(deletePantryItem);

  const {
    loading: updating,
    data: updateData,
    fn: updateItem,
  } = useFetch(updatePantryItem);

  useEffect(() => {
    fetchItems();
  }, []);

  useEffect(() => {
    if (itemsData?.success) {
      setItems(itemsData.items);
    }
  }, [itemsData]);

  useEffect(() => {
    if (deleteData?.success && !deleting) {
      toast.success("Item removed from pantry");
      fetchItems();
    }
  }, [deleteData]);

  //After Update, refetch items and reset edit state
  useEffect(() => {
    if (updateData?.success && !updating) {
      toast.success("Item updated successfully");
      setEditingId(null);
      fetchItems();
    }
  }, [updateData]);

  const handleDelete = async (itemId) => {
    const formData = new FormData();
    formData.append("itemId", itemId);
    await deleteItem(formData);
  };

  //handle edit
  const startEdit = (item) => {
    setEditingId(item.documentId);
    setEditValues({
      name: item.name,
      quantity: item.quantity,
    });
  };

  //save edit
  const saveEdit = async () => {
    const formData = new FormData();
    formData.append("itemId", editingId);
    formData.append("name", editValues.name);
    formData.append("quantity", editValues.quantity);
    await updateItem(formData);
  };

  //cancel edit
  const cancelEdit = () => {
    setEditingId(null);
    setEditValues({ name: "", quantity: "" });
  };

  const handleModalSuccess = (newItems) => {
    fetchItems();
  };
  return (
    <div className="min-h-screen bg-stone-50 pt-24 pb-16 px-4">
      <div className="container mx-auto max-w-5xl">
        <div className="mb-4">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Package className="w-16 h-16 text-orange-600" />
              <div>
                <h1 className="text-4xl md:text-5xl font-bold text-stone-900 tracking-tight">
                  My Pantry
                </h1>
                <p className="text-stone-600 font-light">
                  Manage your ingredients and discover what you can cook
                </p>
              </div>
            </div>
            <Button
              onClick={() => setIsModalOpen(true)}
              className="hidden md:flex bg-orange-600 hover:bg-orange-700 text-white gap-2"
              size="lg"
            >
              <Plus className="w-5 h-5" />
              Add to Pantry
            </Button>
          </div>

          {/* Add to Pantry Button - Mobile (Full Width) */}
          <Button
            onClick={() => setIsModalOpen(true)}
            className="md:hidden w-full bg-orange-600 hover:bg-orange-700 text-white gap-2 mb-4"
            size="lg"
          >
            <Plus className="w-5 h-5" />
            Add to Pantry
          </Button>

          {itemsData?.scansLimit !== undefined && (
            <div className="bg-white py-3 px-4 border-2 border-stone-200 inline-flex items-center gap-3">
              <Sparkles className="size-5 text-orange-600" />
              <div className="text-sm">
                {itemsData.scansLimit === "unlimited" ? (
                  <>
                    <span className="font-bold text-green-600">∞</span>
                    <span className="text-stone-500">
                      {" "}
                      Unlimited AI scans (Pro Plan)
                    </span>
                  </>
                ) : (
                  <PricingModal>
                    <span className="text-stone-500 cursor-pointer">
                      Upgrade to Pro for unlimited Pantry scans
                    </span>
                  </PricingModal>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Quick Action card */}
        {items.length > 0 && (
          <Link href="/pantry/recipes" className="block mb-8">
            <div className="bg-linear-to-br from-green-600 to-emerald-500 text-white p-6 border-2 border-emerald-700 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group">
              <div className="flex items-center gap-4">
                <div className="bg-white/20 p-3 border-2 border-white/30 group-hover:bg-white/30 transition-colors">
                  <ChefHat className="w-8 h-8" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-xl mb-1">
                    What Can I Cook Today?
                  </h3>
                  <p className="text-green-100 text-sm font-light">
                    Get AI-powered recipe suggestions from your {items.length}{" "}
                    ingredients
                  </p>
                </div>
                <div className="hidden sm:block">
                  <Badge className="bg-white/20 text-white border-2 border-white/30 font-bold uppercase tracking-wide">
                    {items.length} items
                  </Badge>
                </div>
              </div>
            </div>
          </Link>
        )}
        {/* Loading State */}

        {loadingItems && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader className="w-12 h-12 text-orange-600 animate-spin mb-4" />
            <p className="text-stone-500">Loading your pantry...</p>
          </div>
        )}

        {/* Pantry Items Grid */}
        {!loadingItems && items.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-stone-900">
                Your Ingredients
              </h2>
              <Badge
                variant="outline"
                className="text-stone-600 border-2 border-stone-900 font-bold uppercase tracking-wide"
              >
                {items.length} {items.length === 1 ? "item" : "items"}
              </Badge>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((item) => (
                <div
                  key={item.documentId}
                  className="bg-white border-2 border-stone-200 hover:border-orange-600 hover:shadow-lg transition-all overflow-hidden"
                >
                  {editingId === item.documentId ? (
                    <div className="p-5 space-y-3">
                      <input
                        type="text"
                        value={editValues.name}
                        onChange={(e) =>
                          setEditValues({ ...editValues, name: e.target.value })
                        }
                        className="w-full px-3 py-2 border-2 border-stone-200 focus:outline-none focus:border-orange-600 text-sm"
                        placeholder="Ingredient name"
                      />
                      <input
                        type="text"
                        value={editValues.quantity}
                        onChange={(e) =>
                          setEditValues({
                            ...editValues,
                            quantity: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border-2 border-stone-200 focus:outline-none focus:border-orange-600 text-sm"
                        placeholder="Quantity"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={saveEdit}
                          disabled={updating}
                          className="flex-1 bg-green-600 hover:bg-green-700 border-2 border-green-700"
                        >
                          {updating ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={cancelEdit}
                          disabled={updating}
                          className="flex-1 border-2 border-stone-900 hover:bg-stone-900 hover:text-white"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {/* Ingredient Image */}
                      <div className="relative w-full aspect-square bg-stone-50 flex items-center justify-center">
                        {!failedImages.has(item.documentId) ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={getIngredientImage(item.name)}
                            alt={item.name}
                            className="absolute inset-0 w-full h-full object-contain p-4"
                            onError={() =>
                              setFailedImages((prev) =>
                                new Set([...prev, item.documentId])
                              )
                            }
                          />
                        ) : (
                          <UtensilsCrossed className="w-12 h-12 text-stone-300" />
                        )}
                      </div>
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h3 className="font-bold text-lg text-stone-900 mb-1">
                              {item.name}
                            </h3>
                            <p className="text-stone-500 text-sm font-light">
                              {item.quantity}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              onClick={() => startEdit(item)}
                              variant="ghost"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              onClick={() => handleDelete(item.documentId)}
                              disabled={deleting}
                              variant="ghost"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="text-xs text-stone-400">
                          Added {new Date(item.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        {/* Empty State */}
        {!loadingItems && items.length === 0 && (
          <div className="bg-white p-12 text-center border-2 border-dashed border-stone-300">
            <div className="bg-orange-50 size-20 border-2 border-orange-200 flex items-center justify-center mx-auto mb-6">
              <Package className="size-10 text-orange-600" />
            </div>
            <h3 className="text-2xl font-medium text-stone-900 mb-2">
              Your pantry is empty
            </h3>
            <p className="text-stone-500 text-sm">
              Add ingredients to get started
            </p>
          </div>
        )}
        {/* Add to Pantry Modal */}
      </div>
      <AddToPantryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
};

export default PantryPage;
