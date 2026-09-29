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
        // If clicked source or info button, don't navigate
        if (e.target.classList.contains('src-btn') || e.target.classList.contains('info-btn')) return;

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

// --- 5c. EXPERIMENT INFO ---
const EXP_INFO = {
    singularity: {
        title: "EXP_05 // SINGULARITY",
        text: [
            "RELATIVISTIC ACCRETION DISK",
            "",
            "A black hole of 4.3 million solar",
            "masses (Sgr A* territory, spin",
            "a/M = 0.98) with a particle disk.",
            "",
            "REAL PHYSICS:",
            "- Lensing: point-mass deflection",
            "  falls off as 1/distance; stars",
            "  behind the hole get pushed",
            "  toward the Einstein ring.",
            "- Rotation is Keplerian: v ~ 1/sqrt(r).",
            "- Doppler beaming: the side",
            "  rotating toward you is brighter.",
            "",
            "APPROXIMATION: the halo above the",
            "hole is a visual stand-in for the",
            "lensed far side of the disk",
            "(the Interstellar effect).",
            "",
            "PASSIVE SIMULATION. WATCH."
        ]
    },
    fibonacci: {
        title: "EXP_04 // PHYLLOTAXIS",
        text: [
            "PHYLLOTAXIS",
            "",
            "Vogel's model of sunflower seed",
            "growth:",
            "",
            "    r = c * sqrt(n)",
            "    theta = n * 137.5077 deg",
            "",
            "137.5077... is the golden angle",
            "(360 / phi^2), the most irrational",
            "angle there is - the only one that",
            "never lines up into spokes.",
            "",
            "Near it, 13 and 21 spiral arms",
            "(parastichies) emerge. Off by even",
            "0.5 degrees, order collapses.",
            "",
            "DRAG LEFT/RIGHT TO EXPLORE."
        ]
    },
    reaction_diffusion: {
        title: "EXP_07 // MORPHOGENESIS",
        text: [
            "MORPHOGENESIS",
            "",
            "Gray-Scott reaction-diffusion:",
            "two chemicals that feed on each",
            "other. A is fed in, B is killed",
            "off, both diffuse:",
            "",
            "    dA = DA*L(A) - AB^2 + f(1-A)",
            "    dB = DB*L(B) + AB^2 - (k+f)B",
            "",
            "f = 0.055, k = 0.062 sits in the",
            "'coral' region: spots grow,",
            "compete and split like cells.",
            "",
            "Alan Turing predicted this class",
            "of patterns in 1952 - they appear",
            "on fish, zebra and coral.",
            "",
            "CLICK/DRAG TO INJECT CHEMICAL B."
        ]
    },
    wolfram: {
        title: "EXP_03 // RULE 30",
        text: [
            "RULE 30",
            "",
            "One of 256 elementary cellular",
            "automata. Each cell looks at",
            "itself and two neighbors:",
            "",
            "    next = left XOR (center OR right)",
            "",
            "From a single live cell it makes",
            "endless chaos - Wolfram calls it",
            "Class 3. Rule 30 is the random",
            "number generator in Mathematica.",
            "",
            "The 1% random bit flips per row",
            "are deliberate: they keep the",
            "pattern from settling.",
            "",
            "THE OBJECT: a rhombic",
            "hexecontahedron (60 rhombi built",
            "from an icosahedron) - Wolfram's",
            "'Spikey'.",
            "",
            "PASSIVE SIMULATION. WATCH."
        ]
    },
    radio: {
        title: "EXP_02 // WAVEFORM",
        text: [
            "RF PROPAGATION",
            "",
            "Three emitters pulse circular",
            "wavefronts; your cursor is the",
            "receiver.",
            "",
            "Signal strength = proximity of",
            "the cursor to a wavefront edge.",
            "Real audio synthesis rides on it:",
            "",
            "- 60 Hz mains hum (LFO wobble)",
            "- Band-passed white noise (static)",
            "- A sine that rises out of the",
            "  static when a wave reaches you",
            "",
            "The frequency readout spans the",
            "real FM band, 88-108 MHz. The",
            "spectrum strip is decorative.",
            "",
            "MOVE TO TUNE. CLICK TO PULSE."
        ]
    },
    mathematica: {
        title: "EXP_01 // MAURER",
        text: [
            "MAURER ROSE",
            "",
            "Peter Maurer, 1987. Take a rose",
            "curve r = sin(n*theta), mark points",
            "every d degrees, then connect",
            "the dots in order.",
            "",
            "The faint circle underneath is",
            "the rose itself; the web is what",
            "the connecting lines draw.",
            "",
            "Small integer pairs (like n=6,",
            "d=71) produce startling knots -",
            "the animation morphs between",
            "random and known-good pairs.",
            "",
            "PASSIVE SIMULATION. WATCH."
        ]
    },
    lorenz: {
        title: "EXP_06 // LORENZ",
        text: [
            "THE LORENZ ATTRACTOR",
            "",
            "Three ODEs from Edward Lorenz,",
            "1963 - a toy model of convection:",
            "",
            "    dx = 10(y - x)",
            "    dy = x(28 - z) - y",
            "    dz = xy - (8/3)z",
            "",
            "With these parameters every",
            "trajectory orbits the two wings",
            "forever, never repeating, never",
            "escaping - a strange attractor.",
            "Two starts a trillionth apart",
            "diverge within seconds: the",
            "butterfly effect.",
            "",
            "DRAG TO ROTATE."
        ]
    },
    fluid: {
        title: "EXP_08 // FLUID",
        text: [
            "NAVIER-STOKES, STABLY",
            "",
            "Jos Stam's 'Stable Fluids' (1999),",
            "the algorithm that brought real-",
            "time fluid to games and film:",
            "",
            "    diffuse -> project -> advect",
            "",
            "Velocity and density live on a",
            "100x100 grid. The projection step",
            "removes divergence so the fluid",
            "stays incompressible; Gauss-Seidel",
            "relaxes the pressure solve.",
            "",
            "DRAG TO INJECT DENSITY AND MOTION."
        ]
    },
    gradient: {
        title: "EXP_09 // GRADIENT",
        text: [
            "GRADIENT FIELDS",
            "",
            "A scalar field f(x,y): a rolling",
            "landscape of sine waves. Each",
            "arrow is its gradient, computed",
            "by numerical differentiation:",
            "",
            "    df/dx = [f(x+h,y) - f(x,y)] / h",
            "",
            "Arrows point uphill - the",
            "direction of steepest ascent.",
            "Length and color show steepness.",
            "",
            "Your cursor drops a gravity well",
            "into the landscape and the whole",
            "field re-aims at it.",
            "",
            "MOVE THE MOUSE TO BEND THE FIELD."
        ]
    },
    relativity: {
        title: "EXP_10 // RELATIVITY",
        text: [
            "E = mc^2",
            "",
            "Honest disclaimer: this one is a",
            "metaphor, not physics.",
            "",
            "A nucleus of particles is held",
            "together by 'binding energy' (pull",
            "toward center + friction). Hold",
            "the mouse button to bombard it:",
            "neutrons in, particles out. Escape",
            "means matter becomes energy -",
            "particles ignite into pure outward",
            "speed with trails.",
            "",
            "The mass-energy idea is real;",
            "the particle rules are art.",
            "",
            "HOLD MOUSE BUTTON TO BOMBARD."
        ]
    },
    quantum: {
        title: "EXP_11 // QUANTUM",
        text: [
            "SUPERPOSITION & ENTANGLEMENT",
            "",
            "Each cube is a qubit in",
            "superposition: a cloud of ghost",
            "states, jittering.",
            "",
            "Bring your cursor close: that is",
            "a measurement - the qubit",
            "collapses to |0> or |1> at random.",
            "",
            "Every pair is entangled: measure",
            "one and its partner instantly",
            "collapses to the opposite state",
            "(the statistics of a Bell pair).",
            "Left alone, decoherence returns",
            "both to superposition.",
            "",
            "MOVE THE CURSOR TO OBSERVE."
        ]
    },
    boids: {
        title: "EXP_12 // BOIDS",
        text: [
            "EMERGENCE",
            "",
            "Craig Reynolds, 1986. Every boid",
            "follows three local rules:",
            "",
            "    1. SEPARATION - keep distance",
            "    2. ALIGNMENT  - match heading",
            "    3. COHESION   - stay together",
            "",
            "Nobody is in charge, yet a flock",
            "appears. No part of the code",
            "contains the flock - it emerges",
            "from the rules, the way bird",
            "murmurations do.",
            "",
            "Your cursor is a predator: the",
            "flock flees and regroups. Click",
            "to release 10 more boids.",
            "",
            "MOVE TO HUNT. CLICK TO SPAWN."
        ]
    }
};

document.querySelectorAll('.info-btn').forEach(btn => {
    // Keyboard access
    btn.setAttribute('tabindex', '0');
    btn.setAttribute('role', 'button');

    function open() {
        const info = EXP_INFO[btn.dataset.exp];
        if (!info) return;
        termTitle.innerText = info.title;
        openModal();
        termBody.innerText = info.text.join("\n");
    }

    btn.addEventListener('click', (e) => {
        e.stopPropagation(); // Don't trigger block nav
        open();
    });

    btn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            open();
        }
    });
});

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
