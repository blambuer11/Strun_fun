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
      achievements: {
        Row: {
          created_at: string
          description: string
          icon: string
          id: string
          name: string
          requirement_type: string
          requirement_value: number
          xp_reward: number
        }
        Insert: {
          created_at?: string
          description: string
          icon: string
          id?: string
          name: string
          requirement_type: string
          requirement_value: number
          xp_reward?: number
        }
        Update: {
          created_at?: string
          description?: string
          icon?: string
          id?: string
          name?: string
          requirement_type?: string
          requirement_value?: number
          xp_reward?: number
        }
        Relationships: []
      }
      badges: {
        Row: {
          created_at: string
          description: string
          icon: string
          id: string
          level_required: number
          name: string
        }
        Insert: {
          created_at?: string
          description: string
          icon: string
          id?: string
          level_required: number
          name: string
        }
        Update: {
          created_at?: string
          description?: string
          icon?: string
          id?: string
          level_required?: number
          name?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          content: string
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      group_chat_messages: {
        Row: {
          created_at: string
          group_id: string
          id: string
          message: string
          user_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          message: string
          user_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          message?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_chat_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_chat_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          user_id?: string
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
          },
        ]
      }
      groups: {
        Row: {
          created_at: string
          creator_id: string
          description: string | null
          id: string
          is_sponsored: boolean
          location: string
          max_participants: number | null
          name: string
          prize_pool_sol: number | null
          prize_pool_xp: number | null
          scheduled_at: string
          sponsor_banner_url: string | null
          sponsor_name: string | null
        }
        Insert: {
          created_at?: string
          creator_id: string
          description?: string | null
          id?: string
          is_sponsored?: boolean
          location: string
          max_participants?: number | null
          name: string
          prize_pool_sol?: number | null
          prize_pool_xp?: number | null
          scheduled_at: string
          sponsor_banner_url?: string | null
          sponsor_name?: string | null
        }
        Update: {
          created_at?: string
          creator_id?: string
          description?: string | null
          id?: string
          is_sponsored?: boolean
          location?: string
          max_participants?: number | null
          name?: string
          prize_pool_sol?: number | null
          prize_pool_xp?: number | null
          scheduled_at?: string
          sponsor_banner_url?: string | null
          sponsor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "groups_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      land_nfts: {
        Row: {
          area_size: number
          created_at: string
          id: string
          mint_transaction_hash: string | null
          minted_at: string
          name: string
          polygon_coordinates: Json
          run_id: string | null
          user_id: string
        }
        Insert: {
          area_size: number
          created_at?: string
          id?: string
          mint_transaction_hash?: string | null
          minted_at?: string
          name: string
          polygon_coordinates: Json
          run_id?: string | null
          user_id: string
        }
        Update: {
          area_size?: number
          created_at?: string
          id?: string
          mint_transaction_hash?: string | null
          minted_at?: string
          name?: string
          polygon_coordinates?: Json
          run_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "land_nfts_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "land_nfts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      media: {
        Row: {
          created_at: string
          exif: Json | null
          hash: string | null
          id: string
          task_id: string
          thumbnail_url: string | null
          type: string | null
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          exif?: Json | null
          hash?: string | null
          id?: string
          task_id: string
          thumbnail_url?: string | null
          type?: string | null
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          exif?: Json | null
          hash?: string | null
          id?: string
          task_id?: string
          thumbnail_url?: string | null
          type?: string | null
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      nonces: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          nonce: string
          task_id: string
          used: boolean | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          nonce: string
          task_id: string
          used?: boolean | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          nonce?: string
          task_id?: string
          used?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nonces_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      parcel_accesses: {
        Row: {
          amount_paid: number | null
          created_at: string | null
          id: string
          last_paid_tx: string | null
          paid_until: string | null
          parcel_id: string
          user_id: string
        }
        Insert: {
          amount_paid?: number | null
          created_at?: string | null
          id?: string
          last_paid_tx?: string | null
          paid_until?: string | null
          parcel_id: string
          user_id: string
        }
        Update: {
          amount_paid?: number | null
          created_at?: string | null
          id?: string
          last_paid_tx?: string | null
          paid_until?: string | null
          parcel_id?: string
          user_id?: string
        }
        Relationships: []
      }
      parcels: {
        Row: {
          center_lat: number | null
          center_lon: number | null
          created_at: string | null
          id: string
          is_minted: boolean | null
          nft_token: string | null
          owner_id: string | null
          owner_wallet: string | null
          parcel_id: string
          rent_amount_usdc: number | null
          rent_policy: string | null
          updated_at: string | null
        }
        Insert: {
          center_lat?: number | null
          center_lon?: number | null
          created_at?: string | null
          id?: string
          is_minted?: boolean | null
          nft_token?: string | null
          owner_id?: string | null
          owner_wallet?: string | null
          parcel_id: string
          rent_amount_usdc?: number | null
          rent_policy?: string | null
          updated_at?: string | null
        }
        Update: {
          center_lat?: number | null
          center_lon?: number | null
          created_at?: string | null
          id?: string
          is_minted?: boolean | null
          nft_token?: string | null
          owner_id?: string | null
          owner_wallet?: string | null
          parcel_id?: string
          rent_amount_usdc?: number | null
          rent_policy?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      partner_locations: {
        Row: {
          created_at: string | null
          id: string
          lat: number
          lon: number
          name: string
          qr_secret: string
          radius_m: number | null
          sponsor_banner_url: string | null
          sponsor_name: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          lat: number
          lon: number
          name: string
          qr_secret?: string
          radius_m?: number | null
          sponsor_banner_url?: string | null
          sponsor_name?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          lat?: number
          lon?: number
          name?: string
          qr_secret?: string
          radius_m?: number | null
          sponsor_banner_url?: string | null
          sponsor_name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          memo: string | null
          nonce: string | null
          payee_id: string | null
          payer_id: string
          purpose: string
          status: string | null
          token: string
          tx_hash: string
          verified_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          memo?: string | null
          nonce?: string | null
          payee_id?: string | null
          payer_id: string
          purpose: string
          status?: string | null
          token: string
          tx_hash: string
          verified_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          memo?: string | null
          nonce?: string | null
          payee_id?: string | null
          payer_id?: string
          purpose?: string
          status?: string | null
          token?: string
          tx_hash?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      pois: {
        Row: {
          created_at: string | null
          id: string
          lat: number | null
          lon: number | null
          name: string | null
          tags: Json | null
          type: string | null
        }
        Insert: {
          created_at?: string | null
          id: string
          lat?: number | null
          lon?: number | null
          name?: string | null
          tags?: Json | null
          type?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          lat?: number | null
          lon?: number | null
          name?: string | null
          tags?: Json | null
          type?: string | null
        }
        Relationships: []
      }
      pools: {
        Row: {
          created_at: string
          creator_id: string
          escrow_address: string | null
          id: string
          min_participants: number | null
          required_creator_stake: number | null
          status: string | null
          total_funded_sol: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          escrow_address?: string | null
          id?: string
          min_participants?: number | null
          required_creator_stake?: number | null
          status?: string | null
          total_funded_sol?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          escrow_address?: string | null
          id?: string
          min_participants?: number | null
          required_creator_stake?: number | null
          status?: string | null
          total_funded_sol?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_reposts: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reposts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          comments_count: number
          content: string
          created_at: string
          id: string
          image_url: string | null
          likes_count: number
          location: string | null
          nft_id: string | null
          reposts_count: number
          user_id: string
        }
        Insert: {
          comments_count?: number
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          likes_count?: number
          location?: string | null
          nft_id?: string | null
          reposts_count?: number
          user_id: string
        }
        Update: {
          comments_count?: number
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          likes_count?: number
          location?: string | null
          nft_id?: string | null
          reposts_count?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_nft_id_fkey"
            columns: ["nft_id"]
            isOneToOne: false
            referencedRelation: "land_nfts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          daily_task_accept_count: number | null
          daily_task_count: number | null
          email: string
          fcm_token: string | null
          id: string
          instagram_url: string | null
          last_accept_date: string | null
          last_task_date: string | null
          level: number
          referral_code: string
          solana_encrypted_key: string | null
          solana_public_key: string | null
          tiktok_url: string | null
          twitter_url: string | null
          updated_at: string
          username: string | null
          xp: number
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          daily_task_accept_count?: number | null
          daily_task_count?: number | null
          email: string
          fcm_token?: string | null
          id: string
          instagram_url?: string | null
          last_accept_date?: string | null
          last_task_date?: string | null
          level?: number
          referral_code: string
          solana_encrypted_key?: string | null
          solana_public_key?: string | null
          tiktok_url?: string | null
          twitter_url?: string | null
          updated_at?: string
          username?: string | null
          xp?: number
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          daily_task_accept_count?: number | null
          daily_task_count?: number | null
          email?: string
          fcm_token?: string | null
          id?: string
          instagram_url?: string | null
          last_accept_date?: string | null
          last_task_date?: string | null
          level?: number
          referral_code?: string
          solana_encrypted_key?: string | null
          solana_public_key?: string | null
          tiktok_url?: string | null
          twitter_url?: string | null
          updated_at?: string
          username?: string | null
          xp?: number
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          referred_id: string
          referrer_id: string
          xp_earned: number
        }
        Insert: {
          created_at?: string
          id?: string
          referred_id: string
          referrer_id: string
          xp_earned?: number
        }
        Update: {
          created_at?: string
          id?: string
          referred_id?: string
          referrer_id?: string
          xp_earned?: number
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      runs: {
        Row: {
          calories: number
          completed_at: string
          created_at: string
          distance: number
          duration: number
          id: string
          pace: number | null
          parcel_ids: Json | null
          route_coordinates: Json | null
          started_at: string
          user_id: string
          xp_earned: number
        }
        Insert: {
          calories?: number
          completed_at: string
          created_at?: string
          distance: number
          duration: number
          id?: string
          pace?: number | null
          parcel_ids?: Json | null
          route_coordinates?: Json | null
          started_at: string
          user_id: string
          xp_earned?: number
        }
        Update: {
          calories?: number
          completed_at?: string
          created_at?: string
          distance?: number
          duration?: number
          id?: string
          pace?: number | null
          parcel_ids?: Json | null
          route_coordinates?: Json | null
          started_at?: string
          user_id?: string
          xp_earned?: number
        }
        Relationships: [
          {
            foreignKeyName: "runs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      selfie_groups: {
        Row: {
          center_lat: number | null
          center_lon: number | null
          created_at: string | null
          id: string
          participant_count: number | null
          proof_ipfs: string | null
          status: string | null
          task_id: string
          window_end: string
          window_start: string
        }
        Insert: {
          center_lat?: number | null
          center_lon?: number | null
          created_at?: string | null
          id?: string
          participant_count?: number | null
          proof_ipfs?: string | null
          status?: string | null
          task_id: string
          window_end: string
          window_start: string
        }
        Update: {
          center_lat?: number | null
          center_lon?: number | null
          created_at?: string | null
          id?: string
          participant_count?: number | null
          proof_ipfs?: string | null
          status?: string | null
          task_id?: string
          window_end?: string
          window_start?: string
        }
        Relationships: []
      }
      selfie_participants: {
        Row: {
          id: string
          image_ipfs: string
          lat: number
          lon: number
          selfie_group_id: string
          submitted_at: string | null
          user_id: string
          user_task_id: string
        }
        Insert: {
          id?: string
          image_ipfs: string
          lat: number
          lon: number
          selfie_group_id: string
          submitted_at?: string | null
          user_id: string
          user_task_id: string
        }
        Update: {
          id?: string
          image_ipfs?: string
          lat?: number
          lon?: number
          selfie_group_id?: string
          submitted_at?: string | null
          user_id?: string
          user_task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "selfie_participants_selfie_group_id_fkey"
            columns: ["selfie_group_id"]
            isOneToOne: false
            referencedRelation: "selfie_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsors: {
        Row: {
          allowed_categories: string[] | null
          budget_sol: number | null
          created_at: string | null
          disallowed_terms: string[] | null
          id: string
          name: string
          per_task_budget_sol: number | null
        }
        Insert: {
          allowed_categories?: string[] | null
          budget_sol?: number | null
          created_at?: string | null
          disallowed_terms?: string[] | null
          id?: string
          name: string
          per_task_budget_sol?: number | null
        }
        Update: {
          allowed_categories?: string[] | null
          budget_sol?: number | null
          created_at?: string | null
          disallowed_terms?: string[] | null
          id?: string
          name?: string
          per_task_budget_sol?: number | null
        }
        Relationships: []
      }
      task_generation_jobs: {
        Row: {
          city: string
          count: number | null
          created_at: string | null
          id: string
          mode: string | null
          sponsor_id: string | null
          status: string | null
          tasks_generated: number | null
          updated_at: string | null
        }
        Insert: {
          city: string
          count?: number | null
          created_at?: string | null
          id?: string
          mode?: string | null
          sponsor_id?: string | null
          status?: string | null
          tasks_generated?: number | null
          updated_at?: string | null
        }
        Update: {
          city?: string
          count?: number | null
          created_at?: string | null
          id?: string
          mode?: string | null
          sponsor_id?: string | null
          status?: string | null
          tasks_generated?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      task_proof_votes: {
        Row: {
          created_at: string
          id: string
          proof_id: string
          user_id: string
          vote_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          proof_id: string
          user_id: string
          vote_type: string
        }
        Update: {
          created_at?: string
          id?: string
          proof_id?: string
          user_id?: string
          vote_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_proof_votes_proof_id_fkey"
            columns: ["proof_id"]
            isOneToOne: false
            referencedRelation: "task_proofs"
            referencedColumns: ["id"]
          },
        ]
      }
      task_proofs: {
        Row: {
          content: string
          created_at: string
          downvotes: number | null
          id: string
          is_shared_to_community: boolean
          likes_count: number
          media_url: string | null
          task_id: string
          upvotes: number | null
          user_id: string
          user_task_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          downvotes?: number | null
          id?: string
          is_shared_to_community?: boolean
          likes_count?: number
          media_url?: string | null
          task_id: string
          upvotes?: number | null
          user_id: string
          user_task_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          downvotes?: number | null
          id?: string
          is_shared_to_community?: boolean
          likes_count?: number
          media_url?: string | null
          task_id?: string
          upvotes?: number | null
          user_id?: string
          user_task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_proofs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_proofs_user_task_id_fkey"
            columns: ["user_task_id"]
            isOneToOne: false
            referencedRelation: "user_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          active_from: string | null
          active_to: string | null
          city: string | null
          coordinates: Json
          created_at: string
          creator_id: string
          current_participants: number | null
          description: string | null
          id: string
          is_shared_to_community: boolean | null
          lat: number | null
          location_name: string | null
          lon: number | null
          max_participants: number | null
          meta: Json | null
          name: string | null
          parcel_id: string | null
          pool_id: string | null
          radius_m: number | null
          rent_amount_usdc: number | null
          requires_rent: boolean | null
          sol_reward: number | null
          status: string | null
          title: string
          type: string
          updated_at: string
          xp_reward: number | null
        }
        Insert: {
          active_from?: string | null
          active_to?: string | null
          city?: string | null
          coordinates: Json
          created_at?: string
          creator_id: string
          current_participants?: number | null
          description?: string | null
          id?: string
          is_shared_to_community?: boolean | null
          lat?: number | null
          location_name?: string | null
          lon?: number | null
          max_participants?: number | null
          meta?: Json | null
          name?: string | null
          parcel_id?: string | null
          pool_id?: string | null
          radius_m?: number | null
          rent_amount_usdc?: number | null
          requires_rent?: boolean | null
          sol_reward?: number | null
          status?: string | null
          title: string
          type: string
          updated_at?: string
          xp_reward?: number | null
        }
        Update: {
          active_from?: string | null
          active_to?: string | null
          city?: string | null
          coordinates?: Json
          created_at?: string
          creator_id?: string
          current_participants?: number | null
          description?: string | null
          id?: string
          is_shared_to_community?: boolean | null
          lat?: number | null
          location_name?: string | null
          lon?: number | null
          max_participants?: number | null
          meta?: Json | null
          name?: string | null
          parcel_id?: string | null
          pool_id?: string | null
          radius_m?: number | null
          rent_amount_usdc?: number | null
          requires_rent?: boolean | null
          sol_reward?: number | null
          status?: string | null
          title?: string
          type?: string
          updated_at?: string
          xp_reward?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "pools"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          description: string | null
          from_user_id: string | null
          id: string
          to_user_id: string | null
          transaction_hash: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency: string
          description?: string | null
          from_user_id?: string | null
          id?: string
          to_user_id?: string | null
          transaction_hash?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          description?: string | null
          from_user_id?: string | null
          id?: string
          to_user_id?: string | null
          transaction_hash?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_id: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_rewards: {
        Row: {
          claimed_at: string | null
          created_at: string
          id: string
          is_claimed: boolean
          reward_level: number
          user_id: string
          xp_amount: number | null
        }
        Insert: {
          claimed_at?: string | null
          created_at?: string
          id?: string
          is_claimed?: boolean
          reward_level: number
          user_id: string
          xp_amount?: number | null
        }
        Update: {
          claimed_at?: string | null
          created_at?: string
          id?: string
          is_claimed?: boolean
          reward_level?: number
          user_id?: string
          xp_amount?: number | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_tasks: {
        Row: {
          claim_token: string | null
          completed_at: string | null
          device_meta: Json | null
          geo_meta: Json | null
          id: string
          joined_at: string
          media_id: string | null
          nonce_used: string | null
          sol_awarded: number | null
          status: string | null
          suspicious: boolean | null
          task_id: string
          updated_at: string
          user_id: string
          verification_score: number | null
          xp_awarded: number | null
        }
        Insert: {
          claim_token?: string | null
          completed_at?: string | null
          device_meta?: Json | null
          geo_meta?: Json | null
          id?: string
          joined_at?: string
          media_id?: string | null
          nonce_used?: string | null
          sol_awarded?: number | null
          status?: string | null
          suspicious?: boolean | null
          task_id: string
          updated_at?: string
          user_id: string
          verification_score?: number | null
          xp_awarded?: number | null
        }
        Update: {
          claim_token?: string | null
          completed_at?: string | null
          device_meta?: Json | null
          geo_meta?: Json | null
          id?: string
          joined_at?: string
          media_id?: string | null
          nonce_used?: string | null
          sol_awarded?: number | null
          status?: string | null
          suspicious?: boolean | null
          task_id?: string
          updated_at?: string
          user_id?: string
          verification_score?: number | null
          xp_awarded?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_tasks_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_tasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      verifications: {
        Row: {
          ai_reason: string | null
          ai_score: number | null
          ai_verified: boolean | null
          created_at: string
          distance_meters: number | null
          exif_verified: boolean | null
          final_status: string | null
          gps_verified: boolean | null
          human_reviewed_by: string | null
          id: string
          method: string | null
          nonce_verified: boolean | null
          qr_verified: boolean | null
          user_task_id: string
        }
        Insert: {
          ai_reason?: string | null
          ai_score?: number | null
          ai_verified?: boolean | null
          created_at?: string
          distance_meters?: number | null
          exif_verified?: boolean | null
          final_status?: string | null
          gps_verified?: boolean | null
          human_reviewed_by?: string | null
          id?: string
          method?: string | null
          nonce_verified?: boolean | null
          qr_verified?: boolean | null
          user_task_id: string
        }
        Update: {
          ai_reason?: string | null
          ai_score?: number | null
          ai_verified?: boolean | null
          created_at?: string
          distance_meters?: number | null
          exif_verified?: boolean | null
          final_status?: string | null
          gps_verified?: boolean | null
          human_reviewed_by?: string | null
          id?: string
          method?: string | null
          nonce_verified?: boolean | null
          qr_verified?: boolean | null
          user_task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "verifications_user_task_id_fkey"
            columns: ["user_task_id"]
            isOneToOne: false
            referencedRelation: "user_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_level_from_xp: { Args: { xp_amount: number }; Returns: number }
      check_and_award_badges: {
        Args: { p_level: number; p_user_id: string }
        Returns: undefined
      }
      check_daily_task_limit: { Args: { p_user_id: string }; Returns: boolean }
      generate_referral_code: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_daily_task_count: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      increment_xp: {
        Args: { user_id: string; xp_amount: number }
        Returns: undefined
      }
      recalculate_all_levels: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
