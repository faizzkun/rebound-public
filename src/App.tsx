import { useEffect, useState, type FormEvent } from 'react';
import { supabase, supabaseConfigured } from './supabase';
import type {
  FocusRow,
  HabitRow,
  LifeEventRow,
  MessageRow,
  PrayerRow,
  ProfileRow,
  ReadingRow,
  SummaryRow,
  WorkoutRow,
} from './types';
import { ScoreChart, type ScorePoint } from './charts';

const MESSAGE_THROTTLE_KEY = 'rebound-public-message-at';
const MESSAGE_THROTTLE_MS = 60 * 60 * 1000; // one message per hour per browser

function goalsToList(goals: unknown): string[] {
  if (!Array.isArray(goals)) return [];
  const out: string[] = [];
  for (const g of goals) {
    if (typeof g === 'string' && g.trim()) out.push(g);
    else if (g && typeof g === 'object') {
      const rec = g as Record<string, unknown>;
      const v = rec.title ?? rec.name ?? rec.text;
      if (typeof v === 'string' && v.trim()) out.push(v);
    }
  }
  return out;
}

function longestStreak(dates: string[]): number {
  const days = [...new Set(dates)]
    .map((d) => new Date(`${d}T00:00:00Z`).getTime())
    .sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  let prev: number | null = null;
  for (const t of days) {
    run = prev !== null && t - prev === 86400000 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = t;
  }
  return best;
}

function Empty({ text }: { text: string }) {
  return <p className="empty">{text}</p>;
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [summaries, setSummaries] = useState<SummaryRow[]>([]);
  const [prayer, setPrayer] = useState<PrayerRow[]>([]);
  const [reading, setReading] = useState<ReadingRow[]>([]);
  const [workout, setWorkout] = useState<WorkoutRow[]>([]);
  const [focus, setFocus] = useState<FocusRow[]>([]);
  const [habits, setHabits] = useState<HabitRow[]>([]);
  const [lifeEvents, setLifeEvents] = useState<LifeEventRow[]>([]);
  const [messages, setMessages] = useState<MessageRow[]>([]);

  const [senderName, setSenderName] = useState('');
  const [body, setBody] = useState('');
  const [formError, setFormError] = useState('');
  const [formSent, setFormSent] = useState(false);
  const [formBusy, setFormBusy] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const [p, s, pr, r, w, f, h, l, m] = await Promise.all([
        supabase.from('public_profile_view').select('*').limit(1),
        supabase.from('public_daily_summaries_view').select('*').order('summary_date', { ascending: true }),
        supabase.from('public_prayer_view').select('*').order('prayer_date', { ascending: false }).limit(60),
        supabase.from('public_reading_view').select('*').order('session_date', { ascending: false }).limit(60),
        supabase.from('public_workout_view').select('*').order('session_date', { ascending: false }).limit(60),
        supabase.from('public_focus_view').select('*').order('session_date', { ascending: false }).limit(90),
        supabase.from('public_habits_view').select('*').order('log_date', { ascending: false }).limit(200),
        supabase.from('public_life_events_view').select('*').order('event_date', { ascending: false }).limit(30),
        supabase.from('public_messages_view').select('*').order('created_at', { ascending: false }).limit(50),
      ]);
      if (cancelled) return;
      const failed = [p, s, pr, r, w, f, h, l, m].some((res) => res.error);
      if (failed) setLoadError(true);
      setProfile((p.data as ProfileRow[] | null)?.[0] ?? null);
      setSummaries((s.data as SummaryRow[] | null) ?? []);
      setPrayer((pr.data as PrayerRow[] | null) ?? []);
      setReading((r.data as ReadingRow[] | null) ?? []);
      setWorkout((w.data as WorkoutRow[] | null) ?? []);
      setFocus((f.data as FocusRow[] | null) ?? []);
      setHabits((h.data as HabitRow[] | null) ?? []);
      setLifeEvents((l.data as LifeEventRow[] | null) ?? []);
      setMessages((m.data as MessageRow[] | null) ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function submitMessage(e: FormEvent) {
    e.preventDefault();
    setFormError('');
    setFormSent(false);
    const text = body.trim();
    if (text.length < 1 || text.length > 500) {
      setFormError('Message must be between 1 and 500 characters.');
      return;
    }
    if (!supabase || !profile) {
      setFormError('Messages are not open right now.');
      return;
    }
    const last = Number(localStorage.getItem(MESSAGE_THROTTLE_KEY) ?? 0);
    const waited = Date.now() - last;
    if (last > 0 && waited < MESSAGE_THROTTLE_MS) {
      const mins = Math.ceil((MESSAGE_THROTTLE_MS - waited) / 60000);
      setFormError(`Please wait about ${mins} more minute(s) before sending another message.`);
      return;
    }
    setFormBusy(true);
    const { error } = await supabase.from('public_messages').insert({
      owner_id: profile.owner_id,
      sender_name: senderName.trim() || null,
      body: text,
      status: 'pending',
    });
    setFormBusy(false);
    if (error) {
      setFormError('Could not send your message right now. Please try again later.');
      return;
    }
    localStorage.setItem(MESSAGE_THROTTLE_KEY, String(Date.now()));
    setBody('');
    setSenderName('');
    setFormSent(true);
  }

  // Derived aggregates — computed only from the published views above.
  const scorePoints: ScorePoint[] = summaries
    .filter((s) => s.discipline_score !== null)
    .map((s) => ({ date: s.summary_date, score: s.discipline_score as number }));
  const latestSummary = summaries[summaries.length - 1];
  const avgScore =
    scorePoints.length > 0
      ? scorePoints.reduce((a, p) => a + p.score, 0) / scorePoints.length
      : null;
  const prayerPerformed = prayer.reduce((a, r) => a + r.performed_count, 0);
  const prayerTotal = prayer.reduce((a, r) => a + r.total_count, 0);
  const prayerJamaat = prayer.reduce((a, r) => a + r.jamaat_count, 0);
  const perfectPrayerDays = prayer.filter(
    (r) => r.total_count > 0 && r.performed_count === r.total_count,
  ).length;
  const readingMinutes = reading.reduce((a, r) => a + (r.duration_minutes ?? 0), 0);
  const workoutCount = workout.length;
  const workoutMinutes = workout.reduce((a, r) => a + (r.duration_minutes ?? 0), 0);
  const focusMinutes = focus.reduce((a, r) => a + r.total_minutes, 0);
  const streak = longestStreak(summaries.map((s) => s.summary_date));

  const habitStats = new Map<string, { done: number; total: number }>();
  for (const h of habits) {
    const cur = habitStats.get(h.habit_name) ?? { done: 0, total: 0 };
    cur.total += 1;
    if (h.done) cur.done += 1;
    habitStats.set(h.habit_name, cur);
  }

  // Achievements: only from verified published records. Nothing is invented.
  const achievements: string[] = [];
  if (streak >= 3) achievements.push(`${streak}-day published streak`);
  if (focusMinutes >= 240)
    achievements.push(`${focusMinutes.toLocaleString()} total published focus minutes`);
  if (workoutCount >= 5) achievements.push(`${workoutCount} published workout sessions`);
  if (readingMinutes >= 300)
    achievements.push(`${readingMinutes.toLocaleString()} published reading minutes`);
  if (perfectPrayerDays >= 7)
    achievements.push(`${perfectPrayerDays} published full-prayer days`);

  const goals = profile ? goalsToList(profile.goals) : [];

  return (
    <div className="page">
      <header className="hero">
        <img src="/logo.svg" alt="Rebound logo" className="logo" />
        <div>
          <h1>REBOUND</h1>
          <p className="tagline">Missed today? Rebound tomorrow.</p>
        </div>
      </header>

      {!supabaseConfigured && (
        <p className="notice">
          This dashboard is not connected yet. Set VITE_SUPABASE_URL and
          VITE_SUPABASE_PUBLISHABLE_KEY to load published content.
        </p>
      )}
      {loading && <p className="notice">Loading published progress…</p>}
      {loadError && !loading && (
        <p className="notice">
          Some published data could not be loaded right now. What is shown
          below is only what was actually published.
        </p>
      )}

      <section className="card profile-card">
        <h2>{profile?.display_name ?? 'Rebound'}</h2>
        {profile ? (
          <>
            {profile.bio && <p>{profile.bio}</p>}
            {profile.mission && (
              <p>
                <strong>Mission:</strong> {profile.mission}
              </p>
            )}
            {goals.length > 0 && (
              <div>
                <strong>Goals</strong>
                <ul>
                  {goals.map((g, i) => (
                    <li key={i}>{g}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          !loading && <Empty text="Profile not published yet." />
        )}
      </section>

      <section className="card">
        <h2>Discipline score trend</h2>
        {scorePoints.length > 0 ? (
          <>
            <ScoreChart points={scorePoints.slice(-30)} />
            <p className="stat-line">
              {latestSummary && (
                <>
                  Latest published score: <strong>{latestSummary.discipline_score}</strong>
                  {latestSummary.score_denominator !== null &&
                    ` of ${latestSummary.score_denominator}`}{' '}
                  on {latestSummary.summary_date}.{' '}
                </>
              )}
              {avgScore !== null && (
                <>
                  Average across {scorePoints.length} published day(s):{' '}
                  <strong>{avgScore.toFixed(1)}</strong>.
                </>
              )}
            </p>
            <p className="footnote">
              Only finalized published summaries are shown. Unpublished days
              are not shown as failures.
            </p>
          </>
        ) : (
          !loading && <Empty text="No discipline scores published yet." />
        )}
      </section>

      <div className="grid">
        <section className="card">
          <h2>Prayer</h2>
          {prayer.length > 0 ? (
            <>
              <p className="big">
                {prayerPerformed} <span>of {prayerTotal} performed</span>
              </p>
              <p className="stat-line">
                {prayerJamaat} with jamaat · across {prayer.length} published day(s)
              </p>
            </>
          ) : (
            !loading && <Empty text="Prayer stats not published yet." />
          )}
        </section>

        <section className="card">
          <h2>Reading</h2>
          {reading.length > 0 ? (
            <>
              <p className="big">
                {readingMinutes.toLocaleString()} <span>minutes</span>
              </p>
              <p className="stat-line">
                Across {reading.length} published session(s). Latest:{' '}
                {reading[0].book_title}
                {reading[0].author ? ` by ${reading[0].author}` : ''}
              </p>
            </>
          ) : (
            !loading && <Empty text="Reading progress not published yet." />
          )}
        </section>

        <section className="card">
          <h2>Workout</h2>
          {workout.length > 0 ? (
            <>
              <p className="big">
                {workoutCount} <span>sessions</span>
              </p>
              <p className="stat-line">
                {workoutMinutes.toLocaleString()} total published minutes
              </p>
            </>
          ) : (
            !loading && <Empty text="Workout stats not published yet." />
          )}
        </section>

        <section className="card">
          <h2>Deep work</h2>
          {focus.length > 0 ? (
            <>
              <p className="big">
                {focusMinutes.toLocaleString()} <span>minutes</span>
              </p>
              <p className="stat-line">
                Across {focus.length} published day(s),{' '}
                {focus.reduce((a, r) => a + r.session_count, 0)} session(s)
              </p>
            </>
          ) : (
            !loading && <Empty text="Deep work stats not published yet." />
          )}
        </section>

        <section className="card">
          <h2>Habits</h2>
          {habitStats.size > 0 ? (
            <ul className="habit-list">
              {[...habitStats.entries()].map(([name, s]) => (
                <li key={name}>
                  {name}: <strong>{s.done}</strong> of {s.total} published days done
                </li>
              ))}
            </ul>
          ) : (
            !loading && <Empty text="Habits not published yet." />
          )}
        </section>

        <section className="card">
          <h2>Life events</h2>
          {lifeEvents.length > 0 ? (
            <ul className="event-list">
              {lifeEvents.map((ev, i) => (
                <li key={`${ev.event_date}-${i}`}>
                  <strong>{ev.title}</strong> · {ev.event_date}
                  {ev.purpose && <p>{ev.purpose}</p>}
                  {ev.outcomes && <p>{ev.outcomes}</p>}
                  {ev.learned && <p className="muted">Learned: {ev.learned}</p>}
                </li>
              ))}
            </ul>
          ) : (
            !loading && <Empty text="No life events published yet." />
          )}
        </section>
      </div>

      <section className="card">
        <h2>Achievements</h2>
        {achievements.length > 0 ? (
          <ul>
            {achievements.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        ) : (
          !loading && <Empty text="No achievements published yet." />
        )}
        <p className="footnote">
          Achievements here are computed only from published records — nothing
          is added by hand.
        </p>
      </section>

      <section className="card">
        <h2>Messages from visitors</h2>
        {messages.length > 0 ? (
          <ul className="message-list">
            {messages.map((m, i) => (
              <li key={`${m.created_at}-${i}`}>
                <blockquote>{m.body}</blockquote>
                <p className="muted">
                  — {m.sender_name ?? 'Anonymous'} · {m.created_at.slice(0, 10)}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          !loading && <Empty text="No approved messages published yet." />
        )}

        <form onSubmit={submitMessage} className="message-form">
          <h3>Send a motivational message</h3>
          <label>
            Your name (optional)
            <input
              type="text"
              value={senderName}
              maxLength={100}
              onChange={(e) => setSenderName(e.target.value)}
              placeholder="Anonymous"
            />
          </label>
          <label>
            Message (1–500 characters)
            <textarea
              value={body}
              maxLength={500}
              rows={4}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Keep going…"
              required
            />
          </label>
          <p className="char-count">{body.trim().length} / 500 characters</p>
          {formError && <p className="form-error">{formError}</p>}
          {formSent && (
            <p className="form-success">
              Sent. Your message is awaiting moderation and is not published
              yet — it will only appear here if approved.
            </p>
          )}
          <button type="submit" disabled={formBusy || !profile}>
            {formBusy ? 'Sending…' : 'Send message'}
          </button>
          {!profile && !loading && (
            <p className="footnote">Messages are not open right now.</p>
          )}
        </form>
      </section>

      <footer>
        <p>
          REBOUND · Missed today? Rebound tomorrow. · This page shows only
          content the owner chose to publish. Unpublished categories simply do
          not appear.
        </p>
      </footer>
    </div>
  );
}
