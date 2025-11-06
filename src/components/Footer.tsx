import { Heart } from "@phosphor-icons/react";
import { motion } from "framer-motion";

const Footer = () => {
  return (
    <footer className="bg-pink-500 text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 text-center md:text-left">
          <motion.div
            className="col-span-1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <motion.div
              className="flex items-center justify-center md:justify-start space-x-2 mb-4"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <span className="text-4xl font-extrabold font-borel text-white">Gup Shop</span>
            </motion.div>
            <p className="text-pink-100 text-sm mb-6 max-w-xs mx-auto md:mx-0">
              The social e-commerce platform where communities come together to discover, share, and shop their favorite products with friends and family.
            </p>
          </motion.div>

          <motion.div
            className="col-span-1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <h3 className="font-semibold text-white mb-4 text-lg">Explore</h3>
            <ul className="space-y-3">
              <motion.li whileHover={{ x: 5, color: "#fce7f3" }} transition={{ duration: 0.3 }}>
                <a href="#" className="text-pink-100 text-sm hover:text-pink-200 transition-colors">
                  How it Works
                </a>
              </motion.li>
              <motion.li whileHover={{ x: 5, color: "#fce7f3" }} transition={{ duration: 0.3 }}>
                <a href="#" className="text-pink-100 text-sm hover:text-pink-200 transition-colors">
                  For Vendors
                </a>
              </motion.li>
              <motion.li whileHover={{ x: 5, color: "#fce7f3" }} transition={{ duration: 0.3 }}>
                <a href="#" className="text-pink-100 text-sm hover:text-pink-200 transition-colors">
                  For Users
                </a>
              </motion.li>
            </ul>
          </motion.div>

          <motion.div
            className="col-span-1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <h3 className="font-semibold text-white mb-4 text-lg">Support</h3>
            <ul className="space-y-3">
              <motion.li whileHover={{ x: 5, color: "#fce7f3" }} transition={{ duration: 0.3 }}>
                <a href="#" className="text-pink-100 text-sm hover:text-pink-200 transition-colors">
                  Digital Security 101
                </a>
              </motion.li>
              <motion.li whileHover={{ x: 5, color: "#fce7f3" }} transition={{ duration: 0.3 }}>
                <a href="#" className="text-pink-100 text-sm hover:text-pink-200 transition-colors">
                  Contact
                </a>
              </motion.li>
              <motion.li whileHover={{ x: 5, color: "#fce7f3" }} transition={{ duration: 0.3 }}>
                <a href="#" className="text-pink-100 text-sm hover:text-pink-200 transition-colors">
                  Corporate Responsibility
                </a>
              </motion.li>
            </ul>
          </motion.div>

          <motion.div
            className="col-span-1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
          >
            <h3 className="font-semibold text-white mb-4 text-lg">About</h3>
            <ul className="space-y-3">
              <motion.li whileHover={{ x: 5, color: "#fce7f3" }} transition={{ duration: 0.3 }}>
                <a href="#" className="text-pink-100 text-sm hover:text-pink-200 transition-colors">
                  Newsroom
                </a>
              </motion.li>
              <motion.li whileHover={{ x: 5, color: "#fce7f3" }} transition={{ duration: 0.3 }}>
                <a href="#" className="text-pink-100 text-sm hover:text-pink-200 transition-colors">
                  Careers
                </a>
              </motion.li>
              <motion.li whileHover={{ x: 5, color: "#fce7f3" }} transition={{ duration: 0.3 }}>
                <a href="#" className="text-pink-100 text-sm hover:text-pink-200 transition-colors">
                  Partner With Us
                </a>
              </motion.li>
            </ul>
          </motion.div>
        </div>

        <div className="border-t border-pink-400 mt-8 pt-6 flex flex-col md:flex-row justify-between items-center">
          <motion.div
            className="flex space-x-4 mb-4 md:mb-0"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.0 }}
          >
            <motion.a
              href="#"
              className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-md hover:shadow-xl transition-shadow"
              whileHover={{ scale: 1.1, boxShadow: "0 0 15px rgba(255, 255, 255, 0.5)" }}
              whileTap={{ scale: 0.95 }}
            >
              <span className="text-pink-500 text-lg">f</span>
            </motion.a>
            <motion.a
              href="#"
              className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-md hover:shadow-xl transition-shadow"
              whileHover={{ scale: 1.1, boxShadow: "0 0 15px rgba(255, 255, 255, 0.5)" }}
              whileTap={{ scale: 0.95 }}
            >
              <span className="text-pink-500 text-lg">@</span>
            </motion.a>
            <motion.a
              href="#"
              className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-md hover:shadow-xl transition-shadow"
              whileHover={{ scale: 1.1, boxShadow: "0 0 15px rgba(255, 255, 255, 0.5)" }}
              whileTap={{ scale: 0.95 }}
            >
              <span className="text-pink-500 text-lg">in</span>
            </motion.a>
            <motion.a
              href="#"
              className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-md hover:shadow-xl transition-shadow"
              whileHover={{ scale: 1.1, boxShadow: "0 0 15px rgba(255, 255, 255, 0.5)" }}
              whileTap={{ scale: 0.95 }}
            >
              <span className="text-pink-500 text-lg">x</span>
            </motion.a>
          </motion.div>
          <motion.div
            className="text-center md:text-right"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.2 }}
          >
            <p className="text-pink-100 text-sm mb-2">
              © 2025 Gup Shop. All rights reserved. |{" "}
              <a href="#" className="text-yellow-300 hover:text-pink-200 transition-colors">
                Legal
              </a>{" "}
              |{" "}
              <a href="#" className="text-yellow-300 hover:text-pink-200 transition-colors">
                Privacy Policy
              </a>{" "}
              |{" "}
              <a href="#" className="text-yellow-300 hover:text-pink-200 transition-colors">
                Your Privacy Choices
              </a>{" "}
              |{" "}
              <a href="#" className="text-yellow-300 hover:text-pink-200 transition-colors">
                Sitemap
              </a>
            </p>
          </motion.div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;