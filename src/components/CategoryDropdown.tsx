import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronDown, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CategoryDropdownProps {
  selectedCategories: string[];
  onCategoriesChange: (categories: string[]) => void;
  disabled?: boolean;
}

export default function CategoryDropdown({
  selectedCategories,
  onCategoriesChange,
  disabled = false,
}: CategoryDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Fetch all categories
  const { data: categories = [] } = useQuery({
    queryKey: ["product-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_categories")
        .select("id, name")
        .order("name");

      if (error) throw error;
      return data;
    },
  });

  const handleCategoryToggle = (categoryName: string) => {
    const newCategories = selectedCategories.includes(categoryName)
      ? selectedCategories.filter(cat => cat !== categoryName)
      : [...selectedCategories, categoryName];
    
    onCategoriesChange(newCategories);
  };

  const removeCategory = (categoryName: string) => {
    onCategoriesChange(selectedCategories.filter(cat => cat !== categoryName));
  };

  return (
    <div className="space-y-2">
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between"
            disabled={disabled}
          >
            <span>
              {selectedCategories.length === 0
                ? "Select categories..."
                : `${selectedCategories.length} selected`}
            </span>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-full max-h-60 overflow-y-auto">
          {categories.map((category) => (
            <DropdownMenuItem
              key={category.id}
              onClick={() => handleCategoryToggle(category.name)}
              className="flex items-center justify-between cursor-pointer"
            >
              <span>{category.name}</span>
              {selectedCategories.includes(category.name) && (
                <Check className="h-4 w-4 text-green-600" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Selected Categories Display */}
      {selectedCategories.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {selectedCategories.map((category) => (
            <Badge
              key={category}
              variant="secondary"
              className="flex items-center gap-1"
            >
              {category}
              <button
                onClick={() => removeCategory(category)}
                className="ml-1 hover:text-red-600"
                disabled={disabled}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
} 