'use client';

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Heart, UsersThree, ShoppingBagOpen } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [userType, setUserType] = useState<"user" | "vendor" | "admin">("user");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { user, signIn, signUp } = useAuth();

  useEffect(() => {
    if (user) {
      router.push("/");
    }
  }, [user, router]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) throw error;
        toast({
          title: "Welcome back!",
          description: "You have successfully logged in.",
        });
        router.push("/");
      } else {
        const { error } = await signUp(email, password, fullName, userType);
        if (error) {
          toast({
            title: "Error",
            description: error,
            variant: "destructive",
          });
          return;
        }
        toast({
          title: "Account created!",
          description: "Your account has been created successfully.",
        });
        router.push("/");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-rose-50 flex items-center justify-center p-4">
      <motion.div
        className="w-full max-w-md md:max-w-lg"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <motion.div
          className="bg-white rounded-2xl shadow-xl p-8 border border-pink-100"
          whileHover={{
            scale: 1.02,
            boxShadow: "0 10px 20px rgba(236, 72, 153, 0.2)",
          }}
          transition={{ duration: 0.3 }}
        >
          <div className="text-center mb-10">
            <motion.div
              className="flex items-center justify-center space-x-3 mb-6"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <span className="text-5xl font-extrabold text-pink-800">
                Gup Shop
              </span>
            </motion.div>
            <motion.h1
              className="text-3xl font-extrabold mb-3 text-pink-600"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              {isLogin ? "Welcome Back" : "Join Gup Shop"}
            </motion.h1>
            <p className="text-gray-600 text-lg">
              {isLogin
                ? "Sign in to your account"
                : "Create your account to get started"}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-6">
            {!isLogin && (
              <>
                <div>
                  <Label
                    htmlFor="fullName"
                    className="text-pink-500 text-lg font-semibold"
                  >
                    Full Name
                  </Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    className="mt-2 py-5 border-2 border-pink-200 focus:border-pink-500 focus:ring-2 focus:ring-pink-200 transition-all duration-300"
                    required
                  />
                </div>

                <div>
                  <Label className="text-pink-500 text-lg font-semibold">
                    Account Type
                  </Label>
                  <RadioGroup
                    value={userType}
                    onValueChange={(value) => setUserType(value as "user" | "vendor" | "admin")}
                    className="mt-2 space-y-3"
                  >
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem
                        value="user"
                        id="user"
                        className="border-pink-300"
                      />
                      <Label
                        htmlFor="user"
                        className="flex items-center text-gray-700"
                      >
                        <UsersThree size={20} className="mr-2 text-pink-500" />
                        Regular User
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem
                        value="vendor"
                        id="vendor"
                        className="border-pink-300"
                      />
                      <Label
                        htmlFor="vendor"
                        className="flex items-center text-gray-700"
                      >
                        <ShoppingBagOpen
                          size={20}
                          className="mr-2 text-pink-500"
                        />
                        Become a Vendor
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </>
            )}

            <div>
              <Label
                htmlFor="email"
                className="text-pink-500 text-lg font-semibold"
              >
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="mt-2 py-5 border-2 border-pink-200 focus:border-pink-500 focus:ring-2 focus:ring-pink-200 transition-all duration-300"
              />
            </div>

            <div>
              <Label
                htmlFor="password"
                className="text-pink-500 text-lg font-semibold"
              >
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="mt-2 py-5  border-2 border-pink-200 focus:border-pink-500 focus:ring-2 focus:ring-pink-200 transition-all duration-300"
              />
            </div>

            <motion.div
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.3 }}
            >
              <Button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white font-semibold hover:from-pink-600 hover:to-rose-600 transition-all duration-300"
                disabled={loading}
              >
                {loading ? (
                  <motion.div
                    className="flex items-center justify-center"
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  >
                    <span className="w-5 h-5 border-4 border-t-transparent border-white rounded-full"></span>
                  </motion.div>
                ) : isLogin ? (
                  "Sign In"
                ) : (
                  "Sign Up"
                )}
              </Button>
            </motion.div>
          </form>

          <div className="mt-6 text-center">
            <motion.button
              onClick={() => setIsLogin(!isLogin)}
              className="text-pink-600 hover:text-rose-600 font-medium text-lg transition-colors duration-300"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.3 }}
            >
              {isLogin
                ? "Need an account? Sign up"
                : "Already have an account? Sign in"}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Auth;

