'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, ShoppingCart } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import UserProfileDropdown from "@/components/UserProfileDropdown";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";

const navLinks = [
  { href: "/feed", label: "Feed" },
  { href: "/products", label: "Products" },
];

export default function Header() {
  const pathname = usePathname();
  const { toast } = useToast();
  const { user, profile, signOut } = useAuth();
  const [scrolled, setScrolled] = useState<boolean>(false);

  const isVendor = profile?.role === 'vendor';

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const { data: cartCount } = useQuery<number>({
    queryKey: ["cart-count", user?.id],
    queryFn: async () => {
      if (!user || isVendor) return 0;
      const response = await fetch('/api/cart');
      if (!response.ok) return 0;
      const data = await response.json();
      return data.items?.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) || 0;
    },
    enabled: !!user && !isVendor,
  });

  const { data: wishlistCount } = useQuery<number>({
    queryKey: ["wishlist-count", user?.id],
    queryFn: async () => {
      if (!user || isVendor) return 0;
      const response = await fetch('/api/wishlist');
      if (!response.ok) return 0;
      const data = await response.json();
      return data.items?.length || 0;
    },
    enabled: !!user && !isVendor,
  });

  return (
    <>
      <header className="fixed top-0 left-0  right-0 z-50 transition-all duration-500 ease-in">
        <div
          className={cn(
            "transition-all duration-500 ease-out mx-auto",
            scrolled
              ? "mt-6 max-w-6xl bg-white/10 backdrop-blur-2xl rounded-lg shadow-2xl shadow-black/50"
              : "max-w-6xl bg-transparent mt-4"
          )}
        >
          <div className="container bg-white/90 mx-auto py-1 px-4 sm:px-6 lg:px-8 rounded-lg">
            <div className="flex items-center justify-between h-16">
              <Link href="/" className="flex items-center justify-center">
                <img 
                  src="/GupShop.png" 
                  alt="Gup Shop Logo" 
                  className="h-16 object-conta in"
                />
              </Link>

              <nav className="hidden md:flex items-center space-x-8">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "text-lg text-pink-600 transition-colors hover:text-pink-800",
                      pathname === link.href && "text-pink-800 font-semibold"
                    )}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>

              <div className="flex items-center space-x-4 md:space-x-6">
                {user && (
                  <>
                    {!isVendor && (
                      <>
                        <Link
                          href="/wishlist"
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
                        </Link>
                        <Link
                          href="/cart"
                          className="relative text-pink-600 hover:text-pink-800"
                        >
                          <ShoppingCart size={22} />
                          {cartCount != null && cartCount > 0 && (
                            <span className="absolute -top-2 -right-2 bg-pink-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                              {cartCount}
                            </span>
                          )}
                          <span className="sr-only">Cart</span>
                        </Link>
                      </>
                    )}

                    <Link
                      href="/search"
                      className="relative text-pink-600 hover:text-pink-800 group"
                    >
                      <Search
                        size={20}
                        className="hover:scale-110 duration-200 transition-transform"
                      />
                      <span className="sr-only">Search</span>
                    </Link>
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
                        <Link href="/auth">Login</Link>
                      </Button>
                      <Button
                        asChild
                        className="hidden md:block rounded-full border border-fuchsia-950 hover:scale-105 duration-300 transition-transform text-lg bg-transparent text-pink-600 hover:bg-transparent hover:text-pink-800"
                      >
                        <Link href="/auth">Join Now</Link>
                      </Button>
                      <div className="md:hidden flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          asChild
                          className="text-pink-600 text-sm hover:text-pink-800 hover:bg-transparent px-2"
                        >
                          <Link href="/auth">Login</Link>
                        </Button>
                        <Button
                          asChild
                          className="rounded-full border border-fuchsia-950 hover:scale-105 duration-300 transition-transform text-sm bg-transparent text-pink-600 hover:bg-transparent hover:text-pink-800 px-3"
                        >
                          <Link href="/auth">Join</Link>
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

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-pink-200">
        <div className="flex items-center justify-around py-2">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex flex-col items-center py-2 px-3 text-xs text-pink-600 transition-colors hover:text-pink-800",
                pathname === link.href && "text-pink-800 font-semibold"
              )}
            >
              <span className="text-center">{link.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
