'use client';

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Search as SearchIcon, Users, Package, FileText, User } from "lucide-react";
import Layout from "@/components/Layout";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { apiClient } from "@/lib/api-client";
import Link from "next/link";

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [activeFilter, setActiveFilter] = useState("all");

  const { data: searchResults, isLoading } = useQuery({
    queryKey: ["search", query, activeFilter],
    queryFn: async () => {
      if (!query.trim()) return { results: { products: [], users: [], posts: [] } };
      const { data } = await apiClient.get("/search", {
        params: { q: query, type: activeFilter },
      });
      return data;
    },
    enabled: query.trim().length > 0,
  });

  const results = searchResults?.results || { products: [], users: [], posts: [] };

  return (
    <div className="min-h-screen">
      <Header />
      <Layout>
        <div className="max-w-6xl mx-auto px-4 py-8 mt-20">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-6 flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>

          <div className="mb-8">
            <div className="relative">
              <SearchIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search for products, users, or posts..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-12 pr-4 py-6 text-lg"
              />
            </div>

            <div className="flex gap-2 mt-4">
              <Button
                variant={activeFilter === "all" ? "default" : "outline"}
                onClick={() => setActiveFilter("all")}
                size="sm"
              >
                All
              </Button>
              <Button
                variant={activeFilter === "products" ? "default" : "outline"}
                onClick={() => setActiveFilter("products")}
                size="sm"
              >
                <Package className="w-4 h-4 mr-2" />
                Products
              </Button>
              <Button
                variant={activeFilter === "users" ? "default" : "outline"}
                onClick={() => setActiveFilter("users")}
                size="sm"
              >
                <Users className="w-4 h-4 mr-2" />
                Users
              </Button>
              <Button
                variant={activeFilter === "posts" ? "default" : "outline"}
                onClick={() => setActiveFilter("posts")}
                size="sm"
              >
                <FileText className="w-4 h-4 mr-2" />
                Posts
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto"></div>
              <p className="mt-4 text-gray-600">Searching...</p>
            </div>
          ) : query.trim() === "" ? (
            <div className="text-center py-12">
              <p className="text-gray-600">Enter a search query to get started</p>
            </div>
          ) : (
            <div className="space-y-6">
              {activeFilter === "all" || activeFilter === "products" ? (
                results.products.length > 0 && (
                  <div>
                    <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                      <Package className="w-6 h-6" />
                      Products ({results.products.length})
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {results.products.map((product: any) => (
                        <Card
                          key={product.id}
                          className="cursor-pointer hover:shadow-lg transition-shadow"
                          onClick={() => router.push(`/products/${product.id}`)}
                        >
                          <CardContent className="p-4">
                            <img
                              src={product.image_url || "/placeholder.svg"}
                              alt={product.name}
                              className="w-full h-48 object-cover rounded mb-4"
                            />
                            <h3 className="font-semibold text-lg mb-2">{product.name}</h3>
                            <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                              {product.description}
                            </p>
                            <p className="text-pink-600 font-bold">₹{product.price}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )
              ) : null}

              {activeFilter === "all" || activeFilter === "users" ? (
                results.users.length > 0 && (
                  <div>
                    <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                      <Users className="w-6 h-6" />
                      Users ({results.users.length})
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {results.users.map((user: any) => (
                        <Card
                          key={user.id}
                          className="cursor-pointer hover:shadow-lg transition-shadow"
                          onClick={() => router.push(`/users/${user.id}`)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center gap-4">
                              <img
                                src={user.avatarUrl || "/placeholder.svg"}
                                alt={user.fullName || user.email}
                                className="w-16 h-16 rounded-full object-cover"
                              />
                              <div>
                                <h3 className="font-semibold">{user.fullName || user.email}</h3>
                                <p className="text-gray-600 text-sm">{user.email}</p>
                                <p className="text-pink-600 text-sm capitalize">{user.role}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )
              ) : null}

              {activeFilter === "all" || activeFilter === "posts" ? (
                results.posts.length > 0 && (
                  <div>
                    <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                      <FileText className="w-6 h-6" />
                      Posts ({results.posts.length})
                    </h2>
                    <div className="space-y-4">
                      {results.posts.map((post: any) => (
                        <Card
                          key={post.id}
                          className="cursor-pointer hover:shadow-lg transition-shadow"
                          onClick={() => router.push(`/feed`)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center gap-4 mb-4">
                              <img
                                src={post.user?.avatarUrl || "/placeholder.svg"}
                                alt={post.user?.fullName || post.user?.email}
                                className="w-12 h-12 rounded-full object-cover"
                              />
                              <div>
                                <p className="font-semibold">
                                  {post.user?.fullName || post.user?.email}
                                </p>
                                <p className="text-gray-600 text-sm">
                                  {new Date(post.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <p className="text-gray-700 mb-2 line-clamp-3">{post.content}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )
              ) : null}

              {!isLoading &&
                query.trim() !== "" &&
                results.products.length === 0 &&
                results.users.length === 0 &&
                results.posts.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-gray-600">No results found for "{query}"</p>
                  </div>
                )}
            </div>
          )}
        </div>
      </Layout>
      <Footer />
    </div>
  );
}

