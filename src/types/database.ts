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

    Enums: {
      [_ in never]: never
    }
  }
}
