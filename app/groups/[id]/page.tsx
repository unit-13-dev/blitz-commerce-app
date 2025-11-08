'use client';

import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Users, Package, ArrowLeft } from "lucide-react";
import Layout from "@/components/Layout";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { apiClient } from "@/lib/api-client";

export default function GroupDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: groupData, isLoading } = useQuery({
    queryKey: ['group', id],
    queryFn: async () => {
      if (!id) throw new Error('Group ID is required');
      const response = await apiClient.get(`/groups/${id}`);
      return response.data;
    },
    enabled: !!id,
  });

  const group = groupData?.data?.group;
  const isMember = group?.members?.some((m: any) => m.userId === user?.id);

  const joinMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post(`/groups/${id}/join`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', id] });
    },
  });

  const leaveMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post(`/groups/${id}/leave`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', id] });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Header />
        <Layout>
          <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
          </div>
        </Layout>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen">
        <Header />
        <Layout>
          <div className="text-center py-12">
            <p className="text-gray-600">Group not found</p>
          </div>
        </Layout>
      </div>
    );
  }

  return (
      <div className="min-h-screen">
        <Header />
        <Layout>
          <div className="max-w-4xl mx-auto px-4 py-8 mt-20">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="mb-6 flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>

            <div className="bg-white p-6 rounded-lg shadow-md mb-6">
              <h1 className="text-3xl font-bold mb-4">{group.name}</h1>
              <p className="text-gray-600 mb-4">{group.description}</p>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-gray-500" />
                    <span>{group._count?.members || 0} members</span>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    group.isPrivate ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {group.isPrivate ? 'Private' : 'Public'}
                  </span>
                </div>

                {!isMember ? (
                  <Button onClick={() => joinMutation.mutate()}>
                    Join Group
                  </Button>
                ) : (
                  <Button variant="outline" onClick={() => leaveMutation.mutate()}>
                    Leave Group
                  </Button>
                )}
              </div>
            </div>

            {group.product && (
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Group Product
                </h2>
                <div className="flex items-center gap-4">
                  <img
                    src={group.product.images?.[0]?.imageUrl || "/placeholder.svg"}
                    alt={group.product.name}
                    className="w-24 h-24 object-cover rounded"
                  />
                  <div>
                    <h3 className="font-semibold">{group.product.name}</h3>
                    <p className="text-pink-600 font-bold">₹{group.product.price}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/products/${group.product.id}`)}
                    >
                      View Product
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Layout>
        <Footer />
      </div>
  );
}

