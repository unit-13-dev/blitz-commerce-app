import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Heart, ShoppingCart, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import UserProfileDropdown from "@/components/UserProfileDropdown";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";

// Define navigation links with TypeScript interface
interface NavLinkItem {
  to: string;
  label: string;
}

const navLinks: NavLinkItem[] = [
  { to: "/", label: "Feed" },
  { to: "/products", label: "Products" },
  // { to: "/groups", label: "Groups" }, // DISABLED: Groups removed - groups are now exclusively private
  // { to: "/", label: "About" },
];

export default function Header() {
  const location = useLocation();
  const { toast } = useToast();
  const { user, profile, signOut } = useAuth();
  const [scrolled, setScrolled] = useState<boolean>(false);

  // Check if user is vendor
  const isVendor = profile?.role === 'vendor';

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Fetch cart count (only for non-vendors)
  const { data: cartCount } = useQuery<number>({
    queryKey: ["cart-count", user?.id],
    queryFn: async () => {
      if (!user || isVendor) return 0;
      const { data, error } = await supabase
        .from("cart_items")
        .select("quantity", { count: "exact" })
        .eq("user_id", user.id);
      if (error) return 0;
      return data.reduce(
        (sum: number, item: { quantity: number }) => sum + item.quantity,
        0
      );
    },
    enabled: !!user && !isVendor,
  });

  // Fetch wishlist count (only for non-vendors)
  const { data: wishlistCount } = useQuery<number>({
    queryKey: ["wishlist-count", user?.id],
    queryFn: async () => {
      if (!user || isVendor) return 0;
      const { count, error } = await supabase
        .from("wishlist")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);
      if (error) return 0;
      return count ?? 0;
    },
    enabled: !!user && !isVendor,
  });

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Signed out successfully",
        description: "You have been logged out.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-in">
        <div
          className={cn(
            "transition-all duration-500 ease-out mx-auto",
            scrolled
              ? "mt-6 max-w-6xl bg-white/10 backdrop-blur-2xl rounded-lg shadow-2xl shadow-black/50"
              : "max-w-6xl bg-transparent mt-4"
          )}
        >
          <div className="container mx-auto py-1 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <NavLink to="/" className="flex items-center justify-center">
                <img 
                  src="/GupShop.png" 
                  alt="Gup Shop Logo" 
                  className="h-16 object-contain"
                />
              </NavLink>

              <nav className="hidden md:flex items-center space-x-8">
                {navLinks.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    className={({ isActive }) =>
                      cn(
                        "text-lg text-pink-600 transition-colors hover:text-pink-800",
                        isActive && "text-pink-600"
                      )
                    }
                  >
                    {link.label}
                  </NavLink>
                ))}
              </nav>

              <div className="flex items-center space-x-4 md:space-x-6">
                {user && (
                  <>
                    {/* Only show wishlist and cart for non-vendors */}
                    {!isVendor && (
                      <>
                        <NavLink
                          to="/wishlist"
                          className="relative text-pink-600 hover:text-pink-800 group"
                        >
                          <Heart
                            size={22}
                            className="group-hover:fill-fuchsia-600 transition-colors"
                          />
                          {wishlistCount != null && wishlistCount > 0 && (
                            <span className="absolute -top-2 -right-2 bg-pink-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                              {wishlistCount}
                            </span>
                          )}
                          <span className="sr-only">Wishlist</span>
                        </NavLink>
                        <NavLink
                          to="/cart"
                          className="relative text-pink-600 hover:text-pink-800"
                        >
                          <ShoppingCart size={22} />
                          {cartCount != null && cartCount > 0 && (
                            <span className="absolute -top-2 -right-2 bg-pink-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                              {cartCount}
                            </span>
                          )}
                          <span className="sr-only">Cart</span>
                        </NavLink>
                      </>
                    )}

                    <NavLink
                      to="/search"
                      className="relative text-pink-600 hover:text-pink-800 group"
                    >
                      <Search
                        size={20}
                        className="hover:scale-110 duration-200 transition-transform"
                      />
                      <span className="sr-only">Search</span>
                    </NavLink>
                  </>
                )}

                <div className="flex items-center space-x-2">
                  {user ? (
                    <UserProfileDropdown />
                  ) : (
                    <>
                      <Button
                        variant="ghost"
                        asChild
                        className="hidden md:block text-pink-600 text-lg hover:text-pink-800 hover:bg-transparent"
                      >
                        <NavLink to="/auth">Login</NavLink>
                      </Button>
                      <Button
                        asChild
                        className="hidden md:block rounded-full border border-fuchsia-950 hover:scale-105 duration-300 transition-transform text-lg bg-transparent text-pink-600 hover:bg-transparent hover:text-pink-800"
                      >
                        <NavLink to="/auth">Join Now</NavLink>
                      </Button>
                      {/* Mobile auth buttons */}
                      <div className="md:hidden flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          asChild
                          className="text-pink-600 text-sm hover:text-pink-800 hover:bg-transparent px-2"
                        >
                          <NavLink to="/auth">Login</NavLink>
                        </Button>
                        <Button
                          asChild
                          className="rounded-full border border-fuchsia-950 hover:scale-105 duration-300 transition-transform text-sm bg-transparent text-pink-600 hover:bg-transparent hover:text-pink-800 px-3"
                        >
                          <NavLink to="/auth">Join</NavLink>
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Tabs - Fixed at bottom on mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-pink-200">
        <div className="flex items-center justify-around py-2">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center py-2 px-3 text-xs text-pink-600 transition-colors hover:text-pink-800",
                  isActive && "text-pink-800 font-semibold"
                )
              }
            >
              <span className="text-center">{link.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  );
}
