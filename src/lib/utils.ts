import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { supabase } from "@/integrations/supabase/client"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Helper function to fetch product images from product_images table
export async function getProductImageUrl(productId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from("product_images")
      .select("image_url")
      .eq("product_id", productId)
      .order("display_order", { ascending: true })
      .limit(1);

    if (error) {
      console.error("Error fetching product image:", error);
      return null;
    }

    return data?.[0]?.image_url || null;
  } catch (error) {
    console.error("Error in getProductImageUrl:", error);
    return null;
  }
}

// Helper function to fetch multiple product images
export async function getProductImages(productIds: string[]): Promise<Record<string, string | null>> {
  try {
    const { data, error } = await supabase
      .from("product_images")
      .select("product_id, image_url")
      .in("product_id", productIds)
      .order("display_order", { ascending: true });

    if (error) {
      console.error("Error fetching product images:", error);
      return {};
    }

    // Group by product_id and take the first image for each product
    const imageMap: Record<string, string | null> = {};
    const seenProducts = new Set<string>();

    for (const item of data || []) {
      if (!seenProducts.has(item.product_id)) {
        imageMap[item.product_id] = item.image_url;
        seenProducts.add(item.product_id);
      }
    }

    return imageMap;
  } catch (error) {
    console.error("Error in getProductImages:", error);
    return {};
  }
}
