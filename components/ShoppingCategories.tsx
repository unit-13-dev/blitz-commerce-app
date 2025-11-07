'use client';

import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Tag } from "@phosphor-icons/react";

const ShoppingCategories = () => {
  const router = useRouter();

  const categories = [
    {
      title: "Electronics & Gadgets",
      image:
        "https://images.pexels.com/photos/1054397/pexels-photo-1054397.jpeg",
      className: "col-span-2 row-span-2",
    },
    {
      title: "Fashion & Clothing",
      image:
        "https://images.pexels.com/photos/1036623/pexels-photo-1036623.jpeg",
      className: "col-span-1 row-span-1",
    },
    {
      title: "Beauty & Cosmetics",
      image:
        "https://images.pexels.com/photos/3373737/pexels-photo-3373737.jpeg",
      className: "col-span-1 row-span-1",
    },
    {
      title: "Home & Living",
      image: "https://images.pexels.com/photos/276583/pexels-photo-276583.jpeg",
      className: "col-span-2 row-span-1",
    },
    {
      title: "Food & Groceries",
      image:
        "https://images.pexels.com/photos/7890120/pexels-photo-7890120.jpeg",
      className: "col-span-1 row-span-1",
    },

    {
      title: "Books & Stationery",
      image:
        "https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg",
      className: "col-span-2 row-span-1",
    },
    {
      title: "Health & Wellness",
      image:
        "https://images.pexels.com/photos/3076509/pexels-photo-3076509.jpeg",
      className: "col-span-1 row-span-1",
    },
  ];

  const handleCategoryClick = (categoryTitle: string) => {
    router.push(
      `/products?category=${encodeURIComponent(categoryTitle.toLowerCase())}`
    );
  };

  return (
    <section className="py-16 md:py-24 bg-gradient-to-b from-pink-50/40 to-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 cursor-pointer">
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4 tracking-tight">
            Explore Varieties in{" "}
            <span className="text-pink-500 font-cursive font-light text-6xl">Gup Shop</span>
          </h2>
          <p className="text-lg sm:text-xl text-gray-600/70 font-bold max-w-3xl mx-auto">
            Dive into a world of curated products tailored to your lifestyle
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 auto-rows-[200px] sm:auto-rows-[250px] lg:auto-rows-[300px]">
          <AnimatePresence>
            {categories.map((category, index) => (
              <motion.div
                key={category.title}
                custom={index}
                initial="hidden"
                animate="visible"
                whileHover="hover"
                className={`relative group overflow-hidden rounded-3xl bg-white/10 backdrop-blur-lg border border-pink-200/30 shadow-lg hover:shadow-2xl hover:shadow-pink-500/20 transition-all duration-500 ${category.className}`}
                onClick={() => handleCategoryClick(category.title)}
                style={{
                  backgroundImage: `url(${category.image})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat",
                }}
              >
                {/* Glassmorphism Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent group-hover:from-black/60 group-hover:via-black/20 transition-all duration-500" />

                {/* Shimmer Effect */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-600">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-pink-300/30 to-transparent transform -skew-x-12 translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-800 ease-out" />
                </div>

                {/* Glow Border */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <div className="absolute inset-0 border-2 border-pink-400/50 rounded-3xl shadow-[0_0_25px_rgba(244,114,182,0.3)]" />
                </div>

                {/* Content */}
                <div className="absolute inset-0 flex flex-col justify-end p-4 sm:p-6 lg:p-8 group-hover:p-10 transition-all duration-500">
                  <motion.div
                    className="flex items-center gap-3"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.5, delay: index * 0.2 }}
                  >
                    <Tag
                      size={28}
                      weight="fill"
                      className="text-pink-400 group-hover:text-pink-300 transition-colors duration-300"
                    />
                    <div>
                      <h3 className="text-white text-lg sm:text-xl lg:text-2xl font-bold group-hover:text-pink-100 transition-all duration-300 drop-shadow-xl">
                        {category.title}
                      </h3>
                      <motion.div
                        className="h-0.5 bg-gradient-to-r from-pink-400 to-rose-400"
                        initial={{ width: 0 }}
                        animate={{ width: "50%" }}
                        transition={{ duration: 0.6, delay: index * 0.2 + 0.2 }}
                      />
                    </div>
                  </motion.div>
                </div>

                {/* Ambient Glow */}
                <div className="absolute -inset-3 opacity-0 group-hover:opacity-100 transition-opacity duration-700 ease-out -z-10">
                  <div className="absolute inset-0 bg-gradient-to-r from-pink-500/20 via-rose-400/20 to-pink-600/20 blur-2xl rounded-3xl" />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
};

export default ShoppingCategories;
 