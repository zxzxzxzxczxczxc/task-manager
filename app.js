const STORAGE_KEYS = {
  tasks: "task-manager.tasks.v1",
  tags: "task-manager.tags.v1",
  theme: "task-manager.theme.v1",
};

const taskForm = document.getElementById("taskForm");
const titleInput = document.getElementById("titleInput");
const descriptionInput = document.getElementById("descriptionInput");
const deadlineInput = document.getElementById("deadlineInput");
const newTagInput = document.getElementById("newTagInput");
const createTagBtn = document.getElementById("createTagBtn");
const tagOptions = document.getElementById("tagOptions");
const searchInput = document.getElementById("searchInput");
const taskList = document.getElementById("taskList");
const emptyState = document.getElementById("emptyState");
const themeToggle = document.getElementById("themeToggle");

const editDialog = document.getElementById("editDialog");
const editForm = document.getElementById("editForm");
const editTitleInput = document.getElementById("editTitleInput");
const editDescriptionInput = document.getElementById("editDescriptionInput");
const editDeadlineInput = document.getElementById("editDeadlineInput");
const editTagOptions = document.getElementById("editTagOptions");
const cancelEditBtn = document.getElementById("cancelEditBtn");

let tasks = [];
let tags = [];
let selectedCreateTags = new Set();
let selectedEditTags = new Set();
let editingTaskId = null;

function loadJson(key, fallbackValue) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallbackValue;
  } catch {
    return fallbackValue;
  }
}

function saveJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function normalizeTag(tag) {
  return tag.trim().replace(/\s+/g, " ");
}

function tagEquals(tagA, tagB) {
  return tagA.toLowerCase() === tagB.toLowerCase();
}

function hasTag(tagValue) {
  return tags.some((tag) => tagEquals(tag, tagValue));
}

function addTag(tagValue) {
  const normalized = normalizeTag(tagValue);
  if (!normalized || hasTag(normalized)) {
    return null;
  }
  tags.push(normalized);
  tags.sort((a, b) => a.localeCompare(b, "ru"));
  saveJson(STORAGE_KEYS.tags, tags);
  return normalized;
}

function todayIso() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isOverdue(deadline) {
  return Boolean(deadline && deadline < todayIso());
}

function formatDeadline(deadline) {
  if (!deadline) {
    return "Без дедлайна";
  }
  const [year, month, day] = deadline.split("-");
  return new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString("ru-RU");
}

function ensureTagsFromTasks() {
  tasks.forEach((task) => {
    (task.tags || []).forEach((tag) => {
      if (!hasTag(tag)) {
        tags.push(tag);
      }
    });
  });
  tags.sort((a, b) => a.localeCompare(b, "ru"));
}

function saveTasks() {
  saveJson(STORAGE_KEYS.tasks, tasks);
}

function renderTagSelectors() {
  tagOptions.innerHTML = "";
  editTagOptions.innerHTML = "";

  if (!tags.length) {
    tagOptions.textContent = "Тегов пока нет";
    editTagOptions.textContent = "Тегов пока нет";
    return;
  }

  tags.forEach((tag) => {
    const createLabel = document.createElement("label");
    createLabel.className = "tag-pill";
    const createCheckbox = document.createElement("input");
    createCheckbox.type = "checkbox";
    createCheckbox.checked = selectedCreateTags.has(tag);
    createCheckbox.addEventListener("change", () => {
      if (createCheckbox.checked) {
        selectedCreateTags.add(tag);
      } else {
        selectedCreateTags.delete(tag);
      }
    });
    createLabel.append(createCheckbox, document.createTextNode(tag));
    tagOptions.append(createLabel);

    const editLabel = document.createElement("label");
    editLabel.className = "tag-pill";
    const editCheckbox = document.createElement("input");
    editCheckbox.type = "checkbox";
    editCheckbox.checked = selectedEditTags.has(tag);
    editCheckbox.addEventListener("change", () => {
      if (editCheckbox.checked) {
        selectedEditTags.add(tag);
      } else {
        selectedEditTags.delete(tag);
      }
    });
    editLabel.append(editCheckbox, document.createTextNode(tag));
    editTagOptions.append(editLabel);
  });
}

function getFilteredTasks() {
  const query = searchInput.value.trim().toLowerCase();
  if (!query) {
    return tasks;
  }

  return tasks.filter((task) => {
    const searchableText = [
      task.title,
      task.description,
      (task.tags || []).join(" "),
      task.deadline || "",
    ]
      .join(" ")
      .toLowerCase();
    return searchableText.includes(query);
  });
}

function renderTasks() {
  const filtered = getFilteredTasks();
  taskList.innerHTML = "";
  emptyState.style.display = filtered.length ? "none" : "block";

  filtered.forEach((task) => {
    const item = document.createElement("article");
    item.className = `task-item${isOverdue(task.deadline) ? " overdue" : ""}`;
    item.dataset.id = task.id;

    const tagsHtml = (task.tags || [])
      .map((tag) => `<span class="tag-pill">${escapeHtml(tag)}</span>`)
      .join("");

    const deadlineClass = isOverdue(task.deadline) ? "deadline overdue" : "deadline";
    const overdueLabel = isOverdue(task.deadline) ? " (просрочено)" : "";

    item.innerHTML = `
      <div class="task-head">
        <h3 class="task-title">${escapeHtml(task.title)}</h3>
        <div class="actions">
          <button type="button" class="secondary" data-action="edit">Изменить</button>
          <button type="button" class="secondary" data-action="delete">Удалить</button>
        </div>
      </div>
      <p class="task-description">${escapeHtml(task.description || "Без описания")}</p>
      <div class="task-meta">
        <span class="${deadlineClass}">Дедлайн: ${escapeHtml(formatDeadline(task.deadline))}${overdueLabel}</span>
        ${tagsHtml}
      </div>
    `;
    taskList.append(item);
  });
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function resetCreateForm() {
  taskForm.reset();
  selectedCreateTags.clear();
  renderTagSelectors();
}

function setTheme(theme) {
  const effective = theme === "dark" ? "dark" : "light";
  document.body.dataset.theme = effective;
  localStorage.setItem(STORAGE_KEYS.theme, effective);
}

function openEditDialog(taskId) {
  const task = tasks.find((entry) => entry.id === taskId);
  if (!task) {
    return;
  }
  editingTaskId = task.id;
  editTitleInput.value = task.title;
  editDescriptionInput.value = task.description || "";
  editDeadlineInput.value = task.deadline || "";
  selectedEditTags = new Set(task.tags || []);
  renderTagSelectors();
  editDialog.showModal();
}

function closeEditDialog() {
  editingTaskId = null;
  selectedEditTags = new Set();
  editForm.reset();
  editDialog.close();
}

createTagBtn.addEventListener("click", () => {
  const created = addTag(newTagInput.value);
  if (created) {
    newTagInput.value = "";
    selectedCreateTags.add(created);
    if (editingTaskId) {
      selectedEditTags.add(created);
    }
    renderTagSelectors();
  }
});

taskForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = titleInput.value.trim();
  if (!title) {
    return;
  }

  const task = {
    id: crypto.randomUUID(),
    title,
    description: descriptionInput.value.trim(),
    deadline: deadlineInput.value || "",
    tags: [...selectedCreateTags],
    createdAt: Date.now(),
  };

  tasks.unshift(task);
  saveTasks();
  resetCreateForm();
  renderTasks();
});

searchInput.addEventListener("input", renderTasks);

taskList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) {
    return;
  }
  const item = button.closest(".task-item");
  if (!item) {
    return;
  }
  const taskId = item.dataset.id;
  const action = button.dataset.action;
  if (!taskId || !action) {
    return;
  }

  if (action === "delete") {
    tasks = tasks.filter((task) => task.id !== taskId);
    saveTasks();
    renderTasks();
    return;
  }

  if (action === "edit") {
    openEditDialog(taskId);
  }
});

editForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!editingTaskId) {
    return;
  }

  const task = tasks.find((entry) => entry.id === editingTaskId);
  if (!task) {
    closeEditDialog();
    return;
  }

  const newTitle = editTitleInput.value.trim();
  if (!newTitle) {
    return;
  }

  task.title = newTitle;
  task.description = editDescriptionInput.value.trim();
  task.deadline = editDeadlineInput.value || "";
  task.tags = [...selectedEditTags];

  saveTasks();
  closeEditDialog();
  renderTasks();
});

cancelEditBtn.addEventListener("click", () => {
  closeEditDialog();
});

editDialog.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeEditDialog();
});

themeToggle.addEventListener("click", () => {
  const currentTheme = document.body.dataset.theme === "dark" ? "dark" : "light";
  setTheme(currentTheme === "dark" ? "light" : "dark");
});

function init() {
  tasks = loadJson(STORAGE_KEYS.tasks, []);
  tags = loadJson(STORAGE_KEYS.tags, []);
  ensureTagsFromTasks();
  saveJson(STORAGE_KEYS.tags, tags);

  const savedTheme = localStorage.getItem(STORAGE_KEYS.theme) || "light";
  setTheme(savedTheme);

  renderTagSelectors();
  renderTasks();
}

init();
