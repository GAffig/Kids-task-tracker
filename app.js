const taskList = document.getElementById("taskList");
const taskFilters = document.getElementById("taskFilters");
const pointsSummary = document.getElementById("pointsSummary");
const kidList = document.getElementById("kidList");
const kidForm = document.getElementById("kidForm");
const taskKidSelect = document.getElementById("taskKidSelect");
const tasksCard = document.getElementById("tasksCard");
const scheduleCard = document.getElementById("scheduleCard");
const rewardCard = document.getElementById("rewardCard");
const achievementsCard = document.getElementById("achievementsCard");
const leaderboardCard = document.getElementById("leaderboardCard");
const progressCard = document.getElementById("progressCard");
const timerCard = document.getElementById("timerCard");
const progressRing = document.getElementById("progressRing");
const progressPercent = document.getElementById("progressPercent");
const todayCounts = document.getElementById("todayCounts");
const streakCount = document.getElementById("streakCount");
const badgeGrid = document.getElementById("badgeGrid");
const leaderboard = document.getElementById("leaderboard");
const scheduleGrid = document.getElementById("scheduleGrid");
const rewardList = document.getElementById("rewardList");
const rewardForm = document.getElementById("rewardForm");
const rewardKidSelect = document.getElementById("rewardKidSelect");
const taskModal = document.getElementById("taskModal");
const openTaskForm = document.getElementById("openTaskForm");
const closeTaskForm = document.getElementById("closeTaskForm");
const taskForm = document.getElementById("taskForm");
const themeToggle = document.getElementById("themeToggle");

const timerDisplay = document.getElementById("timerDisplay");
const startTimer = document.getElementById("startTimer");
const resetTimer = document.getElementById("resetTimer");
const timerBar = document.getElementById("timerBar");

const appData = window.APP_DATA ?? {};
const supabaseConfig = window.SUPABASE_CONFIG ?? {};
const supabaseClient =
  supabaseConfig.url && supabaseConfig.anonKey && window.supabase
    ? window.supabase.createClient(supabaseConfig.url, supabaseConfig.anonKey)
    : null;
const useSupabase = Boolean(supabaseClient);

const state = {
  kids: [],
  tasks: [],
  rewards: [],
  stats: buildDefaultStats(),
  schedule: [],
  filter: "all",
  activeKid: null,
  selectedRewardKid: null,
  timer: {
    duration: 15 * 60,
    remaining: 15 * 60,
    running: false,
    intervalId: null,
  },
};

init().catch((error) => {
  console.error("Failed to initialize app", error);
  hydrateFromLocal();
  ensureActiveKid();
  renderAll();
  bindEvents();
});

async function init() {
  if (useSupabase) {
    await hydrateFromSupabase();
  } else {
    hydrateFromLocal();
  }
  ensureActiveKid();
  renderAll();
  bindEvents();
}

function bindEvents() {
  taskFilters.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    const filter = button.dataset.filter;
    if (!filter) return;
    state.filter = filter;
    [...taskFilters.children].forEach((chip) =>
      chip.classList.toggle("active", chip.dataset.filter === filter)
    );
    renderTasks();
  });

  kidList.addEventListener("click", (event) => {
    const chip = event.target.closest(".kid-chip");
    if (!chip) return;
    state.activeKid = chip.dataset.kid;
    renderAll();
  });

  openTaskForm.addEventListener("click", () => taskModal.showModal());
  closeTaskForm.addEventListener("click", () => taskModal.close());

  taskForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(taskForm);
    const newTask = {
      id: crypto.randomUUID(),
      title: formData.get("title").toString(),
      kid: formData.get("kid").toString(),
      category: formData.get("category").toString(),
      due: formData.get("due").toString(),
      points: Number(formData.get("points")),
      completed: false,
    };
    state.tasks.unshift(newTask);
    await persist();
    taskForm.reset();
    taskModal.close();
    renderAll();
  });

  kidForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(kidForm);
    const name = formData.get("name").toString().trim();
    if (!name) return;
    const avatar = formData.get("avatar").toString().trim() || "🌟";
    state.kids.push({ id: crypto.randomUUID(), name, avatar, points: 0 });
    if (!state.activeKid) {
      state.activeKid = name;
      state.selectedRewardKid = name;
    }
    await persist();
    kidForm.reset();
    renderAll();
  });

  rewardForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(rewardForm);
    const reward = {
      id: crypto.randomUUID(),
      name: formData.get("reward").toString(),
      cost: Number(formData.get("cost")),
    };
    state.rewards.push(reward);
    await persist();
    rewardForm.reset();
    renderRewards();
  });

  rewardKidSelect.addEventListener("change", (event) => {
    state.selectedRewardKid = event.target.value;
    renderRewards();
  });

  document.getElementById("shufflePlan").addEventListener("click", () => {
    if (state.schedule.length > 1) {
      state.schedule.push(state.schedule.shift());
    }
    renderSchedule();
  });

  themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark");
  });

  startTimer.addEventListener("click", handleTimerToggle);
  resetTimer.addEventListener("click", resetFocusTimer);
  document.querySelectorAll("[data-duration]").forEach((button) => {
    button.addEventListener("click", () => {
      const duration = Number(button.dataset.duration);
      setTimerDuration(duration * 60);
    });
  });
}

function renderAll() {
  toggleDisabledState();
  renderKids();
  renderTasks();
  renderPoints();
  renderProgress();
  renderBadges();
  renderLeaderboard();
  renderSchedule();
  renderRewards();
  populateRewardKidSelect();
  populateTaskKidSelect();
}

function renderTasks() {
  if (!state.kids.length) {
    taskList.innerHTML =
      '<li class="task-item empty-state">Add a kid to start building tasks.</li>';
    return;
  }
  const filtered = state.tasks.filter((task) => {
    if (state.filter === "completed") return task.completed;
    if (state.filter === "today") return task.due === todayISO();
    return true;
  });

  taskList.innerHTML = "";
  if (filtered.length === 0) {
    taskList.innerHTML = `<li class="task-item">🎉 All done! Add a new quest.</li>`;
    return;
  }

  filtered.forEach((task) => {
    const item = document.createElement("li");
    item.className = `task-item ${task.completed ? "completed" : ""}`;
    item.innerHTML = `
      <label class="checkbox">
        <input type="checkbox" ${task.completed ? "checked" : ""} />
      </label>
      <div>
        <strong>${task.title}</strong>
        <div class="task-meta">
          <span class="tag">${task.kid}</span>
          <span class="tag">${task.category}</span>
          <span class="tag">Due ${formatDate(task.due)}</span>
          <span class="tag">⭐ ${task.points}</span>
        </div>
      </div>
      <button class="ghost" type="button">Celebrate</button>
    `;

    item.querySelector("input").addEventListener("change", (event) => {
      void toggleTask(task.id, event.target.checked);
    });
    item.querySelector("button").addEventListener("click", () => {
      void toggleTask(task.id, !task.completed);
    });

    taskList.appendChild(item);
  });
}

function renderPoints() {
  if (!state.kids.length) {
    pointsSummary.innerHTML =
      '<div class="empty-state">No kids yet. Add your first one!</div>';
    return;
  }
  pointsSummary.innerHTML = state.kids
    .map(
      (kid) =>
        `<div class="point-row"><span>${kid.name}</span><span>${kid.points} ⭐</span></div>`
    )
    .join("");
}

function renderProgress() {
  if (!state.kids.length) {
    progressRing.style.background = "conic-gradient(#e9ecff 0deg, #e9ecff 0deg)";
    progressPercent.textContent = "0%";
    todayCounts.textContent = "0 / 0";
    streakCount.textContent = "0";
    return;
  }
  const totalToday = state.tasks.filter((task) => task.due === todayISO()).length;
  const doneToday = state.tasks.filter(
    (task) => task.due === todayISO() && task.completed
  ).length;
  const percent = totalToday ? Math.round((doneToday / totalToday) * 100) : 0;
  progressRing.style.background = `conic-gradient(var(--accent) ${
    percent * 3.6
  }deg, #e9ecff 0deg)`;
  progressPercent.textContent = `${percent}%`;
  todayCounts.textContent = `${doneToday} / ${totalToday}`;
  streakCount.textContent = state.stats.streak;
}

function renderBadges() {
  const badgeData = [
    {
      title: "First Quest",
      icon: "🌟",
      unlocked: state.stats.completed >= 1,
    },
    {
      title: "Helping Hand",
      icon: "🤝",
      unlocked: state.stats.completed >= 5,
    },
    {
      title: "Star Collector",
      icon: "⭐",
      unlocked: totalPoints() >= 100,
    },
    {
      title: "Super Streak",
      icon: "🔥",
      unlocked: state.stats.streak >= 3,
    },
  ];

  badgeGrid.innerHTML = badgeData
    .map(
      (badge) => `
      <div class="badge ${badge.unlocked ? "" : "locked"}">
        <span>${badge.icon}</span>
        <div>
          <div>${badge.title}</div>
          <small>${badge.unlocked ? "Unlocked" : "Keep going"}</small>
        </div>
      </div>
    `
    )
    .join("");
}

function renderLeaderboard() {
  if (!state.kids.length) {
    leaderboard.innerHTML = '<li class="empty-state">Add kids to get started.</li>';
    return;
  }
  const sorted = [...state.kids].sort((a, b) => b.points - a.points);
  leaderboard.innerHTML = sorted
    .map((kid) => `<li>${kid.name} • ${kid.points} ⭐</li>`)
    .join("");
}

function renderSchedule() {
  if (!state.schedule.length) {
    scheduleGrid.innerHTML =
      '<div class="empty-state">Add a weekly plan to see it here.</div>';
    return;
  }
  scheduleGrid.innerHTML = state.schedule
    .map(
      (day) => `
      <article class="day-card">
        <h4>${day.day}</h4>
        <p class="muted">${day.idea}</p>
      </article>
    `
    )
    .join("");
}

function renderRewards() {
  if (!state.kids.length) {
    rewardList.innerHTML =
      '<li class="reward-item empty-state">Add a kid before creating rewards.</li>';
    return;
  }
  if (!state.rewards.length) {
    rewardList.innerHTML =
      '<li class="reward-item empty-state">Add your first reward to start saving stars.</li>';
    return;
  }
  const selectedKid = getKidByName(state.selectedRewardKid);
  const kidPoints = selectedKid?.points ?? 0;
  rewardList.innerHTML = state.rewards
    .map((reward) => {
      const affordable = kidPoints >= reward.cost;
      return `
        <li class="reward-item">
          <div>
            <strong>${reward.name}</strong>
            <div class="muted">${reward.cost} ⭐</div>
          </div>
          <button class="primary" data-reward="${reward.id}" ${{
            true: "",
            false: "disabled",
          }[affordable]}>
            Redeem
          </button>
        </li>
      `;
    })
    .join("");

  rewardList.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", async () => {
      const rewardId = button.dataset.reward;
      const reward = state.rewards.find((item) => item.id === rewardId);
      if (!reward) return;
      const currentKid = getKidByName(state.selectedRewardKid);
      if ((currentKid?.points ?? 0) < reward.cost) return;
      if (currentKid) {
        currentKid.points = Math.max(0, currentKid.points - reward.cost);
      }
      await persist();
      renderAll();
    });
  });
}

function populateRewardKidSelect() {
  rewardKidSelect.innerHTML = state.kids
    .map(
      (kid) =>
        `<option value="${kid.name}" ${
          state.selectedRewardKid === kid.name ? "selected" : ""
        }>${kid.name}</option>`
    )
    .join("");
}

function populateTaskKidSelect() {
  taskKidSelect.innerHTML = state.kids
    .map((kid) => `<option value="${kid.name}">${kid.name}</option>`)
    .join("");
}

async function toggleTask(taskId, completed) {
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task) return;
  if (task.completed === completed) return;
  task.completed = completed;
  const kid = getKidByName(task.kid);
  if (!kid) return;

  if (completed) {
    kid.points += task.points;
    state.stats.completed += 1;
    updateStreak();
  } else {
    kid.points = Math.max(0, kid.points - task.points);
    state.stats.completed = Math.max(0, state.stats.completed - 1);
  }

  await persist();
  renderAll();
}

function updateStreak() {
  const today = todayISO();
  if (state.stats.lastCompletionDate === today) return;

  if (state.stats.lastCompletionDate === addDays(-1)) {
    state.stats.streak += 1;
  } else {
    state.stats.streak = 1;
  }
  state.stats.lastCompletionDate = today;
}

function setTimerDuration(seconds) {
  state.timer.duration = seconds;
  state.timer.remaining = seconds;
  updateTimerUI();
}

function handleTimerToggle() {
  if (state.timer.running) {
    clearInterval(state.timer.intervalId);
    state.timer.running = false;
    startTimer.textContent = "Start";
    return;
  }

  state.timer.running = true;
  startTimer.textContent = "Pause";
  state.timer.intervalId = setInterval(() => {
    state.timer.remaining -= 1;
    if (state.timer.remaining <= 0) {
      clearInterval(state.timer.intervalId);
      state.timer.running = false;
      state.timer.remaining = 0;
      startTimer.textContent = "Start";
      const activeKid = getKidByName(state.activeKid);
      if (activeKid) {
        activeKid.points += 3;
      }
      void persist();
      renderAll();
    }
    updateTimerUI();
  }, 1000);
}

function resetFocusTimer() {
  clearInterval(state.timer.intervalId);
  state.timer.running = false;
  startTimer.textContent = "Start";
  state.timer.remaining = state.timer.duration;
  updateTimerUI();
}

function updateTimerUI() {
  timerDisplay.textContent = formatTimer(state.timer.remaining);
  const progress =
    ((state.timer.duration - state.timer.remaining) / state.timer.duration) * 100;
  timerBar.style.width = `${progress}%`;
}

function totalPoints() {
  return state.kids.reduce(
    (sum, kid) => sum + (kid.points ?? 0),
    0
  );
}

function buildDefaultStats() {
  return {
    completed: 0,
    streak: 0,
    lastCompletionDate: null,
  };
}

function loadData(key, fallback) {
  const saved = localStorage.getItem(key);
  return saved ? JSON.parse(saved) : fallback;
}

function hydrateFromLocal() {
  state.kids = normalizeKids(loadData("kids", appData.kids ?? []));
  state.tasks = normalizeTasks(loadData("tasks", appData.tasks ?? []));
  state.rewards = normalizeRewards(loadData("rewards", appData.rewards ?? []));
  state.schedule = normalizeSchedule(loadData("schedule", appData.schedule ?? []));
  state.stats = loadData("stats", appData.stats ?? buildDefaultStats());
}

async function hydrateFromSupabase() {
  const [kidsResult, tasksResult, rewardsResult, scheduleResult, statsResult] =
    await Promise.all([
      supabaseClient.from("kids").select("*").order("created_at"),
      supabaseClient.from("tasks").select("*").order("created_at"),
      supabaseClient.from("rewards").select("*").order("created_at"),
      supabaseClient.from("schedule").select("*").order("created_at"),
      supabaseClient.from("stats").select("*").eq("id", "global").maybeSingle(),
    ]);

  if (kidsResult.error) throw kidsResult.error;
  if (tasksResult.error) throw tasksResult.error;
  if (rewardsResult.error) throw rewardsResult.error;
  if (scheduleResult.error) throw scheduleResult.error;
  if (statsResult.error) throw statsResult.error;

  state.kids = normalizeKids(kidsResult.data ?? []);
  state.tasks = normalizeTasks(tasksResult.data ?? []);
  state.rewards = normalizeRewards(rewardsResult.data ?? []);
  state.schedule = normalizeSchedule(scheduleResult.data ?? []);
  state.stats = statsResult.data
    ? {
        completed: statsResult.data.completed ?? 0,
        streak: statsResult.data.streak ?? 0,
        lastCompletionDate: statsResult.data.last_completion_date ?? null,
      }
    : buildDefaultStats();

  cacheLocal();
}

async function persist() {
  if (useSupabase) {
    await saveToSupabase();
  }
  cacheLocal();
}

function cacheLocal() {
  localStorage.setItem("kids", JSON.stringify(state.kids));
  localStorage.setItem("tasks", JSON.stringify(state.tasks));
  localStorage.setItem("rewards", JSON.stringify(state.rewards));
  localStorage.setItem("stats", JSON.stringify(state.stats));
  localStorage.setItem("schedule", JSON.stringify(state.schedule));
}

async function saveToSupabase() {
  if (!supabaseClient) return;
  const kidsPayload = state.kids.map((kid) => ({
    id: kid.id,
    name: kid.name,
    avatar: kid.avatar,
    points: kid.points ?? 0,
  }));
  const tasksPayload = state.tasks.map((task) => ({
    id: task.id,
    title: task.title,
    kid: task.kid,
    category: task.category,
    due: task.due,
    points: task.points,
    completed: task.completed,
  }));
  const rewardsPayload = state.rewards.map((reward) => ({
    id: reward.id,
    name: reward.name,
    cost: reward.cost,
  }));
  const schedulePayload = state.schedule.map((item) => ({
    id: item.id,
    day: item.day,
    idea: item.idea,
  }));

  const operations = [
    kidsPayload.length
      ? supabaseClient.from("kids").upsert(kidsPayload, { onConflict: "id" })
      : Promise.resolve({ error: null }),
    tasksPayload.length
      ? supabaseClient.from("tasks").upsert(tasksPayload, { onConflict: "id" })
      : Promise.resolve({ error: null }),
    rewardsPayload.length
      ? supabaseClient.from("rewards").upsert(rewardsPayload, { onConflict: "id" })
      : Promise.resolve({ error: null }),
    schedulePayload.length
      ? supabaseClient.from("schedule").upsert(schedulePayload, { onConflict: "id" })
      : Promise.resolve({ error: null }),
    supabaseClient.from("stats").upsert(
      {
        id: "global",
        completed: state.stats.completed,
        streak: state.stats.streak,
        last_completion_date: state.stats.lastCompletionDate,
      },
      { onConflict: "id" }
    ),
  ];

  const [kidsResult, tasksResult, rewardsResult, scheduleResult, statsResult] =
    await Promise.all(operations);

  if (kidsResult.error) throw kidsResult.error;
  if (tasksResult.error) throw tasksResult.error;
  if (rewardsResult.error) throw rewardsResult.error;
  if (scheduleResult.error) throw scheduleResult.error;
  if (statsResult.error) throw statsResult.error;
}

function normalizeKids(kids) {
  return kids.map((kid) => ({
    id: kid.id ?? crypto.randomUUID(),
    name: kid.name,
    avatar: kid.avatar ?? "🌟",
    points: Number(kid.points ?? 0),
  }));
}

function normalizeTasks(tasks) {
  return tasks.map((task) => ({
    id: task.id ?? crypto.randomUUID(),
    title: task.title,
    kid: task.kid,
    category: task.category,
    due: task.due,
    points: Number(task.points ?? 0),
    completed: Boolean(task.completed),
  }));
}

function normalizeRewards(rewards) {
  return rewards.map((reward) => ({
    id: reward.id ?? crypto.randomUUID(),
    name: reward.name,
    cost: Number(reward.cost ?? 0),
  }));
}

function normalizeSchedule(schedule) {
  return schedule.map((item) => ({
    id: item.id ?? crypto.randomUUID(),
    day: item.day,
    idea: item.idea,
  }));
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(amount) {
  const date = new Date();
  date.setDate(date.getDate() + amount);
  return date.toISOString().slice(0, 10);
}

function formatDate(value) {
  const date = new Date(value + "T00:00:00");
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatTimer(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(
    2,
    "0"
  )}`;
}

updateTimerUI();

function ensureActiveKid() {
  if (!state.kids.length) {
    state.activeKid = null;
    state.selectedRewardKid = null;
    return;
  }
  if (!state.activeKid || !state.kids.find((kid) => kid.name === state.activeKid)) {
    state.activeKid = state.kids[0].name;
  }
  if (
    !state.selectedRewardKid ||
    !state.kids.find((kid) => kid.name === state.selectedRewardKid)
  ) {
    state.selectedRewardKid = state.kids[0].name;
  }
}

function renderKids() {
  if (!state.kids.length) {
    kidList.innerHTML =
      '<div class="empty-state">Add your first kid to get started.</div>';
    return;
  }
  kidList.innerHTML = state.kids
    .map(
      (kid) => `
      <button class="kid-chip ${
        state.activeKid === kid.name ? "active" : ""
      }" data-kid="${kid.name}">
        <span class="avatar">${kid.avatar ?? "🌟"}</span>
        ${kid.name}
      </button>
    `
    )
    .join("");
}

function getKidByName(name) {
  return state.kids.find((kid) => kid.name === name);
}

function toggleDisabledState() {
  const disabled = !state.kids.length;
  [
    tasksCard,
    scheduleCard,
    rewardCard,
    achievementsCard,
    leaderboardCard,
    progressCard,
    timerCard,
  ].forEach((card) => card.classList.toggle("is-disabled", disabled));
  openTaskForm.disabled = disabled;
  rewardForm.querySelectorAll("input, button").forEach((input) => {
    input.disabled = disabled;
  });
  startTimer.disabled = disabled;
  resetTimer.disabled = disabled;
  taskKidSelect.disabled = disabled;
}
