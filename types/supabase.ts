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
      products: {
        Row: {
          id: string
          slug: string
          name: string
          description: string
          price: number
          original_price: number | null
          sku: string
          brand_id: string
          category_id: string
          images: string[]
          specifications: Json
          rating: number
          review_count: number
          stock: number
          is_featured: boolean
          is_deal: boolean
          deal_ends_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          name: string
          description: string
          price: number
          original_price?: number | null
          sku: string
          brand_id: string
          category_id: string
          images?: string[]
          specifications?: Json
          rating?: number
          review_count?: number
          stock?: number
          is_featured?: boolean
          is_deal?: boolean
          deal_ends_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          description?: string
          price?: number
          original_price?: number | null
          sku?: string
          brand_id?: string
          category_id?: string
          images?: string[]
          specifications?: Json
          rating?: number
          review_count?: number
          stock?: number
          is_featured?: boolean
          is_deal?: boolean
          deal_ends_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      product_variants: {
        Row: {
          id: string
          product_id: string
          name: string
          price: number
          original_price: number | null
          sku: string
          stock: number
          attributes: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_id: string
          name: string
          price: number
          original_price?: number | null
          sku: string
          stock?: number
          attributes?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          name?: string
          price?: number
          original_price?: number | null
          sku?: string
          stock?: number
          attributes?: Json
          created_at?: string
          updated_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          slug: string
          name: string
          description: string | null
          parent_id: string | null
          image: string | null
          product_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          name: string
          description?: string | null
          parent_id?: string | null
          image?: string | null
          product_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          description?: string | null
          parent_id?: string | null
          image?: string | null
          product_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      brands: {
        Row: {
          id: string
          slug: string
          name: string
          description: string | null
          logo: string | null
          product_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          name: string
          description?: string | null
          logo?: string | null
          product_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          description?: string | null
          logo?: string | null
          product_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          phone: string | null
          avatar_url: string | null
          email_verified: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          phone?: string | null
          avatar_url?: string | null
          email_verified?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          phone?: string | null
          avatar_url?: string | null
          email_verified?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          order_number: string
          user_id: string
          items: Json
          subtotal: number
          shipping: number
          tax: number
          total: number
          status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
          shipping_address: Json
          billing_address: Json | null
          payment_method: string
          payment_status: 'pending' | 'paid' | 'failed'
          mpesa_receipt: string | null
          created_at: string
          updated_at: string
          estimated_delivery: string | null
        }
        Insert: {
          id?: string
          order_number: string
          user_id: string
          items: Json
          subtotal: number
          shipping: number
          tax: number
          total: number
          status?: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
          shipping_address: Json
          billing_address?: Json | null
          payment_method: string
          payment_status?: 'pending' | 'paid' | 'failed'
          mpesa_receipt?: string | null
          created_at?: string
          updated_at?: string
          estimated_delivery?: string | null
        }
        Update: {
          id?: string
          order_number?: string
          user_id?: string
          items?: Json
          subtotal?: number
          shipping?: number
          tax?: number
          total?: number
          status?: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
          shipping_address?: Json
          billing_address?: Json | null
          payment_method?: string
          payment_status?: 'pending' | 'paid' | 'failed'
          mpesa_receipt?: string | null
          created_at?: string
          updated_at?: string
          estimated_delivery?: string | null
        }
      }
      reviews: {
        Row: {
          id: string
          product_id: string
          user_id: string
          rating: number
          title: string | null
          comment: string
          images: string[]
          is_verified: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_id: string
          user_id: string
          rating: number
          title?: string | null
          comment: string
          images?: string[]
          is_verified?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          user_id?: string
          rating?: number
          title?: string | null
          comment?: string
          images?: string[]
          is_verified?: boolean
          created_at?: string
          updated_at?: string
        }
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
      }
      user_addresses: {
        Row: {
          id: string
          user_id: string
          name: string
          phone: string
          street: string
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
          name: string
          phone: string
          street: string
          city: string
          state: string
          postal_code: string
          country: string
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          phone?: string
          street?: string
          city?: string
          state?: string
          postal_code?: string
          country?: string
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
      }



	  // New tables for loading system
      category_filters: {
        Row: {
          id: string
          category_id: string
          filter_type: string
          filter_values: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          category_id: string
          filter_type: string
          filter_values?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          category_id?: string
          filter_type?: string
          filter_values?: Json
          created_at?: string
          updated_at?: string
        }
      }
      
      search_suggestions: {
        Row: {
          id: string
          suggestion: string
          search_count: number
          last_searched: string
          created_at: string
        }
        Insert: {
          id?: string
          suggestion: string
          search_count?: number
          last_searched?: string
          created_at?: string
        }
        Update: {
          id?: string
          suggestion?: string
          search_count?: number
          last_searched?: string
          created_at?: string
        }
      }
      
      search_filters: {
        Row: {
          id: string
          filter_type: string
          filter_values: Json
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          filter_type: string
          filter_values?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          filter_type?: string
          filter_values?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      
      shipping_options: {
        Row: {
          id: string
          name: string
          description: string | null
          price: number
          min_order_amount: number
          max_order_amount: number | null
          estimated_days: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          price: number
          min_order_amount?: number
          max_order_amount?: number | null
          estimated_days: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          price?: number
          min_order_amount?: number
          max_order_amount?: number | null
          estimated_days?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      
      shipping_countries: {
        Row: {
          id: string
          country_code: string
          country_name: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          country_code: string
          country_name: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          country_code?: string
          country_name?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      
      user_payment_methods: {
        Row: {
          id: string
          user_id: string
          type: 'card' | 'mpesa' | 'paypal'
          provider: string
          last_four: string | null
          expiry_month: number | null
          expiry_year: number | null
          is_default: boolean
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: 'card' | 'mpesa' | 'paypal'
          provider: string
          last_four?: string | null
          expiry_month?: number | null
          expiry_year?: number | null
          is_default?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: 'card' | 'mpesa' | 'paypal'
          provider?: string
          last_four?: string | null
          expiry_month?: number | null
          expiry_year?: number | null
          is_default?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      
      coupons: {
        Row: {
          id: string
          code: string
          discount_type: 'percentage' | 'fixed'
          discount_value: number
          min_purchase: number
          max_discount: number | null
          usage_limit: number | null
          used_count: number
          is_active: boolean
          starts_at: string | null
          expires_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          code: string
          discount_type: 'percentage' | 'fixed'
          discount_value: number
          min_purchase?: number
          max_discount?: number | null
          usage_limit?: number | null
          used_count?: number
          is_active?: boolean
          starts_at?: string | null
          expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          code?: string
          discount_type?: 'percentage' | 'fixed'
          discount_value?: number
          min_purchase?: number
          max_discount?: number | null
          usage_limit?: number | null
          used_count?: number
          is_active?: boolean
          starts_at?: string | null
          expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      
      user_wardrobe: {
        Row: {
          id: string
          user_id: string
          product_id: string
          outfit_name: string | null
          occasion: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          product_id: string
          outfit_name?: string | null
          occasion?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          product_id?: string
          outfit_name?: string | null
          occasion?: string | null
          created_at?: string
        }
      }
      
      collection_products: {
        Row: {
          id: string
          collection_id: string
          product_id: string
          position: number
          created_at: string
        }
        Insert: {
          id?: string
          collection_id: string
          product_id: string
          position?: number
          created_at?: string
        }
        Update: {
          id?: string
          collection_id?: string
          product_id?: string
          position?: number
          created_at?: string
        }
      }
      
      user_roles: {
        Row: {
          id: string
          user_id: string
          role: 'customer' | 'vendor' | 'admin' | 'super_admin'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role?: 'customer' | 'vendor' | 'admin' | 'super_admin'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          role?: 'customer' | 'vendor' | 'admin' | 'super_admin'
          created_at?: string
          updated_at?: string
        }
      }
    }



    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      search_products: {
        Args: {
          search_term: string
          min_price?: number
          max_price?: number
          category_ids?: string[]
          brand_ids?: string[]
          sort_by?: string
          page?: number
          page_size?: number
        }
        Returns: {
          id: string
          slug: string
          name: string
          price: number
          original_price: number
          images: string[]
          rating: number
          review_count: number
          brand_name: string
          category_name: string
        }[]
      }
      update_product_rating: {
        Args: {
          product_id: string
        }
        Returns: void
      }
    }



	get_product_load_stats: {
        Args: {
          product_slug: string
        }
        Returns: {
          product_id: string
          variants_count: number
          reviews_count: number
          related_count: number
          stock_status: string
        }[]
      }
      
      get_category_load_stats: {
        Args: {
          category_slug: string
        }
        Returns: {
          category_id: string
          products_count: number
          filters_count: number
          subcategories_count: number
          avg_price: number
        }[]
      }
      
      get_cart_load_stats: {
        Args: {
          user_id: string
        }
        Returns: {
          items_count: number
          total_value: number
          coupons_available: number
          out_of_stock_count: number
        }[]
      }
    }
    


    Enums: {
      [_ in never]: never
    }
  }
}
