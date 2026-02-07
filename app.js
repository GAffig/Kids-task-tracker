const taskList = document.getElementById("taskList");
const taskFilters = document.getElementById("taskFilters");
const pointsSummary = document.getElementById("pointsSummary");
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

const kids = ["Ava", "Leo", "Mia"];
const defaultTasks = [
  {
    id: "t1",
    title: "Make the bed",
    kid: "Ava",
    category: "Morning",
    due: todayISO(),
    points: 5,
    completed: false,
  },
  {
    id: "t2",
    title: "Pack school bag",
    kid: "Leo",
    category: "School",
    due: todayISO(),
    points: 8,
    completed: true,
  },
  {
    id: "t3",
    title: "Feed the pet",
    kid: "Mia",
    category: "Home",
    due: todayISO(),
    points: 6,
    completed: false,
  },
  {
    id: "t4",
    title: "Share a compliment",
    kid: "Ava",
    category: "Kindness",
    due: addDays(1),
    points: 7,
    completed: false,
  },
  {
    id: "t5",
    title: "Read for 20 minutes",
    kid: "Leo",
    category: "Adventure",
    due: addDays(2),
    points: 10,
    completed: false,
  },
];

const defaultRewards = [
  { id: "r1", name: "Extra story time", cost: 25 },
  { id: "r2", name: "Choose movie night", cost: 40 },
  { id: "r3", name: "Bake a treat", cost: 30 },
];

const scheduleIdeas = [
  { day: "Mon", idea: "Morning stretch + tidy toys" },
  { day: "Tue", idea: "Library visit + gratitude note" },
  { day: "Wed", idea: "Garden helper + science show" },
  { day: "Thu", idea: "Music practice + kindness call" },
  { day: "Fri", idea: "Art hour + family dance" },
  { day: "Sat", idea: "Nature walk + picnic prep" },
  { day: "Sun", idea: "Plan the week + rest day" },
];

const state = {
  tasks: loadData("tasks", defaultTasks),
  rewards: loadData("rewards", defaultRewards),
  stats: loadData("stats", buildDefaultStats()),
  filter: "all",
  activeKid: "Ava",
  selectedRewardKid: "Ava",
  timer: {
    duration: 15 * 60,
    remaining: 15 * 60,
    running: false,
    intervalId: null,
  },
};

init();

function init() {
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

  document.querySelectorAll(".kid-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      state.activeKid = chip.dataset.kid;
      document
        .querySelectorAll(".kid-chip")
        .forEach((node) => node.classList.toggle("active", node === chip));
      renderAll();
    });
  });

  openTaskForm.addEventListener("click", () => taskModal.showModal());
  closeTaskForm.addEventListener("click", () => taskModal.close());

  taskForm.addEventListener("submit", (event) => {
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
    persist();
    taskForm.reset();
    taskModal.close();
    renderAll();
  });

  rewardForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(rewardForm);
    const reward = {
      id: crypto.randomUUID(),
      name: formData.get("reward").toString(),
      cost: Number(formData.get("cost")),
    };
    state.rewards.push(reward);
    persist();
    rewardForm.reset();
    renderRewards();
  });

  rewardKidSelect.addEventListener("change", (event) => {
    state.selectedRewardKid = event.target.value;
    renderRewards();
  });

  document.getElementById("shufflePlan").addEventListener("click", () => {
    scheduleIdeas.push(scheduleIdeas.shift());
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
  renderTasks();
  renderPoints();
  renderProgress();
  renderBadges();
  renderLeaderboard();
  renderSchedule();
  renderRewards();
  populateRewardKidSelect();
}

function renderTasks() {
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
      toggleTask(task.id, event.target.checked);
    });
    item.querySelector("button").addEventListener("click", () => {
      toggleTask(task.id, !task.completed);
    });

    taskList.appendChild(item);
  });
}

function renderPoints() {
  pointsSummary.innerHTML = kids
    .map((kid) => {
      const points = state.stats[kid].points;
      return `<div class="point-row"><span>${kid}</span><span>${points} ⭐</span></div>`;
    })
    .join("");
}

function renderProgress() {
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
  const sorted = [...kids].sort(
    (a, b) => state.stats[b].points - state.stats[a].points
  );
  leaderboard.innerHTML = sorted
    .map((kid) => `<li>${kid} • ${state.stats[kid].points} ⭐</li>`)
    .join("");
}

function renderSchedule() {
  scheduleGrid.innerHTML = scheduleIdeas
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
  const kidPoints = state.stats[state.selectedRewardKid].points;
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
    button.addEventListener("click", () => {
      const rewardId = button.dataset.reward;
      const reward = state.rewards.find((item) => item.id === rewardId);
      if (!reward) return;
      if (state.stats[state.selectedRewardKid].points < reward.cost) return;
      state.stats[state.selectedRewardKid].points -= reward.cost;
      persist();
      renderAll();
    });
  });
}

function populateRewardKidSelect() {
  rewardKidSelect.innerHTML = kids
    .map(
      (kid) =>
        `<option value="${kid}" ${
          state.selectedRewardKid === kid ? "selected" : ""
        }>${kid}</option>`
    )
    .join("");
}

function toggleTask(taskId, completed) {
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task) return;
  if (task.completed === completed) return;
  task.completed = completed;

  if (completed) {
    state.stats[task.kid].points += task.points;
    state.stats.completed += 1;
    updateStreak();
  } else {
    state.stats[task.kid].points = Math.max(
      0,
      state.stats[task.kid].points - task.points
    );
    state.stats.completed = Math.max(0, state.stats.completed - 1);
  }

  persist();
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
      state.stats[state.activeKid].points += 3;
      persist();
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
  return kids.reduce((sum, kid) => sum + state.stats[kid].points, 0);
}

function buildDefaultStats() {
  return {
    Ava: { points: 20 },
    Leo: { points: 15 },
    Mia: { points: 12 },
    completed: 3,
    streak: 1,
    lastCompletionDate: todayISO(),
  };
}

function loadData(key, fallback) {
  const saved = localStorage.getItem(key);
  return saved ? JSON.parse(saved) : fallback;
}

function persist() {
  localStorage.setItem("tasks", JSON.stringify(state.tasks));
  localStorage.setItem("rewards", JSON.stringify(state.rewards));
  localStorage.setItem("stats", JSON.stringify(state.stats));
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
