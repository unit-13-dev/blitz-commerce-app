import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Users,
  ShoppingBag,
  ShareNetwork,
  TrendUp,
  Star,
  Heart,
} from "@phosphor-icons/react";
import { motion } from "framer-motion";
import CountUp from "react-countup";

// Define container variants for staggered animations
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.3,
    },
  },
};

export default function Hero() {
  return (
    <motion.main
      className="relative overflow-hidden bg-pink-500 text-white"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={containerVariants}
    >
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="w-[80vw] h-[80vw] max-w-[750px] max-h-[750px] bg-pink-400 blur-[200px] opacity-30 animate-pulse-slow" />
      </div>
      <section className="w-full px-6 sm:px-8 lg:px-12 xl:px-16 pt-32 pb-20 relative z-10">
        <motion.div
          className="max-w-[1600px] mx-auto grid lg:grid-cols-2 gap-32 items-center"
          variants={containerVariants}
        >
          <motion.div className="text-center lg:text-left max-w-2xl">
            <motion.h1
              className="text-5xl font-pacifico tracking-wide font-extralight md:text-6xl lg:text-7xl xl:text-8xl mb-10 leading-tight text-white"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              Shop Together,{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-pink-100">
                Save More
              </span>
            </motion.h1>

            {/* Value Proposition */}
            <motion.div
              className="mb-14"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <p className="text-xl md:text-2xl text-white mb-6 font-medium">
                Join group orders with friends and get{" "}
                <span className="text-yellow-300 font-bold">up to 30% off</span>{" "}
                on your favorite products
              </p>
              <p className="text-lg text-pink-100">
                The first social commerce platform that lets you discover,
                share, and buy products together for better deals
              </p>
            </motion.div>

            {/* Enhanced Social Proof Stats - No Borders */}
            <motion.div
              className="grid grid-cols-3 gap-4 mb-14"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
            >
              <div className="text-center p-4 bg-white/20 backdrop-blur-sm rounded-2xl border border-white/20">
                <CountUp
                  duration={3}
                  start={0}
                  end={350}
                  className="text-3xl md:text-4xl font-bold text-white mb-2"
                />
                <span className="text-3xl md:text-4xl font-bold text-white mb-2">
                  +
                </span>
                <div className="text-xs font-medium text-pink-100 uppercase tracking-wide">
                  Active Vendors
                </div>
              </div>
              <div className="text-center p-4 bg-white/20 backdrop-blur-sm rounded-2xl border border-white/20">
                <div className="text-3xl md:text-4xl font-bold text-white mb-2">
                  5K+
                </div>
                <div className="text-xs font-medium text-pink-100 uppercase tracking-wide">
                  Happy Customers
                </div>
              </div>
              <div className="text-center p-4 bg-white/20 backdrop-blur-sm rounded-2xl border border-white/20">
                <div className="text-3xl md:text-4xl font-bold text-white mb-2">
                  ₹2M+
                </div>
                <div className="text-xs font-medium text-pink-100 uppercase tracking-wide">
                  Saved Together
                </div>
              </div>
            </motion.div>

            {/* Additional Trust Element */}
            <motion.div
              className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 sm:gap-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 1.0 }}
            ></motion.div>
          </motion.div>

          {/* Right Side - Hero Image */}
          <motion.div
            className="relative w-full max-w-3xl mx-auto lg:mx-0 lg:ml-auto"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <div className="relative">
              {/* Decorative background elements */}
              <div className="absolute -top-12 -right-12 w-[400px] h-[400px] bg-gradient-to-br from-pink-400 to-pink-600 rounded-full blur-3xl opacity-40"></div>
              <div className="absolute -bottom-16 -left-16 w-80 h-80 bg-gradient-to-br from-pink-300 to-pink-500 rounded-full blur-3xl opacity-30"></div>

              {/* Main image container - Transparent Background */}
              <div className="relative rounded-[32px] p-8">
                <img
                  src="/shopping.png"
                  width={800}
                  height={800}
                  alt="Social shopping experience - friends shopping together for better deals"
                  className="w-full h-auto rounded-[24px] relative z-10"
                />
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>
    </motion.main>
  );
}
