export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];
export type Database = {
  public: {
    Tables: {
      simula_records: {
        Row: {
          workspace: string;
          kind: string;
          id: string;
          data: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          workspace: string;
          kind: string;
          id: string;
          data: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: { data?: Json; updated_at?: string };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
