export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          created_at: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id: string
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      campaign_photographers: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          campaign_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          photographer_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          campaign_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          photographer_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          campaign_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          photographer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_photographers_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_photographers_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "public_profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_photographers_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_revenue_distribution"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_photographers_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_revenue_split_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_photographers_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_photographers_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns_for_home"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_photographers_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns_percentage_diagnosis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_photographers_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_photographers_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          cover_image_url: string | null
          created_at: string
          description: string | null
          event_date: string | null
          id: string
          is_active: boolean
          is_featured: boolean | null
          location: string | null
          organization_id: string | null
          organization_percentage: number
          photographer_id: string | null
          photographer_percentage: number
          platform_percentage: number
          progressive_discount_enabled: boolean | null
          short_code: string | null
          title: string
          updated_at: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          event_date?: string | null
          id?: string
          is_active?: boolean
          is_featured?: boolean | null
          location?: string | null
          organization_id?: string | null
          organization_percentage?: number
          photographer_id?: string | null
          photographer_percentage?: number
          platform_percentage?: number
          progressive_discount_enabled?: boolean | null
          short_code?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          event_date?: string | null
          id?: string
          is_active?: boolean
          is_featured?: boolean | null
          location?: string | null
          organization_id?: string | null
          organization_percentage?: number
          photographer_id?: string | null
          photographer_percentage?: number
          platform_percentage?: number
          progressive_discount_enabled?: boolean | null
          short_code?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_uses: {
        Row: {
          coupon_id: string
          discount_amount: number
          final_amount: number
          id: string
          original_amount: number
          purchase_id: string | null
          used_at: string
          user_id: string
        }
        Insert: {
          coupon_id: string
          discount_amount: number
          final_amount: number
          id?: string
          original_amount: number
          purchase_id?: string | null
          used_at?: string
          user_id: string
        }
        Update: {
          coupon_id?: string
          discount_amount?: number
          final_amount?: number
          id?: string
          original_amount?: number
          purchase_id?: string | null
          used_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_uses_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupon_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_uses_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_uses_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_uses_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases_missing_revenue_shares"
            referencedColumns: ["purchase_id"]
          },
          {
            foreignKeyName: "coupon_uses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_uses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          current_uses: number
          description: string | null
          end_date: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          min_purchase_amount: number | null
          start_date: string
          type: string
          updated_at: string
          value: number
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          current_uses?: number
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_purchase_amount?: number | null
          start_date?: string
          type: string
          updated_at?: string
          value: number
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          current_uses?: number
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_purchase_amount?: number | null
          start_date?: string
          type?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "coupons_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupons_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "public_profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      event_applications: {
        Row: {
          applied_at: string
          campaign_id: string
          created_at: string
          id: string
          message: string | null
          photographer_id: string
          processed_at: string | null
          processed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          applied_at?: string
          campaign_id: string
          created_at?: string
          id?: string
          message?: string | null
          photographer_id: string
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          applied_at?: string
          campaign_id?: string
          created_at?: string
          id?: string
          message?: string | null
          photographer_id?: string
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      face_descriptor_backups: {
        Row: {
          backup_path: string
          created_at: string
          descriptor_count: number
          file_size: number
          id: string
          is_automatic: boolean
          metadata: Json | null
          restored_at: string | null
          user_id: string
        }
        Insert: {
          backup_path: string
          created_at?: string
          descriptor_count?: number
          file_size?: number
          id?: string
          is_automatic?: boolean
          metadata?: Json | null
          restored_at?: string | null
          user_id: string
        }
        Update: {
          backup_path?: string
          created_at?: string
          descriptor_count?: number
          file_size?: number
          id?: string
          is_automatic?: boolean
          metadata?: Json | null
          restored_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          photo_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          photo_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          photo_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "photos"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          metadata: Json | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          metadata?: Json | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          metadata?: Json | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          joined_at: string
          organization_id: string
          photographer_percentage: number
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          joined_at?: string
          organization_id: string
          photographer_percentage?: number
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          joined_at?: string
          organization_id?: string
          photographer_percentage?: number
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_payments: {
        Row: {
          amount: number
          created_at: string
          cycle_end: string
          cycle_start: string
          id: string
          notes: string | null
          organization_id: string
          paid_at: string | null
          paid_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          cycle_end: string
          cycle_start: string
          id?: string
          notes?: string | null
          organization_id: string
          paid_at?: string | null
          paid_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          cycle_end?: string
          cycle_start?: string
          id?: string
          notes?: string | null
          organization_id?: string
          paid_at?: string | null
          paid_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_payments_paid_by_fkey"
            columns: ["paid_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_payments_paid_by_fkey"
            columns: ["paid_by"]
            isOneToOne: false
            referencedRelation: "public_profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_users: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          admin_percentage: number
          created_at: string
          description: string | null
          id: string
          logo_url: string | null
          name: string
          primary_color: string | null
          updated_at: string
        }
        Insert: {
          admin_percentage?: number
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name: string
          primary_color?: string | null
          updated_at?: string
        }
        Update: {
          admin_percentage?: number
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          primary_color?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      payout_requests: {
        Row: {
          amount: number
          completed_at: string | null
          completed_by: string | null
          created_at: string
          id: string
          institution: string | null
          notes: string | null
          photographer_id: string
          pix_key: string | null
          processed_at: string | null
          processed_by: string | null
          recipient_name: string | null
          requested_at: string
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          institution?: string | null
          notes?: string | null
          photographer_id: string
          pix_key?: string | null
          processed_at?: string | null
          processed_by?: string | null
          recipient_name?: string | null
          requested_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          institution?: string | null
          notes?: string | null
          photographer_id?: string
          pix_key?: string | null
          processed_at?: string | null
          processed_by?: string | null
          recipient_name?: string | null
          requested_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      photo_collaborators: {
        Row: {
          added_by: string
          collaborator_id: string
          created_at: string
          id: string
          percentage: number
          photo_id: string
          updated_at: string
        }
        Insert: {
          added_by: string
          collaborator_id: string
          created_at?: string
          id?: string
          percentage?: number
          photo_id: string
          updated_at?: string
        }
        Update: {
          added_by?: string
          collaborator_id?: string
          created_at?: string
          id?: string
          percentage?: number
          photo_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "photo_collaborators_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_collaborators_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "public_profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_collaborators_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_collaborators_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_collaborators_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "photos"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_face_descriptors: {
        Row: {
          bounding_box: Json | null
          confidence: number | null
          created_at: string
          descriptor: number[]
          id: string
          photo_id: string
        }
        Insert: {
          bounding_box?: Json | null
          confidence?: number | null
          created_at?: string
          descriptor: number[]
          id?: string
          photo_id: string
        }
        Update: {
          bounding_box?: Json | null
          confidence?: number | null
          created_at?: string
          descriptor?: number[]
          id?: string
          photo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "photo_face_descriptors_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "photos"
            referencedColumns: ["id"]
          },
        ]
      }
      photographer_applications: {
        Row: {
          created_at: string | null
          equipment: string | null
          experience_years: number | null
          id: string
          message: string | null
          portfolio_url: string | null
          processed_at: string | null
          processed_by: string | null
          rejection_reason: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          equipment?: string | null
          experience_years?: number | null
          id?: string
          message?: string | null
          portfolio_url?: string | null
          processed_at?: string | null
          processed_by?: string | null
          rejection_reason?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          equipment?: string | null
          experience_years?: number | null
          id?: string
          message?: string | null
          portfolio_url?: string | null
          processed_at?: string | null
          processed_by?: string | null
          rejection_reason?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "photographer_applications_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photographer_applications_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "public_profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photographer_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photographer_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      photographer_goals: {
        Row: {
          created_at: string | null
          events_target: number | null
          id: string
          is_active: boolean | null
          month: string
          photographer_id: string
          photos_target: number | null
          sales_target: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          events_target?: number | null
          id?: string
          is_active?: boolean | null
          month: string
          photographer_id: string
          photos_target?: number | null
          sales_target?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          events_target?: number | null
          id?: string
          is_active?: boolean | null
          month?: string
          photographer_id?: string
          photos_target?: number | null
          sales_target?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "photographer_goals_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photographer_goals_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      photos: {
        Row: {
          campaign_id: string
          created_at: string
          id: string
          is_available: boolean
          is_featured: boolean
          original_url: string
          photographer_id: string
          price: number
          sub_event_id: string | null
          thumbnail_url: string | null
          title: string | null
          updated_at: string
          upload_sequence: number | null
          watermarked_url: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          id?: string
          is_available?: boolean
          is_featured?: boolean
          original_url: string
          photographer_id: string
          price?: number
          sub_event_id?: string | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string
          upload_sequence?: number | null
          watermarked_url: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          id?: string
          is_available?: boolean
          is_featured?: boolean
          original_url?: string
          photographer_id?: string
          price?: number
          sub_event_id?: string | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string
          upload_sequence?: number | null
          watermarked_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "photos_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_revenue_distribution"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_revenue_split_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns_for_home"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns_percentage_diagnosis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_sub_event_id_fkey"
            columns: ["sub_event_id"]
            isOneToOne: false
            referencedRelation: "sub_events"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_banned: boolean | null
          photographer_platform_percentage: number | null
          pix_change_requested_at: string | null
          pix_institution: string | null
          pix_key: string | null
          pix_key_type: string | null
          pix_pending_change: Json | null
          pix_recipient_name: string | null
          pix_verified_at: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          is_banned?: boolean | null
          photographer_platform_percentage?: number | null
          pix_change_requested_at?: string | null
          pix_institution?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          pix_pending_change?: Json | null
          pix_recipient_name?: string | null
          pix_verified_at?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_banned?: boolean | null
          photographer_platform_percentage?: number | null
          pix_change_requested_at?: string | null
          pix_institution?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          pix_pending_change?: Json | null
          pix_recipient_name?: string | null
          pix_verified_at?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      purchases: {
        Row: {
          amount: number
          buyer_id: string
          created_at: string
          id: string
          photo_id: string
          photographer_id: string
          progressive_discount_amount: number | null
          progressive_discount_percentage: number | null
          status: string
          stripe_payment_intent_id: string | null
        }
        Insert: {
          amount: number
          buyer_id: string
          created_at?: string
          id?: string
          photo_id: string
          photographer_id: string
          progressive_discount_amount?: number | null
          progressive_discount_percentage?: number | null
          status?: string
          stripe_payment_intent_id?: string | null
        }
        Update: {
          amount?: number
          buyer_id?: string
          created_at?: string
          id?: string
          photo_id?: string
          photographer_id?: string
          progressive_discount_amount?: number | null
          progressive_discount_percentage?: number | null
          status?: string
          stripe_payment_intent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchases_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "photos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      revenue_shares: {
        Row: {
          created_at: string
          id: string
          organization_amount: number
          organization_id: string | null
          photographer_amount: number
          photographer_id: string
          platform_amount: number
          purchase_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_amount?: number
          organization_id?: string | null
          photographer_amount?: number
          photographer_id: string
          platform_amount?: number
          purchase_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_amount?: number
          organization_id?: string | null
          photographer_amount?: number
          photographer_id?: string
          platform_amount?: number
          purchase_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_revenue_shares_photographer"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_revenue_shares_photographer"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenue_shares_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenue_shares_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases_missing_revenue_shares"
            referencedColumns: ["purchase_id"]
          },
        ]
      }
      sub_events: {
        Row: {
          campaign_id: string
          created_at: string
          description: string | null
          event_time: string | null
          id: string
          is_active: boolean
          location: string | null
          photo_count: number | null
          title: string
          updated_at: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          description?: string | null
          event_time?: string | null
          id?: string
          is_active?: boolean
          location?: string | null
          photo_count?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          description?: string | null
          event_time?: string | null
          id?: string
          is_active?: boolean
          location?: string | null
          photo_count?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sub_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_revenue_distribution"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sub_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_revenue_split_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sub_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sub_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns_for_home"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sub_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns_percentage_diagnosis"
            referencedColumns: ["id"]
          },
        ]
      }
      system_config: {
        Row: {
          description: string | null
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      user_face_descriptors: {
        Row: {
          created_at: string
          descriptor: number[]
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          descriptor: number[]
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          descriptor?: number[]
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      webhook_logs: {
        Row: {
          created_at: string | null
          error_message: string | null
          event_type: string
          id: string
          ip_address: string | null
          merchant_order_id: string | null
          payment_id: string | null
          processed_at: string | null
          request_body: Json | null
          request_headers: Json | null
          response_status: number | null
          signature_valid: boolean | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          event_type: string
          id?: string
          ip_address?: string | null
          merchant_order_id?: string | null
          payment_id?: string | null
          processed_at?: string | null
          request_body?: Json | null
          request_headers?: Json | null
          response_status?: number | null
          signature_valid?: boolean | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          event_type?: string
          id?: string
          ip_address?: string | null
          merchant_order_id?: string | null
          payment_id?: string | null
          processed_at?: string | null
          request_body?: Json | null
          request_headers?: Json | null
          response_status?: number | null
          signature_valid?: boolean | null
          user_agent?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      buyer_names_for_photographers: {
        Row: {
          buyer_id: string | null
          buyer_name: string | null
          photographer_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchases_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_revenue_distribution: {
        Row: {
          id: string | null
          organization_amount_example: number | null
          organization_id: string | null
          organization_percentage: number | null
          photographer_amount_example: number | null
          photographer_id: string | null
          photographer_percentage: number | null
          platform_amount_example: number | null
          platform_percentage: number | null
          revenue_split_description: string | null
          title: string | null
        }
        Insert: {
          id?: string | null
          organization_amount_example?: never
          organization_id?: string | null
          organization_percentage?: number | null
          photographer_amount_example?: never
          photographer_id?: string | null
          photographer_percentage?: number | null
          platform_amount_example?: never
          platform_percentage?: number | null
          revenue_split_description?: never
          title?: string | null
        }
        Update: {
          id?: string | null
          organization_amount_example?: never
          organization_id?: string | null
          organization_percentage?: number | null
          photographer_amount_example?: never
          photographer_id?: string | null
          photographer_percentage?: number | null
          platform_amount_example?: never
          platform_percentage?: number | null
          revenue_split_description?: never
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_revenue_split_view: {
        Row: {
          id: string | null
          organization_id: string | null
          organization_name: string | null
          organization_percentage: number | null
          photographer_id: string | null
          photographer_name: string | null
          photographer_percentage: number | null
          platform_percentage: number | null
          title: string | null
          validation_status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns_for_home: {
        Row: {
          album_count: number | null
          cover_image_url: string | null
          created_at: string | null
          description: string | null
          event_date: string | null
          id: string | null
          is_active: boolean | null
          is_featured: boolean | null
          location: string | null
          organization_id: string | null
          organization_percentage: number | null
          photo_count: number | null
          photographer_id: string | null
          photographer_percentage: number | null
          platform_percentage: number | null
          progressive_discount_enabled: boolean | null
          short_code: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          album_count?: never
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          event_date?: string | null
          id?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          location?: string | null
          organization_id?: string | null
          organization_percentage?: number | null
          photo_count?: never
          photographer_id?: string | null
          photographer_percentage?: number | null
          platform_percentage?: number | null
          progressive_discount_enabled?: boolean | null
          short_code?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          album_count?: never
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          event_date?: string | null
          id?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          location?: string | null
          organization_id?: string | null
          organization_percentage?: number | null
          photo_count?: never
          photographer_id?: string | null
          photographer_percentage?: number | null
          platform_percentage?: number | null
          progressive_discount_enabled?: boolean | null
          short_code?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns_percentage_diagnosis: {
        Row: {
          created_at: string | null
          has_organization: boolean | null
          id: string | null
          organization_percentage: number | null
          photographer_percentage: number | null
          platform_percentage: number | null
          status: string | null
          title: string | null
          total_percentage: number | null
        }
        Insert: {
          created_at?: string | null
          has_organization?: never
          id?: string | null
          organization_percentage?: never
          photographer_percentage?: number | null
          platform_percentage?: number | null
          status?: never
          title?: string | null
          total_percentage?: never
        }
        Update: {
          created_at?: string | null
          has_organization?: never
          id?: string | null
          organization_percentage?: never
          photographer_percentage?: number | null
          platform_percentage?: number | null
          status?: never
          title?: string | null
          total_percentage?: never
        }
        Relationships: []
      }
      coupon_stats: {
        Row: {
          code: string | null
          current_uses: number | null
          description: string | null
          end_date: string | null
          id: string | null
          is_active: boolean | null
          max_uses: number | null
          start_date: string | null
          total_discount_given: number | null
          type: string | null
          value: number | null
        }
        Relationships: []
      }
      public_profiles_safe: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          id: string | null
          role: Database["public"]["Enums"]["user_role"] | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
        }
        Relationships: []
      }
      purchases_missing_revenue_shares: {
        Row: {
          amount: number | null
          campaign_title: string | null
          created_at: string | null
          photo_title: string | null
          photographer_id: string | null
          purchase_id: string | null
          revenue_share_status: string | null
          status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchases_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      revenue_shares_with_correct_photographer: {
        Row: {
          created_at: string | null
          id: string | null
          organization_amount: number | null
          organization_id: string | null
          photo_photographer_id: string | null
          photographer_amount: number | null
          photographer_id: string | null
          platform_amount: number | null
          purchase_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_revenue_shares_photographer"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_revenue_shares_photographer"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_photographer_id_fkey"
            columns: ["photo_photographer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_photographer_id_fkey"
            columns: ["photo_photographer_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenue_shares_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenue_shares_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases_missing_revenue_shares"
            referencedColumns: ["purchase_id"]
          },
        ]
      }
      scheduled_cleanup_jobs: {
        Row: {
          active: boolean | null
          command: string | null
          database: string | null
          job_id: number | null
          job_name: string | null
          nodename: string | null
          nodeport: number | null
          schedule: string | null
          username: string | null
        }
        Insert: {
          active?: boolean | null
          command?: string | null
          database?: string | null
          job_id?: number | null
          job_name?: string | null
          nodename?: string | null
          nodeport?: number | null
          schedule?: string | null
          username?: string | null
        }
        Update: {
          active?: boolean | null
          command?: string | null
          database?: string | null
          job_id?: number | null
          job_name?: string | null
          nodename?: string | null
          nodeport?: number | null
          schedule?: string | null
          username?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      apply_progressive_discount: {
        Args: { p_quantity: number; p_unit_price: number }
        Returns: {
          discount_amount: number
          discount_percentage: number
          quantity: number
          subtotal: number
          total: number
          unit_price: number
        }[]
      }
      approve_photographer_application: {
        Args: { p_application_id: string; p_user_id: string }
        Returns: Json
      }
      calculate_progressive_discount: {
        Args: { p_quantity: number }
        Returns: number
      }
      cleanup_old_audit_logs: {
        Args: { days_to_keep?: number }
        Returns: number
      }
      cleanup_old_face_backups: { Args: never; Returns: undefined }
      cleanup_old_notifications: {
        Args: { days_to_keep?: number }
        Returns: number
      }
      cleanup_old_webhook_logs: { Args: never; Returns: undefined }
      current_user_is_admin: { Args: never; Returns: boolean }
      generate_short_code: { Args: never; Returns: string }
      get_buyer_name_for_photographer: {
        Args: { p_buyer_id: string; p_photographer_id: string }
        Returns: string
      }
      get_cache_statistics: {
        Args: never
        Returns: {
          old_rows: number
          table_name: string
          table_size: string
          total_rows: number
        }[]
      }
      get_cleanup_job_history: {
        Args: { job_name_filter?: string; limit_rows?: number }
        Returns: {
          end_time: string
          job_name: string
          return_message: string
          run_time: string
          start_time: string
          status: string
        }[]
      }
      get_photographer_platform_percentage: {
        Args: { p_photographer_id: string }
        Returns: number
      }
      get_platform_percentage: { Args: never; Returns: number }
      get_total_platform_percentage: { Args: never; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_organization_admin: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_organization_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_organization_owner: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      repair_missing_revenue_shares: {
        Args: never
        Returns: {
          purchase_id: string
          status: string
        }[]
      }
      toggle_cleanup_job: {
        Args: { enable_job: boolean; job_name_param: string }
        Returns: boolean
      }
      validate_coupon: {
        Args: { p_code: string; p_purchase_amount: number; p_user_id: string }
        Returns: {
          coupon_id: string
          discount_amount: number
          message: string
          valid: boolean
        }[]
      }
    }
    Enums: {
      user_role:
        | "user"
        | "photographer"
        | "admin"
        | "organization"
        | "organizer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      user_role: ["user", "photographer", "admin", "organization", "organizer"],
    },
  },
} as const
