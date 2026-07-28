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
      };
    };
  };
};
