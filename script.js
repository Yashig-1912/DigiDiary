/* ======================================================
   IMPORTS
   ====================================================== */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
            
const firebaseConfig = {
    apiKey: "AIzaSyDvSr8TprDfbTezgd2mZo3x97TiIvdGmwg",
    authDomain: "tanya-s-birthday-bash.firebaseapp.com",
    projectId: "tanya-s-birthday-bash",
    messagingSenderId: "1038528788932",
    appId: "1:1038528788932:web:b64534c53b62e89806cc91"
};
            
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
window.db = db;
import {
  collection,
  getDocs,
  setDoc,
  doc,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import confetti from "https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.module.mjs";

console.log("Script loaded - checking for db...");

// Wait for Firebase to be ready

const waitForDb = setInterval(() => {
  if (window.db) {
    db = window.db;
    console.log("Firebase DB ready!");
    clearInterval(waitForDb);
    initializeApp();
  }
}, 100);

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

console.log("Canvas element:", canvas);
console.log("Context:", ctx);

/* ======================================================
   CANVAS DEFAULTS
   ====================================================== */

ctx.lineWidth = 2;
ctx.lineCap = "round";
ctx.strokeStyle = "#000";

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
  if (emojiMode && selectedEmoji) {
    return;
  }
  
  e.preventDefault();
  console.log("Starting to draw");
  saveState();
  drawing = true;
  const pos = getPosition(e);
  ctx.beginPath();
  ctx.moveTo(pos.x, pos.y);
}

function draw(e) {
  if (!drawing) return;
  e.preventDefault();
  const pos = getPosition(e);
  ctx.lineTo(pos.x, pos.y);
  ctx.stroke();
}

function stopDrawing(e) {
  if (drawing && e) {
    e.preventDefault();
  }
  console.log("Stopped drawing");
  drawing = false;
  ctx.closePath();
}

/* ======================================================
   FIRESTORE OPERATIONS
   ====================================================== */

async function loadPagesFromFirestore() {
  if (!db) {
    console.error("Database not ready");
    return;
  }
  
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
  
  if (!pages[index]) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    nameDisplay.innerText = "—";
    nameInput.value = "";
    currentAuthor = "";
    return;
  }

  const img = new Image();
  img.src = pages[index].image;
  img.onload = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
  };

  const author = pages[index].author || "—";
  nameDisplay.innerText = author;
  nameInput.value = "";
  currentAuthor = "";
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

console.log("Canvas event listeners attached");

/* ======================================================
   EVENT LISTENERS - TOOLS
   ====================================================== */

colorPicker.addEventListener("change", e => {
  ctx.strokeStyle = e.target.value;
});

penBtn.addEventListener("click", () => {
  ctx.strokeStyle = colorPicker.value;
  penBtn.classList.add("active");
  eraserBtn.classList.remove("active");
});

eraserBtn.addEventListener("click", () => {
  ctx.strokeStyle = "#fffdf8";
  eraserBtn.classList.add("active");
  penBtn.classList.remove("active");
});

sizePicker.addEventListener("input", e => {
  ctx.lineWidth = e.target.value;
});

/* ======================================================
   EVENT LISTENERS - EMOJI
   ====================================================== */

emojiBtn.addEventListener("click", () => {
  emojiMode = !emojiMode;
  emojiTray.classList.toggle("hidden");
  emojiBtn.classList.toggle("active");
  if (!emojiMode) {
    selectedEmoji = "";
  }
});

emojiTray.addEventListener("click", e => {
  if (e.target.tagName === "SPAN") {
    selectedEmoji = e.target.innerText;
  }
});

canvas.addEventListener("click", e => {
  if (!emojiMode || !selectedEmoji || drawing) return;

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
  if (!history.length) return;

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
  currentAuthor = e.target.value.trim();
});

/* ======================================================
   EVENT LISTENERS - SAVE
   ====================================================== */

saveBtn.addEventListener("click", async () => {
  console.log("Save button clicked!");
  console.log("Current author:", currentAuthor);
  console.log("DB status:", db ? "ready" : "not ready");
  
  if (!currentAuthor) {
    alert("Please enter your name first 😊");
    return;
  }

  if (!db) {
    alert("Database not ready. Please wait and try again.");
    return;
  }

  const imageData = canvas.toDataURL("image/png");
  console.log("Image data captured, length:", imageData.length);

  try {
    console.log("Attempting to save to Firebase...");
    await setDoc(doc(db, "pages", String(currentPageIndex)), {
      index: currentPageIndex,
      image: imageData,
      author: currentAuthor,
      createdAt: serverTimestamp()
    });

    console.log("Firebase save successful!");

    pages.push({
      index: currentPageIndex,
      image: imageData,
      author: currentAuthor
    });

    console.log("Page added to local array. Total pages:", pages.length);

    currentPageIndex++;
    currentAuthor = "";
    nameInput.value = "";
    nameDisplay.innerText = "—";
    history = [];

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    updatePageNumber();
    updateNavButtons();
    
    console.log("Canvas cleared, UI updated. New page index:", currentPageIndex);
    alert("Page saved successfully! 🎉");
  } catch (error) {
    console.error("FULL Error saving page:", error);
    console.error("Error message:", error.message);
    console.error("Error code:", error.code);
    alert("Error saving page: " + error.message + "\nCheck the console for details.");
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
   EVENT LISTENERS - CELEBRATION
   ====================================================== */

celebrateBtn.addEventListener("click", () => {
  console.log("Celebrate button clicked!");
  
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

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  })();
});

console.log("All event listeners attached");

/* ======================================================
   INITIALIZATION
   ====================================================== */

async function initializeApp() {
  console.log("Initializing app...");
  await loadPagesFromFirestore();
  updatePageNumber();
  updateNavButtons();
  nameDisplay.innerText = "—";
  console.log("Birthday Diary ready!");
  
  // Test draw
  ctx.fillStyle = "#000";
  ctx.fillRect(10, 10, 5, 5);
  console.log("Test pixel drawn at 10,10");
}