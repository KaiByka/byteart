// BYTEART // ARCHIVE - main interface logic

// --- 0. MOTION & SOUND PREFERENCES ---
const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const AudioSys = {
    ctx: null,
    muted: localStorage.getItem('byteart-sfx') === 'off',

    toggleMuted: function () {
        this.muted = !this.muted;
        localStorage.setItem('byteart-sfx', this.muted ? 'off' : 'on');
        return this.muted;
    },

    init: function () {
        if (this.muted) return;
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        // Always try to resume if suspended
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    },

    playClick: function () {
        if (!this.ctx || this.muted) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.type = 'square';
        osc.frequency.setValueAtTime(800, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.05);

        gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.05);
    },

    playHover: function () {
        if (!this.ctx || this.muted) return;
        // Double check state
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.02, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.03);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.03);
    },

    // Sound paired with the glitch scramble: one stepped random
    // frequency per character swap, fading out as the text resolves.
    startScramble: function (ticks) {
        if (!this.ctx || this.muted) return null;

        const ctx = this.ctx;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const t0 = ctx.currentTime;
        const duration = ticks * 0.03;

        osc.type = 'square';
        for (let i = 0; i < ticks; i++) {
            osc.frequency.setValueAtTime(120 + Math.random() * 520, t0 + i * 0.03);
        }

        gain.gain.setValueAtTime(0.012, t0);
        gain.gain.setValueAtTime(0.012, t0 + Math.max(0, duration - 0.06));
        gain.gain.linearRampToValueAtTime(0, t0 + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t0);
        osc.stop(t0 + duration);

        return {
            stop: function () {
                try {
                    osc.stop();
                } catch (e) {
                    // Already stopped
                }
            }
        };
    }
};

// Audio toggle (sidebar)
const audioToggle = document.getElementById('audio-toggle');
const audioState = document.getElementById('audio-state');

function renderAudioState() {
    audioState.innerText = 'SFX: ' + (AudioSys.muted ? 'MUTED' : 'ON');
}

function toggleAudio() {
    AudioSys.toggleMuted();
    if (!AudioSys.muted) {
        AudioSys.init();
        AudioSys.playClick();
    }
    renderAudioState();
}

renderAudioState();
audioToggle.addEventListener('click', e => {
    e.stopPropagation();
    toggleAudio();
});
audioToggle.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        toggleAudio();
    }
});

// --- 1. CLOCK ---
function updateClock() {
    const now = new Date();
    const timeStr = now.toISOString().split('T')[1].split('.')[0] + " UTC";
    const el = document.getElementById('sys-clock');
    if (el) el.innerText = timeStr;
}
setInterval(updateClock, 1000);
updateClock();

// Global unlock and interaction sound
document.addEventListener('click', () => {
    AudioSys.init();
    AudioSys.playClick();
});

// --- 2. NAVIGATION & INTERACTIONS ---
function navigateTo(href) {
    AudioSys.init();
    AudioSys.playClick();
    // Delay to allow audio to play (skipped for reduced motion)
    setTimeout(() => {
        window.location.href = href;
    }, REDUCED_MOTION ? 0 : 150);
}

document.querySelectorAll('.block').forEach(b => {
    // Keyboard access
    b.setAttribute('tabindex', '0');
    b.setAttribute('role', 'link');

    // Hover Audio
    b.addEventListener('mouseenter', () => {
        AudioSys.init();
        AudioSys.playHover();
    });

    // Navigation
    b.addEventListener('click', (e) => {
        // If clicked source button, don't navigate
        if (e.target.classList.contains('src-btn')) return;

        navigateTo(b.dataset.href);
    });

    // Keyboard navigation
    b.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            navigateTo(b.dataset.href);
        }
    });
});

// --- 3. GLITCH EFFECT ---
const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
document.querySelectorAll('.glitch').forEach(el => {
    if (REDUCED_MOTION) return; // Leave text static

    const original = el.dataset.text;
    let interval = null;
    let scrambleSound = null;

    el.addEventListener('mouseenter', () => {
        let iteration = 0;
        clearInterval(interval);

        // One sound tick per character swap (3 swaps per character)
        scrambleSound = AudioSys.startScramble(original.length * 3);

        interval = setInterval(() => {
            el.innerText = original
                .split("")
                .map((letter, index) => {
                    if (index < iteration) {
                        return original[index];
                    }
                    return chars[Math.floor(Math.random() * chars.length)];
                })
                .join("");

            if (iteration >= original.length) {
                clearInterval(interval);
            }

            iteration += 1 / 3;
        }, 30);
    });

    // Safety restore on leave (sometimes hover out happens fast)
    el.addEventListener('mouseleave', () => {
        clearInterval(interval);
        el.innerText = original;
        if (scrambleSound) {
            scrambleSound.stop();
            scrambleSound = null;
        }
    });
});

// --- 4. TITLE FITTING ---
// Long experiment titles are scaled down until they fit their card.
// Runs after webfonts load because metrics depend on the real font.
function fitTitles() {
    document.querySelectorAll('.block h2').forEach(el => {
        el.style.fontSize = '';
        const start = parseFloat(getComputedStyle(el).fontSize);
        let size = start;
        const min = 20;
        while (size > min && el.scrollWidth > el.clientWidth) {
            size -= 1;
            el.style.fontSize = size + 'px';
        }
    });
}

if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(fitTitles);
} else {
    fitTitles();
}
window.addEventListener('load', fitTitles);

let fitTimer = null;
window.addEventListener('resize', () => {
    clearTimeout(fitTimer);
    fitTimer = setTimeout(fitTitles, 100);
});

// --- 5. SOURCE VIEWER ---
const modal = document.getElementById('term-modal');
const termBody = document.getElementById('term-body');
const closeBtn = document.getElementById('close-btn');
const termTitle = document.getElementById('term-title');

let lastFocused = null;

function openModal() {
    lastFocused = document.activeElement;
    modal.style.display = 'flex';
    closeBtn.focus();
}

function closeModal() {
    modal.style.display = 'none';
    if (lastFocused && lastFocused.focus) lastFocused.focus();
    lastFocused = null;
}

// Collects inline script bodies, following external src files too
async function fetchSource(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const html = await res.text();

    const parts = [];
    const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
    let match;
    while ((match = re.exec(html)) !== null) {
        const attrs = match[1] || '';
        const body = match[2].replace(/^\s*\n/, '').replace(/\s+$/, '');

        const srcMatch = attrs.match(/src=["']([^"']+)["']/i);
        if (srcMatch) {
            const srcUrl = new URL(srcMatch[1], new URL(url, window.location.href)).href;
            const srcRes = await fetch(srcUrl);
            if (!srcRes.ok) throw new Error(`HTTP error! status: ${srcRes.status}`);
            parts.push(await srcRes.text());
        } else if (body.trim()) {
            parts.push(body);
        }
    }

    if (parts.length === 0) {
        throw new Error("NO SCRIPT TAG FOUND IN TARGET.");
    }
    return parts.join("\n\n");
}

document.querySelectorAll('.src-btn').forEach(btn => {
    // Keyboard access
    btn.setAttribute('tabindex', '0');
    btn.setAttribute('role', 'button');

    btn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            btn.click();
        }
    });

    btn.addEventListener('click', (e) => {
        e.stopPropagation(); // Don't trigger block nav
        const url = btn.dataset.src;

        // Open Modal
        termTitle.innerText = 'SOURCE_CODE_VIEWER // V1.0';
        openModal();
        termBody.innerText = "FETCHING SOURCE DATA...\nDownloading " + url + "...";

        // Check for file protocol restriction
        if (window.location.protocol === 'file:') {
            termBody.innerText = "ERROR: Cannot fetch source code via file protocol.\nSecurity restrictions prevent reading local files directly.\nPlease run this site via a local server (e.g. VS Code Live Server).";
            return;
        }

        fetchSource(url)
            .then(code => {
                termBody.innerText = code;
            })
            .catch(err => {
                termBody.innerText = "ERROR LOADING SOURCE:\n" + err.message;
            });
    });
});

closeBtn.addEventListener('click', () => {
    closeModal();
});

// Close modal with Escape key
document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modal.style.display === 'flex') {
        closeModal();
    }
});

// Focus trap: keep Tab cycling inside the modal
modal.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    const focusables = [closeBtn, termBody];
    const idx = focusables.indexOf(document.activeElement);
    e.preventDefault();
    const next = e.shiftKey
        ? (idx <= 0 ? focusables[focusables.length - 1] : focusables[idx - 1])
        : (idx === focusables.length - 1 ? focusables[0] : focusables[idx + 1]);
    next.focus();
});

// --- 5b. ABOUT / MANIFESTO ---
const ABOUT_TEXT = [
    "BYTEART // ARCHIVE",
    "",
    "12 experiments in generative computation.",
    "Every one runs on real mathematics",
    "or physics, not effects:",
    "",
    "Lorenz's strange attractor.",
    "Stam's stable fluids.",
    "Gray-Scott morphogenesis.",
    "Reynolds flocking.",
    "And eight more.",
    "",
    "No frameworks. No dependencies.",
    "No tracking, no cookies, no logs.",
    "Just canvas, math, and curiosity.",
    "",
    "Every experiment ships its source:",
    "hover a card, press [SRC].",
    "",
    "BUILT BY KAIKYKA // GPL-3.0"
].join("\n");

const aboutToggle = document.getElementById('about-toggle');

function openAbout() {
    termTitle.innerText = 'ARCHIVE.SYS // MANIFESTO';
    openModal();
    termBody.innerText = ABOUT_TEXT;
}

aboutToggle.addEventListener('click', e => {
    e.stopPropagation();
    openAbout();
});

aboutToggle.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        openAbout();
    }
});

// --- 6. BOOT SEQUENCE ---
const bootEl = document.getElementById('boot');
const logEl = document.getElementById('boot-log');
const logs = [
    "SYSTEM READY.",
    "INITIALIZING NEURAL LINK...",
    "LOADING ASSETS...",
    "MOUNTING /DEV/SDA1... OK",
    "CHECKING MEMORY... OK",
    "BYTEART KERNEL V2.4.0"
];

if (REDUCED_MOTION || sessionStorage.getItem('booted')) {
    bootEl.style.display = 'none';
} else {
    let line = 0;
    const interval = setInterval(() => {
        const div = document.createElement('div');
        div.innerText = "> " + logs[line];
        logEl.insertBefore(div, logEl.firstChild);

        line++;
        if (line >= logs.length) {
            clearInterval(interval);
            setTimeout(() => {
                bootEl.style.opacity = 0;
                bootEl.style.transition = 'opacity 0.5s';
                setTimeout(() => bootEl.style.display = 'none', 500);
                sessionStorage.setItem('booted', 'true');
            }, 500);
        }
    }, 100);
}

// --- 7. SCREENSAVER PROTOCOL ---
let idleTime = 0;
let screensaverActive = false;

// Timer
setInterval(() => {
    idleTime++;
    if (idleTime > 30 && !screensaverActive && !REDUCED_MOTION) { // 30 seconds
        activateScreensaver();
    }
}, 1000);

function resetIdle() {
    idleTime = 0;
    if (screensaverActive) {
        deactivateScreensaver();
    }
}

function activateScreensaver() {
    screensaverActive = true;

    // Iframe
    const saver = document.createElement('iframe');
    saver.id = 'screensaver';
    saver.src = 'animations/dream.html';
    saver.style.position = 'fixed';
    saver.style.top = '0';
    saver.style.left = '0';
    saver.style.width = '100vw';
    saver.style.height = '100vh';
    saver.style.border = 'none';
    saver.style.zIndex = '9998';
    saver.style.transition = 'opacity 1s';
    saver.style.opacity = '0';

    // Input Capture Layer (Transparent Div on top of iframe)
    // This ensures events bubble to window instead of being eaten by iframe
    const blocker = document.createElement('div');
    blocker.id = 'screensaver-overlay';
    blocker.style.position = 'fixed';
    blocker.style.top = '0';
    blocker.style.left = '0';
    blocker.style.width = '100vw';
    blocker.style.height = '100vh';
    blocker.style.zIndex = '9999';
    blocker.style.background = 'transparent';

    document.body.appendChild(saver);
    document.body.appendChild(blocker);

    // Fade in
    requestAnimationFrame(() => {
        saver.style.opacity = '1';
    });
}

function deactivateScreensaver() {
    screensaverActive = false;
    const saver = document.getElementById('screensaver');
    const blocker = document.getElementById('screensaver-overlay');

    if (saver) {
        saver.style.opacity = '0';
        setTimeout(() => {
            if (saver.parentNode) saver.parentNode.removeChild(saver);
        }, 1000);
    }
    // Remove blocker immediately to restore interaction
    if (blocker && blocker.parentNode) {
        blocker.parentNode.removeChild(blocker);
    }
}

// Reset inputs
window.addEventListener('mousemove', resetIdle);
window.addEventListener('click', resetIdle);
window.addEventListener('keydown', resetIdle);
window.addEventListener('touchstart', resetIdle);
window.addEventListener('scroll', resetIdle);
