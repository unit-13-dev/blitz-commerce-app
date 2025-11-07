
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface CartProductCardProps {
  item: {
    id: string;
    quantity: number;
    product: {
      id: string;
      name: string;
      price: number;
      image_url?: string;
      category?: string;
      description?: string;
    };
  };
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemoveItem: (itemId: string) => void;
}

const CartProductCard = ({ item, onUpdateQuantity, onRemoveItem }: CartProductCardProps) => {
  const router = useRouter();

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity <= 0) {
      onRemoveItem(item.id);
    } else {
      onUpdateQuantity(item.id, newQuantity);
    }
  };

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex space-x-4">
          <div className="relative flex-shrink-0">
            <img
              src={item.product.image_url || "/placeholder.svg"}
              alt={item.product.name}
              className="w-20 h-20 object-cover rounded-lg cursor-pointer hover:scale-105 transition-transform duration-300"
              onClick={() => router.push(`/products/${item.product.id}`)}
            />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 
              className="font-semibold text-lg cursor-pointer hover:text-pink-600 truncate"
              onClick={() => router.push(`/products/${item.product.id}`)}
            >
              {item.product.name}
            </h3>
            
            {item.product.category && (
              <p className="text-sm text-gray-500 mb-2">{item.product.category}</p>
            )}
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuantityChange(item.quantity - 1)}
                  className="w-8 h-8 p-0"
                >
                  <Minus className="w-4 h-4" />
                </Button>
                
                <span className="font-medium min-w-[2rem] text-center">{item.quantity}</span>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuantityChange(item.quantity + 1)}
                  className="w-8 h-8 p-0"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="text-right">
                <p className="text-lg font-bold">${(item.product.price * item.quantity).toFixed(2)}</p>
                <p className="text-sm text-gray-500">${item.product.price} each</p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemoveItem(item.id)}
              className="text-red-500 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CartProductCard;
