// Row shapes for the 9 allowlisted public views ONLY (migration 003).
// This app must never query a private source table.

export type ProfileRow = {
  owner_id: string;
  display_name: string | null;
  bio: string | null;
  mission: string | null;
  goals: unknown;
};

export type SummaryRow = {
  owner_id: string;
  summary_date: string;
  discipline_score: number | null;
  score_denominator: number | null;
};

export type PrayerRow = {
  owner_id: string;
  prayer_date: string;
  performed_count: number;
  total_count: number;
  jamaat_count: number;
};

export type ReadingRow = {
  owner_id: string;
  book_title: string;
  author: string | null;
  session_date: string;
  duration_minutes: number | null;
};

export type WorkoutRow = {
  owner_id: string;
  session_date: string;
  duration_minutes: number | null;
  status: string;
};

export type FocusRow = {
  owner_id: string;
  session_date: string;
  total_minutes: number;
  session_count: number;
};

export type HabitRow = {
  owner_id: string;
  habit_name: string;
  log_date: string;
  done: boolean;
};

export type LifeEventRow = {
  owner_id: string;
  title: string;
  purpose: string | null;
  event_date: string;
  outcomes: string | null;
  learned: string | null;
};

export type MessageRow = {
  owner_id: string;
  sender_name: string | null;
  body: string;
  created_at: string;
};
