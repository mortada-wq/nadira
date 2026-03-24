// ========== UI TEXT DICTIONARY ==========
const UI_TEXT = {
  loading_generating: "جارٍ الإنشاء...",
  msg_error: "حدث خطأ، حاول مرة أخرى",
  msg_success: "تم بنجاح",
  msg_copied: "تم النسخ",
  validation_required: "الرجاء كتابة وصف للصورة",
  prompt_enhanced: "تم تحسين الوصف بنجاح"
};

const ICON_PATH = "/assets/icons/";
const ICONS = {
  home: `${ICON_PATH}home.svg`,
  "image-gen": `${ICON_PATH}image-gen.svg`,
  "audio-gen": `${ICON_PATH}audio-gen.svg`,
  "graphic-gen": `${ICON_PATH}graphic-gen.svg`,
  chat: `${ICON_PATH}chat.svg`,
  settings: `${ICON_PATH}settings.svg`,
  send: `${ICON_PATH}send.svg`,
  close: `${ICON_PATH}close.svg`,
  menu: `${ICON_PATH}menu.svg`,
  download: `${ICON_PATH}download.svg`,
  share: `${ICON_PATH}share.svg`,
  copy: `${ICON_PATH}copy.svg`,
  delete: `${ICON_PATH}delete.svg`,
  generate: `${ICON_PATH}generate.svg`,
  upload: `${ICON_PATH}upload.svg`,
  play: `${ICON_PATH}play.svg`,
  pause: `${ICON_PATH}pause.svg`,
  logo: "/assets/logo.svg",
  "logo-mark": "/assets/logo-mark.svg"
};

// ========== SIDEBAR TOGGLE ==========
function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");
  sidebar.classList.toggle("is-open");
  overlay.classList.toggle("is-open");
}

// ========== CHARACTER COUNT ==========
const promptInput = document.getElementById("promptInput");
const charCount = document.getElementById("charCount");
const MAX_PROMPT_LENGTH = 500;

function updateCharCount(value) {
  const len = String(value || "").length;
  charCount.textContent = `${len}/${MAX_PROMPT_LENGTH}`;
}

promptInput.addEventListener("input", function onPromptInput() {
  updateCharCount(this.value);
});

// ========== STYLE SELECTION ==========
function selectStyle(element) {
  document.querySelectorAll(".style-card").forEach((card) => {
    card.classList.remove("active");
  });
  element.classList.add("active");
}

// ========== ARABIC PROMPT ENHANCEMENT ==========
const arabicPromptEnhancements = {
  "منظر طبيعي":
    "منظر طبيعي خلاب، تفاصيل دقيقة، إضاءة سينمائية، دقة عالية جداً، ألوان نابضة بالحياة",
  "شخص":
    "صورة شخصية احترافية، إضاءة استوديو متقنة، خلفية ضبابية، تفاصيل الوجه واضحة، جودة عالية",
  "مدينة":
    "منظر مدينة حضري، هندسة معمارية حديثة، إضاءة ليلية ساحرة، تفاصيل واقعية، منظور واسع",
  "حيوان":
    "صورة حيوان واقعية، فرو تفصيلي، إضاءة طبيعية، خلفية بيئية، جودة فوتوغرافية عالية",
  "فن":
    "عمل فني إبداعي، ألوان زاهية، تكوين متوازن، تفاصيل معقدة، أسلوب فريد",
  "مجرد":
    "تصميم تجريدي، أشكال هندسية، ألوان متدرجة، تكوين ديناميكي، عمق بصري"
};

function enhancePrompt() {
  let prompt = promptInput.value.trim();

  if (!prompt) {
    showToast(UI_TEXT.validation_required, "error");
    return;
  }

  for (const [keyword, enhancement] of Object.entries(arabicPromptEnhancements)) {
    if (prompt.includes(keyword) && !prompt.includes(enhancement.split("،")[1])) {
      prompt += `، ${enhancement}`;
      break;
    }
  }

  if (!prompt.includes("تفاصيل") && !prompt.includes("جودة")) {
    prompt += "، تفاصيل دقيقة للغاية، جودة احترافية، دقة 8K";
  }

  if (prompt.length > MAX_PROMPT_LENGTH) {
    prompt = prompt.slice(0, MAX_PROMPT_LENGTH);
  }

  promptInput.value = prompt;
  updateCharCount(prompt);
  showToast(UI_TEXT.prompt_enhanced, "success");
}

// ========== ADVANCED OPTIONS ==========
const advancedOptionsContainer = document.getElementById("advancedOptions");
function toggleAdvancedOptions() {
  if (advancedOptionsContainer.hasAttribute("hidden")) {
    advancedOptionsContainer.removeAttribute("hidden");
  } else {
    advancedOptionsContainer.setAttribute("hidden", "");
  }
}

// ========== GENERATE IMAGES ==========
async function generateImages() {
  const btn = document.getElementById("generateBtn");
  const prompt = promptInput.value.trim();

  if (!prompt) {
    showToast(UI_TEXT.validation_required, "error");
    return;
  }

  const selectedStyle =
    document.querySelector(".style-card.active")?.getAttribute("data-style") || "واقعي";

  const options = {
    prompt,
    style: selectedStyle,
    aspectRatio: document.getElementById("aspectRatio").value,
    quality: document.getElementById("quality").value,
    creativity: document.getElementById("creativity").value,
    numImages: Number.parseInt(document.getElementById("numImages").value, 10)
  };

  btn.disabled = true;
  btn.classList.add("sds-btn--loading");
  btn.innerHTML = `<div class="sds-loader-dots"><span></span><span></span><span></span></div> ${UI_TEXT.loading_generating}`;

  renderGallerySkeleton(options.numImages || 1);

  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(options)
    });

    const data = await response.json();

    if (response.ok && data.success && Array.isArray(data.images)) {
      displayImages(data.images, prompt);
      showToast(UI_TEXT.msg_success, "success");
      return;
    }

    showToast(data?.error || UI_TEXT.msg_error, "error");
    clearGalleryIfSkeleton();
  } catch (error) {
    console.error("Generation error:", error);
    showToast(UI_TEXT.msg_error, "error");
    clearGalleryIfSkeleton();
  } finally {
    btn.disabled = false;
    btn.classList.remove("sds-btn--loading");
    btn.innerHTML = `<img class="sds-btn__icon" src="${ICONS.generate}" alt="" aria-hidden="true"> إنشاء الصور`;
  }
}

function renderGallerySkeleton(count) {
  const gallery = document.getElementById("gallery");
  gallery.innerHTML = "";

  const size = Math.min(Math.max(Number(count) || 1, 1), 4);
  for (let i = 0; i < size; i += 1) {
    const item = document.createElement("div");
    item.className = "gallery-item sds-skeleton";
    item.dataset.skeleton = "true";
    gallery.appendChild(item);
  }
}

function clearGalleryIfSkeleton() {
  const gallery = document.getElementById("gallery");
  if (gallery.querySelector("[data-skeleton='true']")) {
    gallery.innerHTML = "";
  }
}

// ========== DISPLAY IMAGES ==========
function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function displayImages(images, prompt) {
  const gallery = document.getElementById("gallery");
  gallery.innerHTML = "";
  const safePrompt = escapeHtml(prompt);

  images.forEach((imageUrl, index) => {
    const item = document.createElement("article");
    item.className = "gallery-item sds-fade-up";
    item.innerHTML = `
      <img src="${escapeHtml(imageUrl)}" alt="${safePrompt}" loading="lazy">
      <div class="gallery-item-overlay">
        <p class="gallery-item-prompt">${safePrompt}</p>
        <div class="gallery-item-actions">
          <button class="action-btn" onclick="downloadImage('${escapeHtml(imageUrl)}', ${index})"><img class="action-btn__icon" src="${ICONS.download}" alt="" aria-hidden="true"> تحميل</button>
          <button class="action-btn" onclick="shareImage('${escapeHtml(imageUrl)}')"><img class="action-btn__icon" src="${ICONS.share}" alt="" aria-hidden="true"> مشاركة</button>
          <button class="action-btn" onclick="upscaleImage('${escapeHtml(imageUrl)}')"><img class="action-btn__icon" src="${ICONS.generate}" alt="" aria-hidden="true"> تكبير</button>
        </div>
      </div>
    `;
    gallery.appendChild(item);
    setTimeout(() => item.classList.add("is-visible"), 60 * index);
  });
}

// ========== IMAGE ACTIONS ==========
function downloadImage(url, index) {
  const a = document.createElement("a");
  a.href = url;
  a.download = `nadira-${Date.now()}-${index}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showToast("جارٍ التحميل...", "success");
}

function shareImage(url) {
  if (navigator.share) {
    navigator
      .share({
        title: "صورة من نديرة",
        text: "شاهد هذه الصورة المذهلة!",
        url
      })
      .then(() => showToast("تمت المشاركة بنجاح", "success"))
      .catch(() => showToast(UI_TEXT.msg_error, "error"));
  } else {
    navigator.clipboard
      .writeText(url)
      .then(() => showToast(UI_TEXT.msg_copied, "success"))
      .catch(() => showToast(UI_TEXT.msg_error, "error"));
  }
}

function upscaleImage() {
  showToast("سيتم تكبير الصورة قريباً...", "success");
}

// ========== TOAST NOTIFICATIONS ==========
function showToast(message, type = "success") {
  const container = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-message">${message}</span>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = "toast-slide 0.3s ease reverse";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ========== ENTRANCE ANIMATIONS ==========
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
      }
    });
  },
  { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
);

document.querySelectorAll(".sds-fade-up, .sds-stagger").forEach((el) => {
  observer.observe(el);
});

// ========== RANGE LABEL ==========
const creativityInput = document.getElementById("creativity");
const creativityValue = document.getElementById("creativityValue");
creativityInput.addEventListener("input", () => {
  creativityValue.textContent = creativityInput.value;
});

// ========== KEYBOARD SHORTCUTS ==========
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    generateImages();
  }
  if (e.key === "Escape") {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebarOverlay");
    if (sidebar.classList.contains("is-open")) {
      sidebar.classList.remove("is-open");
      overlay.classList.remove("is-open");
    }
  }
});

// ========== INITIAL ANIMATION ==========
window.addEventListener("load", () => {
  updateCharCount(promptInput.value);
  document.querySelectorAll(".sds-fade-up").forEach((el, index) => {
    setTimeout(() => el.classList.add("is-visible"), 100 * index);
  });
});

