'use client';

import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Layout from "@/components/Layout";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { apiClient } from "@/lib/api-client";
import UserProfileHeader from "@/components/UserProfileHeader";
import SocialProfileTabs from "@/components/SocialProfileTabs";

export default function UserProfilePage() {
  const params = useParams();
  const userId = params.userId as string;
  const router = useRouter();
  const { user: currentUser } = useAuth();

  const { data: userData, isLoading } = useQuery({
    queryKey: ['user-profile', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required');
      const { data } = await apiClient.get(`/profiles/${userId}`);
      return data;
    },
    enabled: !!userId,
  });

  const profile = userData?.data?.profile;
  const isOwnProfile = currentUser?.id === userId;

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

  if (!profile) {
    return (
      <div className="min-h-screen">
        <Header />
        <Layout>
          <div className="text-center py-12">
            <p className="text-gray-600">User not found</p>
          </div>
        </Layout>
      </div>
    );
  }

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

          <UserProfileHeader 
            profileUserId={userId}
            profile={profile}
            isOwnProfile={isOwnProfile}
          />

          <SocialProfileTabs profileUserId={userId} isOwnProfile={isOwnProfile} />
        </div>
      </Layout>
      <Footer />
    </div>
  );
}

