import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, Key, Copy, Check, Users, Calendar, Clock, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Custom type for group with product data
type GroupWithProduct = {
  id: string;
  name: string;
  description: string | null;
  is_private: boolean;
  access_code: string | null;
  created_at: string;
  product_id: string | null;
  product?: {
    id: string;
    name: string;
    image_url: string | null;
  } | null;
  order_id?: string | null; // Add order_id to check if order is completed
  finalization_deadline?: string | null;
  admin_finalized_at?: string | null;
};

interface GroupOrderCardProps {
  group: GroupWithProduct;
}

const GroupOrderCard: React.FC<GroupOrderCardProps> = ({ group }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [copied, setCopied] = React.useState(false);

  // Countdown timer state
  const [timeLeft, setTimeLeft] = useState<string | null>(null);

  useEffect(() => {
    if (!group.finalization_deadline || group.admin_finalized_at) {
      setTimeLeft(null);
      return;
    }
    const deadline = new Date(group.finalization_deadline).getTime();
    const update = () => {
      const now = Date.now();
      const diff = deadline - now;
      if (diff <= 0) {
        setTimeLeft("expired");
        return;
      }
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [group.finalization_deadline, group.admin_finalized_at]);

  // Fetch product categories
  const { data: productCategories } = useQuery({
    queryKey: ['product-categories', group.product_id],
    queryFn: async () => {
      if (!group.product_id) return [];
      
      const { data, error } = await supabase
        .from('product_category_mappings')
        .select(`
          product_categories!inner(name)
        `)
        .eq('product_id', group.product_id);

      if (error) throw error;
      return data?.map((item: any) => item.product_categories.name) || [];
    },
    enabled: !!group.product_id,
  });

  const handleCopyAccessCode = async () => {
    if (!group.access_code) return;

    try {
      await navigator.clipboard.writeText(group.access_code);
      setCopied(true);
      
      toast({
        title: "Access code copied!",
        description: "The access code has been copied to your clipboard.",
      });

      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please copy the access code manually.",
        variant: "destructive",
      });
    }
  };

  const handleCardClick = () => {
    navigate(`/groups/${group.id}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        duration: 0.4,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
      whileHover={{ 
        y: -8,
        scale: 1.02,
        transition: { duration: 0.2 }
      }}
      whileTap={{ scale: 0.98 }}
    >
      <Card
        className="cursor-pointer group relative overflow-hidden bg-white dark:bg-gray-900 border-0 shadow-lg hover:shadow-2xl transition-all duration-500 ease-out"
        onClick={handleCardClick}
      >
        {/* Large Product Image */}
        <div className="relative h-80 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
          <img
            src={group.product?.image_url || "/placeholder.svg"}
            alt={group.product?.name || "Product"}
            className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110 group-hover:rotate-1"
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent group-hover:from-black/30 transition-all duration-500" />
          
          {/* Private indicator overlay - All groups are now private */}
          <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm rounded-full p-2">
            <Lock className="w-4 h-4 text-white" />
          </div>
        </div>

        {/* Card Content */}
        <CardContent className="p-6 space-y-4">
          {/* Group Header */}
          <div className="space-y-2">
            <div className="flex items-start justify-between">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 leading-tight">
                {group.name}
              </h3>
              {/* All groups are now private */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-pink-500 to-rose-500 text-white"
              >
                <Lock className="w-3 h-3" />
                Private
              </motion.div>
            </div>
            
            {/* Description */}
            {group.description && (
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed line-clamp-2">
                {group.description}
              </p>
            )}
            
            {/* Product Categories */}
            {productCategories && productCategories.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-2">
                {productCategories.map((category: string) => (
                  <Badge
                    key={category}
                    variant="secondary"
                    className="text-xs px-2 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200"
                  >
                    {category}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Access Code Section - All groups are now private */}
          {group.access_code && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-gradient-to-r from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20 rounded-xl border border-pink-200 dark:border-pink-800 p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-pink-500 rounded-lg p-2">
                    <Key className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-pink-700 dark:text-pink-300 uppercase tracking-wide">
                      Access Code
                    </p>
                    <p className="text-sm font-mono font-bold text-pink-900 dark:text-pink-100">
                      {group.access_code}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-10 w-10 p-0 rounded-full hover:bg-pink-100 dark:hover:bg-pink-900/30 transition-all duration-200"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopyAccessCode();
                  }}
                >
                  <motion.div
                    animate={copied ? { scale: [1, 1.2, 1] } : {}}
                    transition={{ duration: 0.3 }}
                  >
                    {copied ? (
                      <Check className="w-5 h-5 text-green-600" />
                    ) : (
                      <Copy className="w-5 h-5 text-pink-600" />
                    )}
                  </motion.div>
                </Button>
              </div>
            </motion.div>
          )}

          {/* Order Status or Countdown */}
          {group.order_id && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-800 p-3"
            >
              <div className="flex items-center gap-3">
                <div className="bg-green-500 rounded-lg p-2">
                  <Check className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-xs font-medium text-green-700 dark:text-green-300 uppercase tracking-wide">
                    Order Completed
                  </p>
                  <p className="text-sm font-medium text-green-900 dark:text-green-100">
                    Group order has been finalized
                  </p>
                </div>
              </div>
            </motion.div>
          )}
          {!group.order_id && group.finalization_deadline && !group.admin_finalized_at && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className={`rounded-xl border p-3 ${timeLeft === "expired" ? "bg-red-50 border-red-200" : "bg-yellow-50 border-yellow-200"}`}
            >
              <div className="flex items-center gap-3">
                <div className={`rounded-lg p-2 ${timeLeft === "expired" ? "bg-red-500" : "bg-yellow-400"}`}>
                  {timeLeft === "expired" ? (
                    <X className="w-4 h-4 text-white" />
                  ) : (
                    <Clock className="w-4 h-4 text-white" />
                  )}
                </div>
                <div>
                  {timeLeft === "expired" ? (
                    <>
                      <p className="text-xs font-medium text-red-700 uppercase tracking-wide">Order Expired</p>
                      <p className="text-sm font-medium text-red-900">Group order was not finalized in time</p>
                    </>
                  ) : (
                    <>
                      <p className="text-xs font-medium text-yellow-700 uppercase tracking-wide">Time Left</p>
                      <p className="text-sm font-medium text-yellow-900">{timeLeft} left to finalize group order</p>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
              <Calendar className="w-4 h-4" />
              <span className="text-sm font-medium">
                {new Date(group.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </span>
            </div>
            
            {/* Hover effect indicator */}
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              whileHover={{ opacity: 1, x: 0 }}
              className="text-xs text-gray-400 dark:text-gray-500 font-medium"
            >
              Click to view
            </motion.div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default GroupOrderCard; 