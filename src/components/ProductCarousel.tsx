import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { useNavigate } from "react-router-dom";
import { getProductImages } from "@/lib/utils";

const ProductCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const navigate = useNavigate();

  // Fetch 10 latest products
  const { data: latestProducts = [] } = useQuery({
    queryKey: ["latest-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(
          `
          *,
          vendor_profile:profiles!vendor_id (
            full_name,
            email
          )
        `
        )
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      
      const products = data || [];
      
      // Fetch product images for all products
      const productIds = products.map(product => product.id);
      const productImages = await getProductImages(productIds);
      
      // Add image_url to each product
      const productsWithImages = products.map(product => ({
        ...product,
        image_url: productImages[product.id] || null
      }));
      
      return productsWithImages;
    },
  });

  // Auto-advance carousel every 10 seconds
  useEffect(() => {
    if (latestProducts.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % latestProducts.length);
    }, 10000);

    return () => clearInterval(interval);
  }, [latestProducts.length]);

  // Navigation functions
  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % latestProducts.length);
  };

  const prevSlide = () => {
    setCurrentIndex(
      (prev) => (prev - 1 + latestProducts.length) % latestProducts.length
    );
  };

  if (!latestProducts || latestProducts.length === 0) {
    return null;
  }

  const currentProduct = latestProducts[currentIndex];
  const vendorName =
    currentProduct.vendor_profile?.full_name ||
    currentProduct.vendor_profile?.email?.split("@")[0] ||
    "Unknown Vendor";

  return (
    <section className="pt-24 pb-12 mt-20 bg-gradient-to-b from-white via-pink-50 to-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 tracking-tight">
            Shop like a pro, feel the{" "}
            <span className="tracking-wider font-extralight font-pacifico text-pink-500">
              room
            </span>{" "}
             score the best deals with{" "}
             <span className="tracking-wider font-light font-pacifico text-pink-500">
              Gup Shop
            </span>
          </h2>
        </motion.div>
      </div>

      <div className="relative w-full">
        <div className="overflow-hidden">
          <div className="relative h-[350px] md:h-[380px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentProduct.id}
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0 mb-5 flex items-center"
              >
                <div className="flex w-full h-full container mx-auto px-4 sm:px-6 lg:px-8">
                  {/* Left Side - Product Image */}
                  <div className="w-1/2 flex items-center justify-center p-8">
                    <div className="relative w-full h-full max-w-sm">
                      <img
                        src={
                          currentProduct.image_url ||
                          "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=600&h=600&fit=crop"
                        }
                        alt={currentProduct.name}
                        className="w-full h-full object-contain cursor-pointer hover:scale-105 transition-transform duration-500 rounded-2xl shadow-lg"
                        onClick={() =>
                          navigate(`/products/${currentProduct.id}`)
                        }
                      />
                    </div>
                  </div>

                  {/* Right Side - Product Information */}
                  <div className="w-1/2 flex flex-col justify-center p-8">
                    <div className="space-y-4 max-w-lg">
                      {/* Category Badge */}
                      {currentProduct.category && (
                        <span className="inline-block bg-pink-500 text-white px-4 py-2 rounded-full text-sm font-medium uppercase tracking-wide">
                          {currentProduct.category}
                        </span>
                      )}

                      {/* Product Name */}
                      <h3
                        className="text-2xl md:text-3xl font-bold  text-gray-900 cursor-pointer hover:text-pink-600 transition-colors duration-300 tracking-wider uppercase"
                        onClick={() =>
                          navigate(`/products/${currentProduct.id}`)
                        }
                      >
                        {currentProduct.name}
                      </h3>

                      {/* Description */}
                      <p className="text-gray-600 text-base lowercase leading-relaxed line-clamp-2">
                        {currentProduct.description ||
                          "Quality product with amazing features and great value for money"}
                      </p>

                      {/* Price and Vendor */}
                      <div className="space-y-2">
                        <div className="flex items-baseline space-x-3">
                          <span className="text-3xl font-bold text-gray-900">
                            ₹{currentProduct.price}
                          </span>
                          <span className="text-gray-400 line-through text-lg">
                            ₹{Math.round(currentProduct.price * 1.3)}
                          </span>
                          <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                            23% OFF
                          </span>
                        </div> 
                        <p className="text-gray-600 text-sm">
                          Sold by{" "}
                          <span className="font-medium text-pink-600">
                            {vendorName}
                          </span>
                        </p>
                      </div>

                      {/* Single Action Button */}
                      <div className="pt-4">
                        <button
                          onClick={() =>
                            navigate(`/products/${currentProduct.id}`)
                          }
                          className="bg-pink-500 hover:bg-pink-600 text-white font-semibold py-3 px-6 text-base rounded-full transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-pink-500/40 font-cu"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Navigation Arrows */}
            <button
              onClick={prevSlide}
              className="absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-all duration-200 z-10 shadow-lg border border-gray-200 hover:border-pink-300"
            >
              <CaretLeft className="w-5 h-5 text-gray-700" />
            </button>

            <button
              onClick={nextSlide}
              className="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-all duration-200 z-10 shadow-lg border border-gray-200 hover:border-pink-300"
            >
              <CaretRight className="w-5 h-5 text-gray-700" />
            </button>

            {/* Dots Indicator */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex space-x-3">
              {latestProducts.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    index === currentIndex
                      ? "bg-pink-500 w-8"
                      : "bg-gray-300 hover:bg-pink-300"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProductCarousel;
 