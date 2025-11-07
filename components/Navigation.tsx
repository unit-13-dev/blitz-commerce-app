'use client';

import { ChevronLeft, Home, User, ShoppingBag, Users, Settings } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const Navigation = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile } = useAuth();

  const navigationItems = [
    { path: "/feed", icon: Users, label: "Feed", auth: true },
    { path: "/products", icon: ShoppingBag, label: "Products" },
    { path: user ? `/users/${user.id}` : "/auth", icon: User, label: "Profile", auth: true },
  ];

  const filteredItems = navigationItems.filter(item => !item.auth || user);

  return (
    <div className="fixed bottom-0 left-0 mt-24 right-0 bg-white border-t border-pink-100 md:static md:border-t-0 md:bg-transparent">
      <div className="flex items-center justify-between p-4 max-w-7xl mx-auto">
        <div className="hidden md:flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
            className="flex items-center"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
        </div>

        <div className="flex items-center space-x-2 md:space-x-4 mx-auto md:mx-0">
          {filteredItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path;
            
            return (
              <Button
                key={item.path}
                variant={isActive ? "default" : "ghost"}
                size="sm"
                onClick={() => router.push(item.path)}
                className={`flex items-center space-x-1 md:space-x-2 ${
                  isActive ? "bg-pink-500 text-white" : "text-gray-600 hover:text-pink-500"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden md:inline text-sm">{item.label}</span>
              </Button>
            );
          })}
        </div>

        <div className="hidden md:block w-20"></div>
      </div>
    </div>
  );
};

export default Navigation;
