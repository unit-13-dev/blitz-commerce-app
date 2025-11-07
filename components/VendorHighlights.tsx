'use client';

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import HighlightProductCard from "./HighlightProductCard";
import { FlipWords } from "./ui/vendorHighlight-flip-words";
import { ArrowRight } from "@phosphor-icons/react";
import { Button } from "./ui/button";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";

const VendorHighlights = () => {
  const [currentProductIndex, setCurrentProductIndex] = useState(0);
  const router = useRouter();

  const { data: vendorStats } = useQuery({
    queryKey: ["vendor-stats"],
    queryFn: async () => {
      const { data } = await apiClient.get('/products', {
        params: { page: 0, limit: 100 },
      });
      const vendors = new Set((data?.products || []).map((p: any) => p.vendor?.id).filter(Boolean));
      return { vendorCount: vendors.size };
    },
  });

  const { data: vendorHighlights = [] } = useQuery({
    queryKey: ["all-vendor-highlights"], 
    queryFn: async () => {
      const { data } = await apiClient.get('/products', {
        params: { page: 0, limit: 50 },
      });
      const products = data?.products || [];
      return products.map((product: any) => ({
        vendor: product.vendor_profile || { id: product.vendorId, full_name: '', email: '' },
        product: product,
      }));
    },
  });

  // Auto-advance carousel every 4 seconds
  useEffect(() => {
    if (vendorHighlights.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentProductIndex((prev) => (prev + 1) % vendorHighlights.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [vendorHighlights.length]);

  if (!vendorHighlights || vendorHighlights.length === 0) {
    return null; // Don't render if no vendor highlights
  }

  // Get the current product and vendor from the carousel data
  const currentHighlight = vendorHighlights[currentProductIndex];
  const currentVendor = currentHighlight?.vendor;

  const vendorName =
    currentVendor?.full_name ||
    (currentVendor?.email
      ? currentVendor.email.split("@")[0].replace(/[^a-zA-Z0-9]/g, "")
      : "Our Vendors"); // Sensible fallback if name is unavailable

  const vendorCount = vendorStats?.vendorCount || 100;
  const vendorLocation = "Mumbai"; // Remains hardcoded as in original

  // Create words array for FlipWords from all product names
  const productWords = vendorHighlights.map(
    (highlight: any) => highlight.product.name
  );
  const currentProductName =
    vendorHighlights[currentProductIndex]?.product.name;

  return (
    <section className="py-20 md:py-28 bg-gradient-to-br from-gray-50 via-white to-pink-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.2, delay: 0.2 }}
            >
              <motion.h2
                className="text-lg sm:text-3xl lg:text-6xl font-bold text-gray-900 leading-10"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.4 }}
              >
                Meet{" "}
                <motion.span
                  className="text-transparent font-cursive font-medium bg-clip-text bg-gradient-to-r from-pink-600 to-rose-500"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 1, delay: 0.8 }}
                >
                  {vendorCount}+ vendors
                </motion.span>{" "}
                like{" "}
                <motion.span
                  key={vendorName} 
                  className="font-cursive font-medium underline"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <FlipWords words={[vendorName]} currentWord={vendorName} className="text-pink-600"/>
                </motion.span>{" "}
                from{" "}
                <motion.span
                  className="text-pink-600 font-cursive font-medium"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 1, delay: 1.2 }}
                >
                  {vendorLocation}
                </motion.span>{" "}
                selling{" "}
                <motion.span
                  className="text-pink-600 inline-block"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 1, delay: 1.4 }}
                >
                  <FlipWords
                    words={productWords}
                    currentWord={currentProductName}
                    className="text-pink-600 font-cursive font-medium"
                  />
                </motion.span>{" "}
                on our platform
              </motion.h2>
            </motion.div>

            <motion.p
              className="text-xl text-gray-600 leading-relaxed max-w-xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 1.6 }}
            >
              Discover amazing products from our community of vendors and creators.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 1.8 }}
            >
              <Button
                size="lg"
                className="bg-gradient-to-r from-pink-600 to-rose-500 text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out group"
                onClick={() => router.push("/products")}
              >
                Interested? Explore our products
                <ArrowRight className="ml-2 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
              </Button>
            </motion.div>
          </div>

          {/* Right Side - Single Product Card (Auto-only) */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, delay: 0.6 }}
            className="relative"
          >
            {/* Single Product Display - No Navigation */}
            <div className="relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentHighlight.product.id}
                  initial={{ opacity: 0, x: 100 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ duration: 0.5 }}
                >
                  <HighlightProductCard
                    product={currentHighlight.product}
                    vendor={currentHighlight.vendor}
                    index={0}
                  />
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default VendorHighlights;
