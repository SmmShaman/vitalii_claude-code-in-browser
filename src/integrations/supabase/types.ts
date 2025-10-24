export interface Database {
  public: {
    Tables: {
      contact_forms: {
        Row: {
          id: string;
          created_at: string;
          name: string;
          email: string;
          message: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          name: string;
          email: string;
          message: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          name?: string;
          email?: string;
          message?: string;
        };
      };
    };
  };
}
