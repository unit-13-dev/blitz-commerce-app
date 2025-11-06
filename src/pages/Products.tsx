import { useState, useEffect, useCallback } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MagnifyingGlass, Funnel } from "@phosphor-icons/react";
import { motion } from "framer-motion";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import HighlightProductCard from "@/components/HighlightProductCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getProductImages } from "@/lib/utils";

const PRODUCTS_PER_PAGE = 12;

const Products = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Fetch all categories from product_categories table
  const { data: categories = [] } = useQuery({
    queryKey: ['product-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_categories')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
  });

  // Infinite query for products with pagination
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch
  } = useInfiniteQuery({
    queryKey: ['infinite-products', searchTerm, selectedCategory],
    queryFn: async ({ pageParam = 0 }) => {
      console.log('Fetching products page:', pageParam, 'searchTerm:', searchTerm, 'category:', selectedCategory);
      
      let query = supabase
        .from('products')
        .select(`
          *,
          vendor_profile:profiles!vendor_id (
            id,
            full_name,
            email,
            vendor_kyc_data:vendor_kyc!vendor_id ( 
              display_business_name,
              business_name
            )
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .range(pageParam * PRODUCTS_PER_PAGE, (pageParam + 1) * PRODUCTS_PER_PAGE - 1);

      if (searchTerm) {
        query = query.ilike('name', `%${searchTerm}%`);
      }
      
      // Filter by category using the new mapping system
      if (selectedCategory && selectedCategory !== "all") {
        // Use a subquery to get product IDs that belong to the selected category
        const { data: productIds } = await supabase
          .from('product_category_mappings')
          .select('product_id')
          .eq('category_id', selectedCategory);
        
        if (productIds && productIds.length > 0) {
          const ids = productIds.map(item => item.product_id);
          query = query.in('id', ids);
        } else {
          // If no products found for this category, return empty result
          return {
            products: [],
            nextPage: undefined,
          };
        }
      }

      const { data: products, error } = await query;
      
      if (error) {
        console.error('Error fetching products:', error.message, error.details, error.hint);
        throw error;
      }
      
      // Fetch product images for all products
      const productIds = (products || []).map(product => product.id);
      const productImages = await getProductImages(productIds);
      
      const processedProducts = (products || []).map(product => {
        const profileData = product.vendor_profile;
        const kycDataFromProfile = profileData?.vendor_kyc_data || [];
        
        // Ensure kycDataForCard is always an array
        const kycDataForCard = Array.isArray(kycDataFromProfile) 
          ? kycDataFromProfile 
          : (kycDataFromProfile ? [kycDataFromProfile] : []);

        // Create a clean vendor object for HighlightProductCard
        const vendor = profileData ? {
          id: profileData.id,
          full_name: profileData.full_name,
          email: profileData.email
        } : { id: '', email: 'unknown@example.com' };

        return {
          ...product,
          image_url: productImages[product.id] || null, // Add image_url from product_images
          vendor,
          vendor_kyc: kycDataForCard
        };
      });
      
      return {
        products: processedProducts,
        nextPage: products?.length === PRODUCTS_PER_PAGE ? pageParam + 1 : undefined,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
  });

  // Flatten all pages into a single array
  const allProducts = data?.pages.flatMap(page => page.products) || [];

  // Infinite scroll handler
  const handleScroll = useCallback(() => {
    if (
      window.innerHeight + document.documentElement.scrollTop
      >= document.documentElement.offsetHeight - 1000 &&
      hasNextPage &&
      !isFetchingNextPage
    ) {
      fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Reset to first page when search/filter changes
  useEffect(() => {
    refetch();
  }, [searchTerm, selectedCategory, refetch]);

  console.log('Products state:', { allProducts, isLoading });

  return (
    <div className="min-h-screen">
      <Header />
      <motion.div
        className="px-2 sm:px-4 lg:px-6 py-8 mt-20"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <div className="max-w-[1600px] mx-auto">
          <motion.div
            className="text-center mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-5xl font-extrabold mb-4 text-pink-700 bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent">
              Products
            </h1>
            <p className="text-lg md:text-xl text-gray-600">Discover amazing products from our community</p>
          </motion.div>

          {/* Search and Filter */}
          <motion.div
            className="flex flex-col md:flex-row gap-4 mb-8 max-w-4xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="relative flex items-center justify-center w-full">
              <MagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 text-pink-500 w-5 h-5" />
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 pr-4 py-3 rounded-xl border-2 border-pink-200 focus:border-pink-500 focus:ring-2 focus:ring-pink-200 transition-all duration-300"
              />
            </div>
            <div className="flex gap-3 items-center justify-center">
              <Select onValueChange={setSelectedCategory} defaultValue={selectedCategory}>
                <SelectTrigger className="w-full md:w-auto min-w-[160px] px-4 py-3 rounded-xl border-2 border-pink-200 bg-white text-gray-700 focus:border-pink-500 focus:ring-2 focus:ring-pink-200 transition-all duration-300">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent className="border-pink-200">
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("");
                  setSelectedCategory("all");
                }}
                className="flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-pink-500 bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:from-pink-600 hover:to-rose-600 transition-all duration-300 whitespace-nowrap"
              >
                <Funnel className="w-4 h-4" />
                Clear
              </Button>
            </div>
          </motion.div>

          {/* Products Grid - Optimized 4 Column Layout */}
          {isLoading ? (
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
                <div key={i} className="bg-white rounded-2xl shadow-xl p-4 animate-pulse">
                  <div className="h-64 bg-gray-200 rounded-xl mb-3"></div>
                  <div className="h-5 bg-gray-200 rounded w-2/3 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-full"></div>
                </div>
              ))}
            </motion.div>
          ) : allProducts.length === 0 ? (
            <motion.div
              className="text-center py-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h3 className="text-2xl font-semibold text-pink-600 mb-2">No products found</h3>
              <p className="text-gray-500">Try adjusting your search or filters</p>
            </motion.div>
          ) : (
            <>
            <motion.div
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
            >
                {allProducts.map((product, index) => (
                  <HighlightProductCard 
                    key={`${product.id}-${index}`}
                    product={product}
                    vendor={product.vendor}
                    index={index}
                  />
              ))}
            </motion.div>

              {/* Loading indicator for infinite scroll */}
              {isFetchingNextPage && (
                <motion.div
                  className="flex justify-center items-center py-8"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-center gap-2 text-pink-600">
                    <div className="w-6 h-6 border-2 border-pink-600 border-t-transparent rounded-full animate-spin"></div>
                    <span className="font-medium">Loading more products...</span>
                  </div>
                </motion.div>
              )}

              {/* End of results indicator */}
              {!hasNextPage && allProducts.length > 0 && (
                <motion.div
                  className="text-center py-8"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <p className="text-gray-500 font-medium">You've reached the end of the products list! 🌸</p>
                </motion.div>
              )}
            </>
          )}
        </div>
      </motion.div>
      <Footer />
    </div>
  );
};

export default Products;