'use client';

import { useState, useEffect, useCallback } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
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
import { apiClient } from "@/lib/api-client";

const PRODUCTS_PER_PAGE = 12;

const Products = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const { data: categoriesData } = useQuery({
    queryKey: ['product-categories'],
    queryFn: async () => {
      const { data } = await apiClient.get('/products/categories');
      return data?.data?.categories || [];
    },
  });

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['infinite-products', searchTerm, selectedCategory],
    queryFn: async ({ pageParam = 0 }) => {
      const { data } = await apiClient.get('/products', {
        params: {
          page: pageParam,
          limit: PRODUCTS_PER_PAGE,
          search: searchTerm || undefined,
          categoryId: selectedCategory !== 'all' ? selectedCategory : undefined,
        },
      });
      return data;
    },
    getNextPageParam: (lastPage: any, allPages) => {
      const hasMore = lastPage?.meta?.pagination 
        ? allPages.length < lastPage.meta.pagination.totalPages 
        : false;
      return hasMore ? allPages.length : undefined;
    },
    initialPageParam: 0,
  });

  const allProducts = data?.pages.flatMap((page: any) => page?.data || []) || [];

  const handleScroll = useCallback(() => {
    if (
      window.innerHeight + document.documentElement.scrollTop >=
      document.documentElement.offsetHeight - 1000 &&
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

  useEffect(() => {
    refetch();
  }, [searchTerm, selectedCategory, refetch]);

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
                className="pl-12 pr-4 py-6 text-lg border-2 border-pink-200 focus:border-pink-500 rounded-xl"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full md:w-[200px] py-6 border-2 border-pink-200 focus:border-pink-500 rounded-xl">
                <Funnel className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {(categoriesData || []).map((category: any) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </motion.div>

          {isLoading && allProducts.length === 0 ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading products...</p>
            </div>
          ) : allProducts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">No products found</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {allProducts.map((product: any, index: number) => (
                  <HighlightProductCard
                    key={product.id}
                    product={product}
                    vendor={product.vendor_profile}
                    index={index}
                  />
                ))}
              </div>
              {isFetchingNextPage && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mx-auto"></div>
                </div>
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

