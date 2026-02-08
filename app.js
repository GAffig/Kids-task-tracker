const themeToggle = document.getElementById("themeToggle");
const homeButton = document.getElementById("homeButton");
const toggleThemeCard = document.getElementById("toggleThemeCard");
const resetData = document.getElementById("resetData");

const homeSection = document.getElementById("homeSection");
const parentSection = document.getElementById("parentSection");
const kidsLoginSection = document.getElementById("kidsLoginSection");
const kidDashboardSection = document.getElementById("kidDashboardSection");
const reportsSection = document.getElementById("reportsSection");
const settingsSection = document.getElementById("settingsSection");

const kidForm = document.getElementById("kidForm");
const taskForm = document.getElementById("taskForm");
const assignForm = document.getElementById("assignForm");
const kidList = document.getElementById("kidList");
const taskList = document.getElementById("taskList");
const assignmentList = document.getElementById("assignmentList");
const assignKid = document.getElementById("assignKid");
const assignTask = document.getElementById("assignTask");

const kidsLoginForm = document.getElementById("kidsLoginForm");
const kidsLoginKid = document.getElementById("kidsLoginKid");
const kidsLoginError = document.getElementById("kidsLoginError");
const kidDashboardTitle = document.getElementById("kidDashboardTitle");
const kidTotalXp = document.getElementById("kidTotalXp");
const kidCompleted = document.getElementById("kidCompleted");
const kidTaskBoard = document.getElementById("kidTaskBoard");
const kidLogout = document.getElementById("kidLogout");

const reportKids = document.getElementById("reportKids");
const reportTasks = document.getElementById("reportTasks");
const reportAssignments = document.getElementById("reportAssignments");
const reportCompleted = document.getElementById("reportCompleted");

const sections = [
  homeSection,
  parentSection,
  kidsLoginSection,
  kidDashboardSection,
  reportsSection,
  settingsSection,
];

const state = {
  kids: loadData("kids", []),
  tasks: loadData("tasks", []),
  assignments: loadData("assignments", []),
  activeKidId: loadData("activeKidId", null),
};

let timer = null;

init();

function init() {
  bindNavigation();
  bindForms();
  renderAll();
  startTimerLoop();
}

function bindNavigation() {
  document.querySelectorAll("[data-target]").forEach((button) => {
    button.addEventListener("click", () => showSection(button.dataset.target));
  });

  homeButton.addEventListener("click", () => showSection("homeSection"));
  themeToggle.addEventListener("click", toggleTheme);
  toggleThemeCard.addEventListener("click", toggleTheme);
  kidLogout.addEventListener("click", () => {
    state.activeKidId = null;
    saveState();
    showSection("homeSection");
  });
  resetData.addEventListener("click", () => {
    if (!window.confirm("Reset all kids, tasks, and assignments?")) return;
    state.kids = [];
    state.tasks = [];
    state.assignments = [];
    state.activeKidId = null;
    saveState();
    renderAll();
    showSection("homeSection");
  });
}

function bindForms() {
  kidForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(kidForm);
    const name = formData.get("name").toString().trim();
    const pin = formData.get("pin").toString().trim();
    if (!name || pin.length !== 4) return;
    state.kids.push({
      id: crypto.randomUUID(),
      name,
      pin,
      totalXp: 0,
    });
    kidForm.reset();
    saveState();
    renderAll();
  });

  taskForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(taskForm);
    const title = formData.get("title").toString().trim();
    const xp = Number(formData.get("xp"));
    const minutes = Number(formData.get("minutes"));
    if (!title) return;
    state.tasks.push({
      id: crypto.randomUUID(),
      title,
      xp,
      minutes,
    });
    taskForm.reset();
    saveState();
    renderAll();
  });

  assignForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(assignForm);
    const kidId = formData.get("kid").toString();
    const taskId = formData.get("task").toString();
    if (!kidId || !taskId) return;
    state.assignments.push({
      id: crypto.randomUUID(),
      kidId,
      taskId,
      status: "assigned",
      elapsedSeconds: 0,
      running: false,
    });
    assignForm.reset();
    saveState();
    renderAll();
  });

  kidsLoginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    kidsLoginError.textContent = "";
    const formData = new FormData(kidsLoginForm);
    const kidId = formData.get("kid").toString();
    const pin = formData.get("pin").toString().trim();
    const kid = state.kids.find((item) => item.id === kidId);
    if (!kid || kid.pin !== pin) {
      kidsLoginError.textContent = "Incorrect PIN. Try again.";
      return;
    }
    state.activeKidId = kidId;
    saveState();
    kidsLoginForm.reset();
    showSection("kidDashboardSection");
    renderKidDashboard();
  });
}

function renderAll() {
  renderKids();
  renderTasks();
  renderAssignments();
  renderSelects();
  renderReports();
  renderKidDashboard();
}

function renderKids() {
  kidList.innerHTML = "";
  if (!state.kids.length) {
    kidList.innerHTML = "<li>No kids yet.</li>";
    return;
  }
  kidList.innerHTML = state.kids
    .map((kid) => `<li>${kid.name} • PIN ${kid.pin}</li>`)
    .join("");
}

function renderTasks() {
  taskList.innerHTML = "";
  if (!state.tasks.length) {
    taskList.innerHTML = "<li>No tasks yet.</li>";
    return;
  }
  taskList.innerHTML = state.tasks
    .map((task) => `<li>${task.title} • ${task.xp} XP • ${task.minutes} min</li>`)
    .join("");
}

function renderAssignments() {
  assignmentList.innerHTML = "";
  if (!state.assignments.length) {
    assignmentList.innerHTML = "<li>No assignments yet.</li>";
    return;
  }
  assignmentList.innerHTML = state.assignments
    .map((assignment) => {
      const kid = state.kids.find((item) => item.id === assignment.kidId);
      const task = state.tasks.find((item) => item.id === assignment.taskId);
      return `<li>${kid?.name ?? "Unknown"} → ${task?.title ?? "Task"}</li>`;
    })
    .join("");
}

function renderSelects() {
  const kidOptions = state.kids
    .map((kid) => `<option value="${kid.id}">${kid.name}</option>`)
    .join("");
  const taskOptions = state.tasks
    .map((task) => `<option value="${task.id}">${task.title}</option>`)
    .join("");

  assignKid.innerHTML = kidOptions || '<option value="">No kids</option>';
  assignTask.innerHTML = taskOptions || '<option value="">No tasks</option>';
  kidsLoginKid.innerHTML = kidOptions || '<option value="">No kids</option>';
}

function renderKidDashboard() {
  if (!state.activeKidId) return;
  const kid = state.kids.find((item) => item.id === state.activeKidId);
  if (!kid) return;

  kidDashboardTitle.textContent = `${kid.name}'s Tasks`;
  const kidAssignments = state.assignments.filter(
    (assignment) => assignment.kidId === kid.id
  );

  kidTotalXp.textContent = kid.totalXp;
  kidCompleted.textContent = kidAssignments.filter(
    (assignment) => assignment.status === "completed"
  ).length;

  if (!kidAssignments.length) {
    kidTaskBoard.innerHTML = "<li class=\"task-card\">No tasks assigned yet.</li>";
    return;
  }

  kidTaskBoard.innerHTML = kidAssignments
    .map((assignment) => renderKidTaskCard(assignment))
    .join("");

  kidTaskBoard.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const assignmentId = button.dataset.id;
      const action = button.dataset.action;
      handleTaskAction(assignmentId, action);
    });
  });
}

function renderKidTaskCard(assignment) {
  const task = state.tasks.find((item) => item.id === assignment.taskId);
  const timerValue = formatTimer(assignment.elapsedSeconds);
  return `
    <li class="task-card">
      <div>
        <strong>${task?.title ?? "Task"}</strong>
        <div class="task-meta">
          <span>XP: ${task?.xp ?? 0}</span>
          <span>Estimated: ${task?.minutes ?? 0} min</span>
          <span>Status: ${assignment.status}</span>
          <span>Time: ${timerValue}</span>
        </div>
      </div>
      <div class="task-actions">
        <button class="primary" data-action="start" data-id="${assignment.id}">Start</button>
        <button class="ghost" data-action="pause" data-id="${assignment.id}">Pause</button>
        <button class="ghost" data-action="finish" data-id="${assignment.id}">Finish</button>
        <button class="ghost" data-action="restart" data-id="${assignment.id}">Restart</button>
      </div>
    </li>
  `;
}

function handleTaskAction(assignmentId, action) {
  const assignment = state.assignments.find((item) => item.id === assignmentId);
  if (!assignment) return;
  if (action === "start") {
    assignment.running = true;
    assignment.status = "in-progress";
  }
  if (action === "pause") {
    assignment.running = false;
  }
  if (action === "finish") {
    if (assignment.status !== "completed") {
      assignment.status = "completed";
      assignment.running = false;
      const task = state.tasks.find((item) => item.id === assignment.taskId);
      const kid = state.kids.find((item) => item.id === assignment.kidId);
      if (task && kid) {
        kid.totalXp += task.xp;
      }
    }
  }
  if (action === "restart") {
    assignment.running = false;
    assignment.status = "assigned";
    assignment.elapsedSeconds = 0;
  }
  saveState();
  renderKidDashboard();
  renderReports();
}

function renderReports() {
  reportKids.textContent = state.kids.length;
  reportTasks.textContent = state.tasks.length;
  reportAssignments.textContent = state.assignments.length;
  reportCompleted.textContent = state.assignments.filter(
    (assignment) => assignment.status === "completed"
  ).length;
}

function showSection(sectionId) {
  sections.forEach((section) => {
    section.classList.toggle("hidden", section.id !== sectionId);
  });
  if (sectionId === "kidDashboardSection") {
    renderKidDashboard();
  }
  if (sectionId === "reportsSection") {
    renderReports();
  }
}

function toggleTheme() {
  document.body.classList.toggle("dark");
}

function startTimerLoop() {
  if (timer) clearInterval(timer);
  timer = setInterval(() => {
    let updated = false;
    state.assignments.forEach((assignment) => {
      if (assignment.running) {
        assignment.elapsedSeconds += 1;
        updated = true;
      }
    });
    if (updated) {
      saveState();
      renderKidDashboard();
    }
  }, 1000);
}

function formatTimer(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function saveState() {
  localStorage.setItem("kids", JSON.stringify(state.kids));
  localStorage.setItem("tasks", JSON.stringify(state.tasks));
  localStorage.setItem("assignments", JSON.stringify(state.assignments));
  localStorage.setItem("activeKidId", JSON.stringify(state.activeKidId));
}

function loadData(key, fallback) {
  const saved = localStorage.getItem(key);
  return saved ? JSON.parse(saved) : fallback;
}
