export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Enums: {
      activity_type: "dinner" | "brunch" | "drinks" | "coffee" | "activity";
      plan_status: "collecting" | "voting" | "confirmed" | "cancelled";
      vote_value: "first" | "acceptable" | "no";
    };
    Tables: {
      plans: {
        Row: {
          id: string;
          title: string;
          activity_type: Database["public"]["Enums"]["activity_type"];
          start_date: string;
          end_date: string;
          budget_max: number;
          city: string;
          time_zone: string;
          preferred_area: string;
          organizer_name: string;
          invite_code: string;
          status: Database["public"]["Enums"]["plan_status"];
          max_travel_minutes: number;
          preferred_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          activity_type?: Database["public"]["Enums"]["activity_type"];
          start_date: string;
          end_date: string;
          budget_max: number;
          city?: string;
          time_zone?: string;
          preferred_area: string;
          organizer_name: string;
          invite_code?: string;
          status?: Database["public"]["Enums"]["plan_status"];
          max_travel_minutes: number;
          preferred_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["plans"]["Insert"]>;
        Relationships: [];
      };
      participants: {
        Row: {
          id: string;
          plan_id: string;
          name: string;
          starting_location: string;
          budget_max: number;
          dietary_preferences: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          plan_id: string;
          name: string;
          starting_location: string;
          budget_max: number;
          dietary_preferences?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["participants"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "participants_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "plans";
            referencedColumns: ["id"];
          }
        ];
      };
      availability: {
        Row: {
          id: string;
          participant_id: string;
          date: string;
          start_time: string;
          end_time: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          participant_id: string;
          date: string;
          start_time: string;
          end_time: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["availability"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "availability_participant_id_fkey";
            columns: ["participant_id"];
            isOneToOne: false;
            referencedRelation: "participants";
            referencedColumns: ["id"];
          }
        ];
      };
      venues: {
        Row: {
          id: string;
          plan_id: string;
          external_place_id: string | null;
          name: string;
          address: string;
          category: string;
          price_level: number | null;
          price_per_person: number | null;
          rating: number | null;
          booking_url: string | null;
          dietary_tags: string[];
          travel_times: Json;
          average_travel_minutes: number | null;
          worst_travel_minutes: number | null;
          group_travel_score: number | null;
          recommendation_score: number | null;
          booking_confidence: number | null;
          why_it_matches: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          plan_id: string;
          external_place_id?: string | null;
          name: string;
          address: string;
          category: string;
          price_level?: number | null;
          price_per_person?: number | null;
          rating?: number | null;
          booking_url?: string | null;
          dietary_tags?: string[];
          travel_times?: Json;
          average_travel_minutes?: number | null;
          worst_travel_minutes?: number | null;
          group_travel_score?: number | null;
          recommendation_score?: number | null;
          booking_confidence?: number | null;
          why_it_matches?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["venues"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "venues_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "plans";
            referencedColumns: ["id"];
          }
        ];
      };
      votes: {
        Row: {
          id: string;
          participant_id: string;
          venue_id: string;
          vote: Database["public"]["Enums"]["vote_value"];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          participant_id: string;
          venue_id: string;
          vote: Database["public"]["Enums"]["vote_value"];
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["votes"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "votes_participant_id_fkey";
            columns: ["participant_id"];
            isOneToOne: false;
            referencedRelation: "participants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "votes_venue_id_fkey";
            columns: ["venue_id"];
            isOneToOne: false;
            referencedRelation: "venues";
            referencedColumns: ["id"];
          }
        ];
      };
      final_plans: {
        Row: {
          plan_id: string;
          venue_id: string;
          final_date: string;
          final_start_time: string;
          final_end_time: string;
          confirmed_by: string;
          confirmed_at: string;
        };
        Insert: {
          plan_id: string;
          venue_id: string;
          final_date: string;
          final_start_time: string;
          final_end_time: string;
          confirmed_by: string;
          confirmed_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["final_plans"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "final_plans_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: true;
            referencedRelation: "plans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "final_plans_venue_id_fkey";
            columns: ["venue_id"];
            isOneToOne: false;
            referencedRelation: "venues";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
