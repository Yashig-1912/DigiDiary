/* ======================================================
   IMPORTS
   ====================================================== */
import { initializeApp as initFirebase } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  setDoc,
  doc,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import confetti from "https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.module.mjs";

/* ======================================================
   FIREBASE INIT
   ====================================================== */

const firebaseConfig = {
  apiKey: "AIzaSyDvSr8TprDfbTezgd2mZo3x97TiIvdGmwg",
  authDomain: "tanya-s-birthday-bash.firebaseapp.com",
  projectId: "tanya-s-birthday-bash",
  messagingSenderId: "1038528788932",
  appId: "1:1038528788932:web:b64534c53b62e89806cc91"
};

const firebaseApp = initFirebase(firebaseConfig);
const db = getFirestore(firebaseApp);

/* ======================================================
   GLOBAL STATE
   ====================================================== */

let pages = [];
let currentPageIndex = 0;
let history = [];
let drawing = false;
let emojiMode = false;
let selectedEmoji = "";
let currentAuthor = "";
let isReadOnly = false;   // true when viewing a saved page

/* ======================================================
   DOM REFERENCES
   ====================================================== */

const canvas = document.getElementById("diaryCanvas");
const ctx = canvas.getContext("2d");
const colorPicker = document.getElementById("colorPicker");
const penBtn = document.getElementById("penBtn");
const eraserBtn = document.getElementById("eraserBtn");
const sizePicker = document.getElementById("sizePicker");
const emojiBtn = document.getElementById("emojiBtn");
const emojiTray = document.getElementById("emojiTray");
const prevBtn = document.getElementById("prevPage");
const nextBtn = document.getElementById("nextPage");
const pageNumber = document.getElementById("pageNumber");
const saveBtn = document.getElementById("saveBtn");
const undoBtn = document.getElementById("undoBtn");
const nameInput = document.getElementById("authorInput");
const nameDisplay = document.getElementById("authorDisplay");
const celebrateBtn = document.getElementById("celebrateBtn");

/* ======================================================
   CANVAS DEFAULTS
   ====================================================== */

ctx.lineWidth = 2;
ctx.lineCap = "round";
ctx.strokeStyle = "#000";

/* ======================================================
   CONFETTI HELPER
   ====================================================== */

function launchConfetti() {
  const duration = 2500;
  const end = Date.now() + duration;

  (function frame() {
    confetti({
      particleCount: 6,
      angle: 60,
      spread: 80,
      origin: { x: 0 },
      colors: ['#FFD700', '#FF69B4', '#87CEEB', '#98FB98']
    });
    confetti({
      particleCount: 6,
      angle: 120,
      spread: 80,
      origin: { x: 1 },
      colors: ['#FFD700', '#FF69B4', '#87CEEB', '#98FB98']
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}

/* ======================================================
   READ-ONLY MODE
   ====================================================== */

function setReadOnly(enabled) {
  isReadOnly = enabled;

  canvas.style.cursor = enabled ? "not-allowed" : "crosshair";

  penBtn.disabled = enabled;
  eraserBtn.disabled = enabled;
  sizePicker.disabled = enabled;
  colorPicker.disabled = enabled;
  emojiBtn.disabled = enabled;
  undoBtn.disabled = enabled;
  saveBtn.disabled = enabled;
  nameInput.disabled = enabled;

  document.querySelector(".tools").style.opacity = enabled ? "0.4" : "1";
  document.querySelector(".actions").style.opacity = enabled ? "0.4" : "1";
  document.querySelector(".name-section").style.opacity = enabled ? "0.4" : "1";

  if (enabled) {
    emojiTray.classList.add("hidden");
    emojiMode = false;
    selectedEmoji = "";
    emojiBtn.classList.remove("active");
  }
}

/* ======================================================
   CANVAS DRAWING FUNCTIONS
   ====================================================== */

function saveState() {
  history.push(canvas.toDataURL());
}

function getPosition(e) {
  const rect = canvas.getBoundingClientRect();
  const point = e.touches ? e.touches[0] : e;
  return {
    x: point.clientX - rect.left,
    y: point.clientY - rect.top
  };
}

function startDrawing(e) {
  if (isReadOnly) return;
  if (emojiMode && selectedEmoji) return;
  e.preventDefault();
  saveState();
  drawing = true;
  const pos = getPosition(e);
  ctx.beginPath();
  ctx.moveTo(pos.x, pos.y);
}

function draw(e) {
  if (!drawing || isReadOnly) return;
  e.preventDefault();
  const pos = getPosition(e);
  ctx.lineTo(pos.x, pos.y);
  ctx.stroke();
}

function stopDrawing(e) {
  if (drawing && e) e.preventDefault();
  drawing = false;
  ctx.closePath();
}

/* ======================================================
   FIRESTORE OPERATIONS
   ====================================================== */

async function loadPagesFromFirestore() {
  pages = [];
  try {
    const q = query(collection(db, "pages"), orderBy("index"));
    const snapshot = await getDocs(q);
    snapshot.forEach(docSnap => {
      pages.push(docSnap.data());
    });
    console.log(`Loaded ${pages.length} pages`);
  } catch (error) {
    console.error("Error loading pages:", error);
  }
  currentPageIndex = pages.length;
}

/* ======================================================
   RENDERING
   ====================================================== */

function renderPage(index) {
  history = [];

  // New blank page — editable
  if (!pages[index]) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    nameDisplay.innerText = "—";
    nameInput.value = "";
    currentAuthor = "";
    setReadOnly(false);
    return;
  }

  // Saved page — lock it
  const img = new Image();
  img.src = pages[index].image;
  img.onload = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
  };

  nameDisplay.innerText = pages[index].author || "—";
  nameInput.value = "";
  currentAuthor = "";
  setReadOnly(true);
}

function updatePageNumber() {
  pageNumber.innerText = `Page ${currentPageIndex + 1}`;
}

function updateNavButtons() {
  prevBtn.disabled = currentPageIndex === 0;
  nextBtn.disabled = currentPageIndex === pages.length;
}

/* ======================================================
   EVENT LISTENERS - CANVAS
   ====================================================== */

canvas.addEventListener("mousedown", startDrawing);
canvas.addEventListener("mousemove", draw);
canvas.addEventListener("mouseup", stopDrawing);
canvas.addEventListener("mouseleave", stopDrawing);

canvas.addEventListener("touchstart", startDrawing, { passive: false });
canvas.addEventListener("touchmove", draw, { passive: false });
canvas.addEventListener("touchend", stopDrawing);

/* ======================================================
   EVENT LISTENERS - TOOLS
   ====================================================== */

colorPicker.addEventListener("change", e => {
  if (isReadOnly) return;
  ctx.strokeStyle = e.target.value;
});

penBtn.addEventListener("click", () => {
  if (isReadOnly) return;
  ctx.strokeStyle = colorPicker.value;
  penBtn.classList.add("active");
  eraserBtn.classList.remove("active");
});

eraserBtn.addEventListener("click", () => {
  if (isReadOnly) return;
  ctx.strokeStyle = "#fffdf8";
  eraserBtn.classList.add("active");
  penBtn.classList.remove("active");
});

sizePicker.addEventListener("input", e => {
  if (isReadOnly) return;
  ctx.lineWidth = e.target.value;
});

/* ======================================================
   EVENT LISTENERS - EMOJI
   ====================================================== */

emojiBtn.addEventListener("click", () => {
  if (isReadOnly) return;
  emojiMode = !emojiMode;
  emojiTray.classList.toggle("hidden");
  emojiBtn.classList.toggle("active");
  if (!emojiMode) selectedEmoji = "";
});

emojiTray.addEventListener("click", e => {
  if (e.target.tagName === "SPAN") {
    selectedEmoji = e.target.innerText;
  }
});

canvas.addEventListener("click", e => {
  if (isReadOnly || !emojiMode || !selectedEmoji || drawing) return;
  saveState();
  const pos = getPosition(e);
  ctx.font = `${ctx.lineWidth * 10}px serif`;
  ctx.fillText(selectedEmoji, pos.x - 10, pos.y + 10);
  selectedEmoji = "";
});

/* ======================================================
   EVENT LISTENERS - UNDO
   ====================================================== */

undoBtn.addEventListener("click", () => {
  if (isReadOnly || !history.length) return;
  const img = new Image();
  img.src = history.pop();
  img.onload = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
  };
});

/* ======================================================
   EVENT LISTENERS - NAME
   ====================================================== */

nameInput.addEventListener("input", e => {
  if (isReadOnly) return;
  currentAuthor = e.target.value.trim();
});

/* ======================================================
   EVENT LISTENERS - SAVE
   ====================================================== */

saveBtn.addEventListener("click", async () => {
  if (isReadOnly) return;

  if (!currentAuthor) {
    alert("Please enter your name first 😊");
    return;
  }

  const imageData = canvas.toDataURL("image/png");

  try {
    await setDoc(doc(db, "pages", String(currentPageIndex)), {
      index: currentPageIndex,
      image: imageData,
      author: currentAuthor,
      createdAt: serverTimestamp()
    });

    pages.push({
      index: currentPageIndex,
      image: imageData,
      author: currentAuthor
    });

    currentPageIndex++;
    currentAuthor = "";
    nameInput.value = "";
    nameDisplay.innerText = "—";
    history = [];

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    updatePageNumber();
    updateNavButtons();
    setReadOnly(false);

    launchConfetti();
  } catch (error) {
    console.error("Error saving page:", error);
    alert("Error saving page: " + error.message);
  }
});

/* ======================================================
   EVENT LISTENERS - NAVIGATION
   ====================================================== */

prevBtn.addEventListener("click", () => {
  if (currentPageIndex <= 0) return;
  currentPageIndex--;
  renderPage(currentPageIndex);
  updatePageNumber();
  updateNavButtons();
});

nextBtn.addEventListener("click", () => {
  if (currentPageIndex >= pages.length) return;
  currentPageIndex++;
  renderPage(currentPageIndex);
  updatePageNumber();
  updateNavButtons();
});

/* ======================================================
   EVENT LISTENERS - CELEBRATION BUTTON
   ====================================================== */

celebrateBtn.addEventListener("click", launchConfetti);

/* ======================================================
   INITIALIZATION
   ====================================================== */

async function startApp() {
  console.log("Initializing app...");
  await loadPagesFromFirestore();
  updatePageNumber();
  updateNavButtons();
  nameDisplay.innerText = "—";
  setReadOnly(false);
  console.log("Birthday Diary ready!");

  // Confetti every time the site loads
  launchConfetti();
}

startApp();