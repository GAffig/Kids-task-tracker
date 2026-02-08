# BrightSteps Kids Task Tracker

A vibrant, showcase-ready kids task tracker with rewards, focus timer, achievements, and a weekly planning board.

## Features
- Colorful dashboard with points, streaks, and daily progress ring.
- Task management with filters, categories, and star rewards.
- Reward shop tied to each kid's points.
- Focus timer that awards bonus stars.
- Achievements and leaderboard for friendly motivation.
- Weekly schedule ideas for routine planning.
- Dark mode toggle.

## Run locally
From the repo root:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000` in your browser.

## Add real data
You have two options:

### Option 1: Use the UI (recommended for quick setup)
1. Add kids in the **Family Spotlight** card.
2. Use **+ New Task** and **Add Reward** to build your real data.
3. The app saves to `localStorage`, so refreshing keeps your data.

### Option 2: Preload data with `window.APP_DATA`
Before the `app.js` script in `index.html`, add:

```html
<script>
  window.APP_DATA = {
    kids: [{ id: "kid-1", name: "Ava", avatar: "🦄", points: 0 }],
    tasks: [
      {
        id: "task-1",
        title: "Brush teeth",
        kid: "Ava",
        category: "Morning",
        due: "2025-02-10",
        points: 5,
        completed: false
      }
    ],
    rewards: [{ id: "reward-1", name: "Movie night", cost: 40 }],
    schedule: [{ day: "Mon", idea: "Morning stretch + tidy toys" }],
    stats: {
      completed: 0,
      streak: 0,
      lastCompletionDate: null
    }
  };
</script>
```

The app will load `window.APP_DATA` on first run, then persist updates to `localStorage`.

## Supabase setup (direct browser mode)
This project is wired to Supabase via `window.SUPABASE_CONFIG` in `index.html`.

1. Create the tables below in Supabase (SQL editor).
2. Confirm Row Level Security (RLS) policies allow your anon key to read/write.

```sql
create table if not exists kids (
  id uuid primary key,
  name text not null,
  avatar text,
  points int default 0,
  created_at timestamp with time zone default now()
);

create table if not exists tasks (
  id uuid primary key,
  title text not null,
  kid text not null,
  category text,
  due date,
  points int default 0,
  completed boolean default false,
  created_at timestamp with time zone default now()
);

create table if not exists rewards (
  id uuid primary key,
  name text not null,
  cost int default 0,
  created_at timestamp with time zone default now()
);

create table if not exists schedule (
  id uuid primary key,
  day text not null,
  idea text not null,
  created_at timestamp with time zone default now()
);

create table if not exists stats (
  id text primary key,
  completed int default 0,
  streak int default 0,
  last_completion_date date
);
```
