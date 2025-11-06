import React from "react";
import { Card } from "@/components/ui/card";

interface ProductTagCardProps {
  product: {
    id: string;
    name: string;
    price: number;
    image_url: string | null;
    vendor_id: string;
  };
  onSelect: (productId: string) => void;
  isSelected: boolean;
}

const ProductTagCard: React.FC<ProductTagCardProps> = ({ 
  product, 
  onSelect, 
  isSelected 
}) => {
  return (
    <Card 
      className={`cursor-pointer transition-all duration-200 hover:shadow-lg overflow-hidden ${
        isSelected 
          ? 'ring-2 ring-pink-500 ring-offset-2' 
          : 'hover:ring-1 hover:ring-pink-300'
      }`}
      onClick={() => onSelect(product.id)}
    >
      <div className="relative aspect-square">
        {/* Product Image - Takes full space */}
        <img
          src={product.image_url || "/placeholder.svg"}
          alt={product.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.src = "/placeholder.svg";
          }}
        />
        
        {/* Product Name Overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3">
          <h3 className="font-bold text-base text-white line-clamp-2 leading-tight">
            {product.name}
          </h3>
          <p className="text-xs text-white/90 mt-1">
            ₹{product.price.toLocaleString()}
          </p>
        </div>

        {/* Selection Indicator */}
        {isSelected && (
          <div className="absolute top-2 right-2 bg-pink-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-medium shadow-lg">
            ✓
          </div>
        )}
      </div>
    </Card>
  );
};

export default ProductTagCard; 