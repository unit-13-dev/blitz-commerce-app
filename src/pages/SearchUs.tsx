import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/useDebounce";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Search,
  Users,
  Package,
  User,
  Heart,
  ShoppingCart,
  TrendingUp,
  Clock,
  CheckCircle,
} from "lucide-react";

import type { Database } from "@/integrations/supabase/types";
import Header from "@/components/Header";
import { getProductImages } from "@/lib/utils";

type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
type TableNames = keyof Database["public"]["Tables"];

// Shared utility to wrap full-text search
export const fullTextSearch = <T extends TableNames>(
  table: T,
  vectorColumn: string,
  search: string
) =>
  supabase.from(table).select("*").textSearch(vectorColumn, search, {
    type: "websearch",
  });

export const searchUsers = async (
  query: string
): Promise<(Tables<"profiles"> & { kyc_status?: string })[]> => {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .textSearch("full_name", query, { type: "websearch" });

  if (error) throw error;
  
  // For each user, check if they're a vendor and get their KYC status
  const usersWithKYC = await Promise.all(
    (data || []).map(async (user) => {
      if (user.role === "vendor") {
        const { data: kycData } = await supabase
          .from("vendor_kyc")
          .select("status")
          .eq("vendor_id", user.id)
          .eq("is_active", true)
          .single();
        
        return {
          ...user,
          kyc_status: kycData?.status
        };
      }
      return user;
    })
  );
  
  return usersWithKYC;
};

export const searchProducts = async (
  query: string
): Promise<Tables<"products">[]> => {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .textSearch("name", query, { type: "websearch" });

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
};

export const searchGroups = async (
  query: string
): Promise<Tables<"groups">[]> => {
  const { data, error } = await supabase
    .from("groups")
    .select("*")
    .textSearch("name", query, { type: "websearch" });

  if (error) throw error;
  return data || [];
};

// Floating Search Filter Component
function FloatingSearchFilter({
  activeFilter,
  onFilterChange,
}: {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
}) {
  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-white/90 backdrop-blur-xl border border-gray-200 rounded-full shadow-xl p-2 flex items-center space-x-2">
        <Button
          size="sm"
          variant={activeFilter === "all" ? "default" : "ghost"}
          onClick={() => onFilterChange("all")}
          className={`rounded-full px-4 py-2 text-sm transition-all duration-300 ease-in-out ${
            activeFilter === "all"
              ? "bg-primary text-white"
              : "text-gray-600 hover:text-primary hover:bg-primary/10"
          }`}
        >
          All
        </Button>
        <Button
          size="sm"
          variant={activeFilter === "users" ? "default" : "ghost"}
          onClick={() => onFilterChange("users")}
          className={`rounded-full px-4 py-2 text-sm transition-all duration-300 ease-in-out ${
            activeFilter === "users"
              ? "bg-primary text-white"
              : "text-gray-600 hover:text-primary hover:bg-primary/10"
          }`}
        >
          <User className="h-4 w-4 mr-1" />
          People
        </Button>
        <Button
          size="sm"
          variant={activeFilter === "groups" ? "default" : "ghost"}
          onClick={() => onFilterChange("groups")}
          className={`rounded-full px-4 py-2 text-sm transition-all duration-300 ease-in-out ${
            activeFilter === "groups"
              ? "bg-primary text-white"
              : "text-gray-600 hover:text-primary hover:bg-primary/10"
          }`}
        >
          <Users className="h-4 w-4 mr-1" />
          Groups
        </Button>
        <Button
          size="sm"
          variant={activeFilter === "products" ? "default" : "ghost"}
          onClick={() => onFilterChange("products")}
          className={`rounded-full px-4 py-2 text-sm transition-all duration-300 ease-in-out ${
            activeFilter === "products"
              ? "bg-primary text-white"
              : "text-gray-600 hover:text-primary hover:bg-primary/10"
          }`}
        >
          <Package className="h-4 w-4 mr-1" />
          Products
        </Button>
      </div>
    </div>
  );
}

export default function SearchUs() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const navigate = useNavigate();
  const { toast } = useToast();
  const debouncedQuery = useDebounce(searchQuery, 100);
  const enabled = debouncedQuery.length > 1;

  // React Query hooks for search
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["search-users", debouncedQuery],
    queryFn: () => searchUsers(debouncedQuery),
    enabled,
  });

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["search-products", debouncedQuery],
    queryFn: () => searchProducts(debouncedQuery),
    enabled,
  });

  const { data: groups = [], isLoading: groupsLoading } = useQuery({
    queryKey: ["search-groups", debouncedQuery],
    queryFn: () => searchGroups(debouncedQuery),
    enabled,
  });

  const isLoading = usersLoading || productsLoading || groupsLoading;

  const trendingSearches = [
    "Coffee",
    "Electronics",
    "Fashion",
    "Food",
    "Books",
    "Fitness",
  ];

  const categories = [
    { name: "Food & Drinks", icon: "🍕", count: "120+ groups" },
    { name: "Electronics", icon: "📱", count: "85+ groups" },
    { name: "Fashion", icon: "👗", count: "95+ groups" },
    { name: "Books", icon: "📚", count: "45+ groups" },
  ];

  // Handle navigation to different pages
  const handleUserClick = (userId: string) => {
    navigate(`/users/${userId}`);
  };

  const handleGroupClick = (groupId: string) => {
    navigate(`/groups/${groupId}`);
  };

  const handleProductClick = (productId: string) => {
    navigate(`/products/${productId}`);
  };

  return (
    <div className="min-h-screen bg-white pb-20">
      <Header />

      <div className="relative top-20 mb-20 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-200">
        <div className="flex items-center space-x-4 px-4 py-3 max-w-2xl mx-auto">
          <Link
            to="/"
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-700" />
          </Link>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              placeholder="Search people, groups, products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-gray-100 border-0 rounded-full focus:bg-white focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Loading State */}
        {isLoading && searchQuery.length > 1 && (
          <div className="text-center py-8">
            <p className="text-sm text-gray-600">
              Searching<span className="animate-pulse">...</span>
            </p>
          </div>
        )}

        {/* Search Results */}
        {searchQuery && !isLoading ? (
          <div className="space-y-6">
            {/* Users Results */}
            {(activeFilter === "all" || activeFilter === "users") &&
              users.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <User className="h-5 w-5 mr-2 text-primary" />
                    People
                  </h2>
                  <div className="space-y-3">
                    {users.map((user) => (
                      <Card
                        key={user.id}
                        className="hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => handleUserClick(user.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center space-x-4">
                            <div className="relative">
                              <img
                                src={user.avatar_url || "/placeholder.svg"}
                                alt={user.full_name || "User"}
                                className="w-12 h-12 rounded-full object-cover"
                              />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-gray-900">
                                  {user.full_name}
                                </h3>
                                {user.role === "vendor" && user.kyc_status === "approved" && (
                                  <div className="flex items-center">
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                    <span className="text-xs text-green-600 ml-1 font-medium">Verified</span>
                                  </div>
                                )}
                              </div>
                              <p className="text-gray-600">{user.email}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

            {/* Groups Results */}
            {(activeFilter === "all" || activeFilter === "groups") &&
              groups.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Users className="h-5 w-5 mr-2 text-primary" />
                    Groups
                  </h2>
                  <div className="space-y-3">
                    {groups.slice(0, 5).map((group) => (
                      <Card
                        key={group.id}
                        className="hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => handleGroupClick(group.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center space-x-4">
                            <img
                              src={group.image_url || "/placeholder.svg"}
                              alt={group.name}
                              className="w-12 h-12 rounded-lg object-cover"
                            />
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900">
                                {group.name}
                              </h3>
                              <p className="text-sm text-gray-600">
                                {group.description}
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="bg-transparent"
                              onClick={(e) => {
                                e.stopPropagation();
                                // Add join group functionality here if needed
                              }}
                            >
                              Join
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

            {/* Products Results */}
            {(activeFilter === "all" || activeFilter === "products") &&
              products.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Package className="h-5 w-5 mr-2 text-primary" />
                    Products
                  </h2>
                  <div className="grid grid-cols-2 gap-4">
                    {products.slice(0, 6).map((product) => (
                      <Card
                        key={product.id}
                        className="hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => handleProductClick(product.id)}
                      >
                        <div className="aspect-square relative">
                          <img
                            src={product.image_url || "/placeholder.svg"}
                            alt={product.name}
                            className="w-full h-full object-cover rounded-t-lg"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2 bg-white/80 backdrop-blur-sm hover:bg-white rounded-full"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Add wishlist functionality here if needed
                            }}
                          >
                            <Heart className="h-4 w-4 text-gray-600" />
                          </Button>
                        </div>
                        <CardContent className="p-3">
                          <h3 className="font-semibold text-gray-900 text-sm line-clamp-1">
                            {product.name}
                          </h3>
                          <p className="text-xs text-gray-600 line-clamp-1">
                            {product.description}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-sm font-bold text-gray-900">
                              ₹{product.price}
                            </span>
                          </div>
                          <Button
                            size="sm"
                            className="w-full mt-2 bg-primary hover:bg-primary/90 text-white text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Add to cart functionality here if needed
                            }}
                          >
                            <ShoppingCart className="h-3 w-3 mr-1" />
                            Add to Cart
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

            {/* No Results */}
            {users.length === 0 &&
              products.length === 0 &&
              groups.length === 0 &&
              searchQuery.length > 1 &&
              !isLoading && (
                <div className="text-center py-8">
                  <p className="text-gray-500 font-bold">No results found :(</p>
                </div>
              )}
          </div>
        ) : (
          /* Default Search Screen */
          <div className="space-y-8">
            {/* Trending Searches */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-primary" />
                Trending Searches
              </h2>
              <div className="flex flex-wrap gap-2">
                {trendingSearches.map((term) => (
                  <Button
                    key={term}
                    variant="outline"
                    size="sm"
                    onClick={() => setSearchQuery(term)}
                    className="rounded-full bg-gray-50 hover:bg-primary/10 hover:text-primary hover:border-primary"
                  >
                    {term}
                  </Button>
                ))}
              </div>
            </div>

            {/* Recent Searches */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Clock className="h-5 w-5 mr-2 text-primary" />
                Recent Searches
              </h2>
              <div className="space-y-3">
                {["Coffee Lovers", "Electronics Deal", "Fashion Group"].map(
                  (search, index) => (
                    <div
                      key={index}
                      className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer"
                      onClick={() => setSearchQuery(search)}
                    >
                      <Search className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-700">{search}</span>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Popular Categories */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Popular Categories
              </h2>
              <div className="grid grid-cols-2 gap-4">
                {categories.map((category) => (
                  <Card
                    key={category.name}
                    className="hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl mb-2">{category.icon}</div>
                      <h3 className="font-semibold text-gray-900 text-sm">
                        {category.name}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {category.count}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Search Filter */}
      <FloatingSearchFilter
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
      />
    </div>
  );
}
