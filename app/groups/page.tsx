'use client';

import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Users } from "lucide-react";
import Layout from "@/components/Layout";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ProtectedRoute } from "@/lib/auth-utils";
import { apiClient } from "@/lib/api-client";
import { useState } from "react";
import CreateGroupModal from "@/components/CreateGroupModal";

export default function GroupsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: groupsData, isLoading } = useQuery({
    queryKey: ['groups', searchTerm],
    queryFn: async () => {
      const { data } = await apiClient.get('/groups');
      return data;
    },
  });

  const groups = groupsData?.groups || [];

  const filteredGroups = groups.filter((group: any) => 
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <ProtectedRoute>
      <div className="min-h-screen">
        <Header />
        <Layout>
          <div className="max-w-7xl mx-auto px-4 py-8 mt-20">
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-3xl font-bold">Groups</h1>
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Group
              </Button>
            </div>

            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search groups..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading groups...</p>
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-24 h-24 text-gray-300 mx-auto mb-4" />
                <p className="text-xl text-gray-600 mb-4">No groups found</p>
                <Button onClick={() => setShowCreateModal(true)}>
                  Create First Group
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredGroups.map((group: any) => (
                  <div
                    key={group.id}
                    className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => router.push(`/groups/${group.id}`)}
                  >
                    <h3 className="text-xl font-semibold mb-2">{group.name}</h3>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {group.description}
                    </p>
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>{group._count?.members || 0} members</span>
                      <span>{group.isPrivate ? 'Private' : 'Public'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Layout>
        <Footer />

        {showCreateModal && (
          <CreateGroupModal
            isOpen={showCreateModal}
            onOpenChange={setShowCreateModal}
            onSuccess={() => {
              setShowCreateModal(false);
              // Invalidate groups query
            }}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}

