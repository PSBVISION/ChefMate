"use client";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Camera, Check, Loader, Loader2, Plus, X } from "lucide-react";
import useFetch from "@/hooks/use-fetch";
import {
  addPantryItemManually,
  saveToPantry,
  scanPantryImage,
} from "@/actions/pantry.actions";
import { Button } from "./ui/button";
import { toast } from "sonner";
import ImageUploader from "./ImageUploader";
import { Badge } from "./ui/badge";
const AddToPantryModal = ({ isOpen, onClose, onSuccess }) => {
  const [activeTab, setActiveTab] = useState("search");
  const [selectedImage, setSelectedImage] = useState(null);
  const [scannedIngredients, setScannedIngredients] = useState([]);
  const [manualItem, setManualItem] = useState({ name: "", quantity: "" });

  const {
    loading: scanning,
    data: scanData,
    fn: scanImage,
  } = useFetch(scanPantryImage);

  useEffect(() => {
    if (scanData?.success && scanData?.ingredients) {
      setScannedIngredients(scanData.ingredients);
      toast.success(
        `Found ${scanData.ingredients.length} ingredients! Review and save to pantry.`,
      );
    }
  }, [scanData]);

  // Save scanned items
  const {
    loading: saving,
    data: saveData,
    fn: saveScannedItems,
  } = useFetch(saveToPantry);

  // Add manual item
  const {
    loading: adding,
    data: addData,
    fn: addManualItem,
  } = useFetch(addPantryItemManually);

  const handleClose = () => {
    setActiveTab("scan");
    setSelectedImage(null);
    setScannedIngredients([]);
    setManualItem({ name: "", quantity: "" });
    onClose();
  };

  const handleImageSelect = (file) => {
    setSelectedImage(file);
    setScannedIngredients([]);
  };
  useEffect(() => {
    if (addData?.success) {
      toast.success("Item added to pantry!");
      setManualItem({ name: "", quantity: "" });
      handleClose();
      if (onSuccess) onSuccess();
    }
  }, [addData]);
  const handleAddManual = async (e) => {
    e.preventDefault();
    if (!manualItem.name.trim() || !manualItem.quantity.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    const formData = new FormData();
    formData.append("name", manualItem.name);
    formData.append("quantity", manualItem.quantity);
    await addManualItem(formData);
  };

  const handleScan = async () => {
    if (!selectedImage) return;
    const formData = new FormData();
    formData.append("image", selectedImage);
    await scanImage(formData);
  };

  const handleSaveScanned = async () => {
    if(scannedIngredients.length === 0){
      toast.error("No ingredients to save");
      return;
    }
    const formData = new FormData();
    formData.append("ingredients", JSON.stringify(scannedIngredients));
    await saveScannedItems(formData);
  }

  useEffect(()=>{
    if(saveData?.success){
      toast.success(saveData.message);
      handleClose();
      if(onSuccess) onSuccess();
    }
  }, [saveData])
  const removeIngredient = (index) => {
    setScannedIngredients(scannedIngredients.filter((_,i)=> i !== index));
  }
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-none">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold tracking-tight">
            Add to Pantry
          </DialogTitle>
          <DialogDescription>
            Scan your pantry with AI or add items manually
          </DialogDescription>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="scan" className="gap-2">
              <Camera className="size-4" />
              AI Scan
            </TabsTrigger>
            <TabsTrigger value="manual" className="gap-2">
              <Plus className="size-4" /> Add Manually
            </TabsTrigger>
          </TabsList>
          {/* Scan Tab Content */}
          <TabsContent value="scan" className="space-y-6 mt-6">
            {scannedIngredients.length === 0 ? (
              <div className="space-y-4">
                <ImageUploader
                  onImageSelect={handleImageSelect}
                  loading={scanning}
                />
                {selectedImage && !scanning && (
                  <Button
                    onClick={handleScan}
                    variant="primary"
                    className="w-full h-12 text-lg"
                    disabled={scanning}
                  >
                    {scanning ? (
                      <>
                        <Loader className="w-5 h-5 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Camera className="w-5 h-5 mr-2" />
                        Scan Image
                      </>
                    )}
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-lg text-stone-900">
                      Scanned Ingredients
                    </h3>
                    <p className="text-sm text-stone-600">
                      {scannedIngredients.length} ingredients found
                    </p>
                  </div>
                  <Button
                    onClick={() => {
                      setScannedIngredients([]);
                      setSelectedImage(null);
                    }}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    <Camera className="size-4" />
                    Scan Again
                  </Button>
                </div>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {scannedIngredients.map((ingredients, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-4 bg-stone-50 rounded-xl border border-stone-200"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-stone-900">
                          {ingredients.name}
                        </div>
                        <div className="text-sm text-stone-500">
                          {ingredients.quantity}
                        </div>
                      </div>
                      {ingredients.confidence && (
                        <Badge
                          className="text-xs text-green-700 border-green-200"
                          variant="outline"
                        >
                          {Math.round(ingredients.confidence * 100)}%
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeIngredient(index)}
                        className="text-stone-600 hover:text-red-600"
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                <Button
                  onClick={handleSaveScanned}
                  disabled={saving || scannedIngredients.length === 0}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white h-12 w-full"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5 mr-2" />
                      Save {scannedIngredients.length} Items to Pantry
                    </>
                  )}
                </Button>
              </div>
            )}
          </TabsContent>
          {/* Manual Tab Content */}
          <TabsContent value="manual" className="mt-6">
            <form className="space-y-4" onSubmit={handleAddManual}>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Ingredient Name
                </label>
                <input
                  type="text"
                  value={manualItem.name}
                  onChange={(e) =>
                    setManualItem({ ...manualItem, name: e.target.value })
                  }
                  placeholder="e.g., Chicken breast"
                  className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                  disabled={adding}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Quantity
                </label>
                <input
                  type="text"
                  value={manualItem.quantity}
                  onChange={(e) =>
                    setManualItem({ ...manualItem, quantity: e.target.value })
                  }
                  placeholder="e.g., 500g, 2 cups, 3 pieces"
                  className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                  disabled={adding}
                />
              </div>
              <Button
                type="submit"
                disabled={adding}
                variant="primary"
                className="flex-1 h-12 w-full"
              >
                {adding ? (
                  <>
                    <Loader className="w-5 h-5 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5 mr-2" />
                    Add Item
                  </>
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default AddToPantryModal;
