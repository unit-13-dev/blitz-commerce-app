export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          role: 'user' | 'vendor' | 'admin'
          avatar_url: string | null
          bio: string | null
          website: string | null
          location: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          role?: 'user' | 'vendor' | 'admin'
          avatar_url?: string | null
          bio?: string | null
          website?: string | null
          location?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          role?: 'user' | 'vendor' | 'admin'
          avatar_url?: string | null
          bio?: string | null
          website?: string | null
          location?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      products: {
        Row: {
          id: string
          vendor_id: string
          name: string
          description: string | null
          price: number
          image_url: string | null
          category: string | null
          stock_quantity: number
          is_active: boolean
          group_order_enabled: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          vendor_id: string
          name: string
          description?: string | null
          price: number
          image_url?: string | null
          category?: string | null
          stock_quantity?: number
          is_active?: boolean
          group_order_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          vendor_id?: string
          name?: string
          description?: string | null
          price?: number
          image_url?: string | null
          category?: string | null
          stock_quantity?: number
          is_active?: boolean
          group_order_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      product_images: {
        Row: {
          id: string
          product_id: string
          image_url: string
          display_order: number
          is_primary: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_id: string
          image_url: string
          display_order?: number
          is_primary?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          image_url?: string
          display_order?: number
          is_primary?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      post_images: {
        Row: {
          id: string
          post_id: string
          image_url: string
          display_order: number
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          image_url: string
          display_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          image_url?: string
          display_order?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_images_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          }
        ]
      }
      groups: {
        Row: {
          id: string
          creator_id: string
          product_id: string
          name: string
          description: string | null
          is_private: boolean
          member_limit: number
          access_code: string | null
          code_generated_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          creator_id: string
          product_id: string
          name: string
          description?: string | null
          is_private?: boolean
          member_limit?: number
          access_code?: string | null
          code_generated_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          creator_id?: string
          product_id?: string
          name?: string
          description?: string | null
          is_private?: boolean
          member_limit?: number
          access_code?: string | null
          code_generated_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      group_members: {
        Row: {
          id: string
          group_id: string
          user_id: string
          joined_at: string
        }
        Insert: {
          id?: string
          group_id: string
          user_id: string
          joined_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          user_id?: string
          joined_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      product_discount_tiers: {
        Row: {
          id: string
          product_id: string
          tier_number: number
          members_required: number
          discount_percentage: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_id: string
          tier_number: number
          members_required: number
          discount_percentage: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          tier_number?: number
          members_required?: number
          discount_percentage?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_discount_tiers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      cart_items: {
        Row: {
          id: string
          user_id: string
          product_id: string
          quantity: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          product_id: string
          quantity?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          product_id?: string
          quantity?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      wishlist: {
        Row: {
          id: string
          user_id: string
          product_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          product_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          product_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlist_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      user_addresses: {
        Row: {
          id: string
          user_id: string
          address_type: 'home' | 'office' | 'other'
          full_name: string
          phone_number: string
          address_line1: string
          address_line2: string | null
          city: string
          state: string
          postal_code: string
          country: string
          is_default: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          address_type: 'home' | 'office' | 'other'
          full_name: string
          phone_number: string
          address_line1: string
          address_line2?: string | null
          city: string
          state: string
          postal_code: string
          country?: string
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          address_type?: 'home' | 'office' | 'other'
          full_name?: string
          phone_number?: string
          address_line1?: string
          address_line2?: string | null
          city?: string
          state?: string
          postal_code?: string
          country?: string
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_addresses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      orders: {
        Row: {
          id: string
          user_id: string
          order_number: string
          total_amount: number
          shipping_amount: number
          status: 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
          shipping_address_id: string | null
          shipping_address_text: string
          payment_method: string
          payment_status: 'pending' | 'paid' | 'failed'
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          order_number?: string
          total_amount: number
          shipping_amount?: number
          status?: 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
          shipping_address_id?: string | null
          shipping_address_text: string
          payment_method?: string
          payment_status?: 'pending' | 'paid' | 'failed'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          order_number?: string
          total_amount?: number
          shipping_amount?: number
          status?: 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
          shipping_address_id?: string | null
          shipping_address_text?: string
          payment_method?: string
          payment_status?: 'pending' | 'paid' | 'failed'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_shipping_address_id_fkey"
            columns: ["shipping_address_id"]
            isOneToOne: false
            referencedRelation: "user_addresses"
            referencedColumns: ["id"]
          }
        ]
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string
          product_name: string
          product_image_url: string | null
          quantity: number
          unit_price: number
          total_price: number
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          product_id: string
          product_name: string
          product_image_url?: string | null
          quantity: number
          unit_price: number
          total_price: number
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string
          product_name?: string
          product_image_url?: string | null
          quantity?: number
          unit_price?: number
          total_price?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      posts: {
        Row: {
          id: string
          user_id: string
          content: string
          privacy: 'public' | 'following' | 'draft'
          status: 'published' | 'draft'
          rating: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          content: string
          privacy?: 'public' | 'following' | 'draft'
          status?: 'published' | 'draft'
          rating?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          content?: string
          privacy?: 'public' | 'following' | 'draft'
          status?: 'published' | 'draft'
          rating?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      vendor_kyc: {
        Row: {
          id: string
          vendor_id: string
          business_name: string
          display_business_name: string | null
          business_type: string | null
          business_registration_number: string | null
          business_address: string | null
          contact_email: string | null
          contact_phone: string | null
          ho_address: string
          warehouse_address: string
          phone_number: string
          gst_number: string
          gst_url: string
          pan_number: string
          pan_url: string
          tan_number: string
          turnover_over_5cr: boolean
          status: 'pending' | 'approved' | 'rejected'
          rejection_reason: string | null
          submitted_at: string
          reviewed_at: string | null
          reviewed_by: string | null
          version: number
          is_active: boolean
          previous_kyc_id: string | null
          submission_count: number
        }
        Insert: {
          id?: string
          vendor_id: string
          business_name: string
          display_business_name?: string | null
          business_type?: string | null
          business_registration_number?: string | null
          business_address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          ho_address: string
          warehouse_address: string
          phone_number: string
          gst_number: string
          gst_url: string
          pan_number: string
          pan_url: string
          tan_number: string
          turnover_over_5cr: boolean
          status?: 'pending' | 'approved' | 'rejected'
          rejection_reason?: string | null
          submitted_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          version?: number
          is_active?: boolean
          previous_kyc_id?: string | null
          submission_count?: number
        }
        Update: {
          id?: string
          vendor_id?: string
          business_name?: string
          display_business_name?: string | null
          business_type?: string | null
          business_registration_number?: string | null
          business_address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          ho_address?: string
          warehouse_address?: string
          phone_number?: string
          gst_number?: string
          gst_url?: string
          pan_number?: string
          pan_url?: string
          tan_number?: string
          turnover_over_5cr?: boolean
          status?: 'pending' | 'approved' | 'rejected'
          rejection_reason?: string | null
          submitted_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          version?: number
          is_active?: boolean
          previous_kyc_id?: string | null
          submission_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "vendor_kyc_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      user_follows: {
        Row: {
          id: string
          follower_id: string
          following_id: string
          created_at: string
        }
        Insert: {
          id?: string
          follower_id: string
          following_id: string
          created_at?: string
        }
        Update: {
          id?: string
          follower_id?: string
          following_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      product_categories: {
        Row: {
          id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
        }
        Relationships: []
      }
      product_category_mappings: {
        Row: {
          id: string
          product_id: string
          category_id: string
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          category_id: string
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          category_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_category_mappings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_category_mappings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          }
        ]
      }
      post_tags: {
        Row: {
          id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
        }
        Relationships: []
      }
      post_tag_mappings: {
        Row: {
          id: string
          post_id: string
          tag_id: string
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          tag_id: string
          created_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          tag_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_tag_mappings_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_tag_mappings_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "post_tags"
            referencedColumns: ["id"]
          }
        ]
      }
      drafts: {
        Row: {
          id: string
          user_id: string
          content: string | null
          feeling: string | null
          privacy: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          content?: string | null
          feeling?: string | null
          privacy?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          content?: string | null
          feeling?: string | null
          privacy?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "drafts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      post_likes: {
        Row: {
          id: string
          post_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          user_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      post_tagged_products: {
        Row: {
          id: string
          post_id: string
          product_id: string
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          product_id: string
          created_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          product_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_tagged_products_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_tagged_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_active_kyc: {
        Args: {
          vendor_uuid: string
        }
        Returns: {
          id: string
          vendor_id: string
          business_name: string
          ho_address: string
          warehouse_address: string
          phone_number: string
          gst_number: string
          gst_url: string
          pan_number: string
          pan_url: string
          tan_number: string
          turnover_over_5cr: boolean
          status: 'pending' | 'approved' | 'rejected'
          rejection_reason: string | null
          submitted_at: string
          reviewed_at: string | null
          reviewed_by: string | null
          version: number
          is_active: boolean
          previous_kyc_id: string | null
          submission_count: number
        }[]
      }
      create_kyc_version: {
        Args: {
          vendor_uuid: string
          business_name_param: string
          ho_address_param: string
          warehouse_address_param: string
          phone_number_param: string
          gst_number_param: string
          gst_url_param: string
          pan_number_param: string
          pan_url_param: string
          tan_number_param: string
          turnover_over_5cr_param: boolean
        }
        Returns: string
      }
      get_applicable_discount: {
        Args: {
          product_uuid: string
          member_count: number
        }
        Returns: number
      }
      get_user_role: {
        Args: {
          user_uuid: string
        }
        Returns: 'user' | 'vendor' | 'admin'
      }
      set_primary_product_image: {
        Args: {
          product_uuid: string
          image_uuid: string
        }
        Returns: undefined
      }
      update_updated_at_column: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      join_private_group_by_code: {
        Args: {
          access_code_param: string
          user_uuid: string
        }
        Returns: {
          success: boolean
          message: string
          group_id?: string
          group_name?: string
        }
      }
      get_product_average_rating: {
        Args: {
          product_uuid: string
        }
        Returns: number
      }
      get_product_review_count: {
        Args: {
          product_uuid: string
        }
        Returns: number
      }
      generate_order_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_follower_count: {
        Args: {
          user_uuid: string
        }
        Returns: number
      }
      get_following_count: {
        Args: {
          user_uuid: string
        }
        Returns: number
      }
      is_following: {
        Args: {
          follower_uuid: string
          following_uuid: string
        }
        Returns: boolean
      }
    }
    Enums: {
      kyc_status: 'pending' | 'approved' | 'rejected'
      post_type: 'text' | 'image' | 'product'
      user_role: 'user' | 'vendor' | 'admin'
    }
  }
}
