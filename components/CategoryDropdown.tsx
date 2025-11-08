"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
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

  const { data: categories = [] } = useQuery({
    queryKey: ["product-categories"],
    queryFn: async () => {
      const { data } = await apiClient.get('/products/categories');
      // Support both new unified structure and legacy structure
      return data?.data?.categories || data?.data?.dynamicCategories || data?.categories || [];
    },
  });

  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    const typeMap = new Map<string, 'enum' | 'dynamic'>();
    categories.forEach((category: any) => {
      map.set(category.id, category.name);
      // Track category type for proper handling
      typeMap.set(category.id, category.type || 'dynamic');
    });
    return { names: map, types: typeMap };
  }, [categories]);

  const getCategoryName = (id: string) => categoryMap.names.get(id) || id;
  const getCategoryType = (id: string) => categoryMap.types.get(id) || 'dynamic';

  const handleCategoryToggle = (categoryId: string) => {
    const newCategories = selectedCategories.includes(categoryId)
      ? selectedCategories.filter((cat) => cat !== categoryId)
      : [...selectedCategories, categoryId];

    onCategoriesChange(newCategories);
  };

  const removeCategory = (categoryId: string) => {
    onCategoriesChange(selectedCategories.filter((cat) => cat !== categoryId));
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
                : selectedCategories
                    .map((id) => getCategoryName(id))
                    .filter(Boolean)
                    .join(", ") || `${selectedCategories.length} selected`}
            </span>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-full max-h-60 overflow-y-auto">
          {categories.map((category: any) => (
            <DropdownMenuItem
              key={category.id}
              onClick={() => handleCategoryToggle(category.id)}
              className="flex items-center justify-between cursor-pointer"
            >
              <span>{category.name}</span>
              {selectedCategories.includes(category.id) && (
                <Check className="h-4 w-4 text-green-600" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Selected Categories Display */}
      {selectedCategories.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {selectedCategories.map((categoryId) => (
            <Badge
              key={categoryId}
              variant="secondary"
              className="flex items-center gap-1"
            >
              {getCategoryName(categoryId)}
              {getCategoryType(categoryId) === 'enum' && (
                <span className="text-xs opacity-70">(Enum)</span>
              )}
              <button
                onClick={() => removeCategory(categoryId)}
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