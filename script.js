// ==========================================
// PlaylistAI Prototype
// Human-Centred Design Project
// ==========================================

// -----------------------------
// Mock Data
// -----------------------------

const mockTracks = [
    { title: "After Hours", artist: "The Weeknd" },
    { title: "Blinding Lights", artist: "The Weeknd" },
    { title: "505", artist: "Arctic Monkeys" },
    { title: "The Less I Know The Better", artist: "Tame Impala" },
    { title: "Electric Feel", artist: "MGMT" },
    { title: "Sunflower", artist: "Post Malone" },
    { title: "505 (Live)", artist: "Arctic Monkeys" },
    { title: "Sweater Weather", artist: "The Neighbourhood" },
    { title: "Midnight City", artist: "M83" },
    { title: "Somebody Else", artist: "The 1975" },
    { title: "Ribs", artist: "Lorde" },
    { title: "Golden", artist: "Harry Styles" }
];

// -----------------------------
// Elements
// -----------------------------

const loginBtn = document.getElementById("loginBtn");
const startBtn = document.getElementById("startBtn");
const generateBtn = document.getElementById("generateBtn");

const loadingSection = document.getElementById("loading");
const resultSection = document.getElementById("result");

const playlistPreview = document.querySelector(".playlist-preview");
const libraryList = document.getElementById("libraryList");
const songGrid = document.getElementById("songGrid");

const intentionButtons = document.querySelectorAll(".intent");

const errorBanner = document.getElementById("errorBanner");
const errorBannerText = document.getElementById("errorBannerText");
const errorBannerDismiss = document.getElementById("errorBannerDismiss");

// =====================================================
// Error Handling Layer
// =====================================================
// Central place for surfacing errors to the user instead of
// silent failures, console-only logs, or blocking alert().
 
function showError(message, { retry } = {}) {
    console.error("[PlaylistAI error]", message);
 
    errorBannerText.textContent = message;
    errorBanner.classList.remove("hidden");
 
    // remove any previous retry button before adding a new one
    const existingRetry = errorBanner.querySelector(".retry-btn");
    if (existingRetry) existingRetry.remove();
 
    if (typeof retry === "function") {
        const retryBtn = document.createElement("button");
        retryBtn.className = "retry-btn";
        retryBtn.textContent = "Retry";
        retryBtn.addEventListener("click", () => {
            clearError();
            retry();
        });
        errorBanner.insertBefore(retryBtn, errorBannerDismiss);
    }
}
 
function clearError() {
    errorBanner.classList.add("hidden");
    errorBannerText.textContent = "";
    const existingRetry = errorBanner.querySelector(".retry-btn");
    if (existingRetry) existingRetry.remove();
}
 
errorBannerDismiss.addEventListener("click", clearError);
 
// Catch anything that slips past local try/catch blocks —
// e.g. a rejected promise nobody awaited, or a genuine bug.
window.addEventListener("error", (event) => {
    showError("Something unexpected went wrong. Please refresh and try again.");
});
window.addEventListener("unhandledrejection", (event) => {
    showError("Something unexpected went wrong. Please refresh and try again.");
});
 
// Network status — most "random" failures during development
// are actually just Wi-Fi dropping mid-request.
window.addEventListener("offline", () => {
    showError("You're offline. Reconnect to continue using Spotify features.");
});
window.addEventListener("online", clearError);
 
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// -----------------------------
// State
// -----------------------------

let selectedIntent = "Current Favourites";

// -----------------------------
// Spotify Login (Mock)
// -----------------------------

loginBtn.addEventListener("click", () => {

    loginBtn.innerText = "Connected ✓";
    loginBtn.disabled = true;

    alert(
        "Spotify connected successfully!\n\n(This is a prototype. Replace this with Spotify OAuth later.)"
    );

});

// -----------------------------
// Hero Button
// -----------------------------

startBtn.addEventListener("click", () => {

    document.querySelector(".dashboard")
        .scrollIntoView({
            behavior: "smooth"
        });

});

// -----------------------------
// Intent Selection
// -----------------------------

intentionButtons.forEach(button => {

    button.addEventListener("click", () => {

        intentionButtons.forEach(btn =>
            btn.classList.remove("selected"));

        button.classList.add("selected");

        selectedIntent = button.innerText;

    });

});

// -----------------------------
// Generate Playlist
// -----------------------------

generateBtn.addEventListener("click", generatePlaylist);

function generatePlaylist() {

    loadingSection.classList.remove("hidden");
    resultSection.classList.add("hidden");

    window.scrollTo({

        top: loadingSection.offsetTop,
        behavior: "smooth"

    });

    setTimeout(() => {

        loadingSection.classList.add("hidden");

        buildPlaylist();

        resultSection.classList.remove("hidden");

        resultSection.scrollIntoView({

            behavior: "smooth"

        });

    }, 2500);

}

// -----------------------------
// Build Playlist
// -----------------------------

function buildPlaylist() {

    playlistPreview.innerHTML = "";

    const shuffled = shuffle([...mockTracks]);

    const selectedTracks = shuffled.slice(0, 10);

    selectedTracks.forEach(track => {

        playlistPreview.appendChild(createTrack(track));

    });

}

// -----------------------------
// Track Card
// -----------------------------

function createTrack(track) {

    const container = document.createElement("div");

    container.className = "track";

    container.innerHTML = `

        <div class="album-art"></div>

        <div>

            <h4>${track.title}</h4>

            <span>${track.artist}</span>

            <small>${selectedIntent}</small>

        </div>

    `;

    return container;

}

// -----------------------------
// Shuffle Helper
// -----------------------------

function shuffle(array) {

    for (let i = array.length - 1; i > 0; i--) {

        const j = Math.floor(Math.random() * (i + 1));

        [array[i], array[j]] = [array[j], array[i]];

    }

    return array;

}

// -----------------------------
// Save to Spotify (Mock)
// -----------------------------

document.addEventListener("click", function (event) {

    if (!event.target.classList.contains("spotify-btn"))
        return;

    if (event.target.innerText !== "Save to Spotify")
        return;

    event.target.innerText = "Saved ✓";

    event.target.disabled = true;

    alert(
        "Playlist exported successfully!\n\n(In the final version this would create a Spotify playlist using the Spotify Web API.)"
    );

});

// -----------------------------
// Placeholder
// -----------------------------

console.log(
`
======================================
 PlaylistAI Prototype
======================================

Current Intention:
${selectedIntent}

Future Spotify API Integration

1. Spotify OAuth Login
2. Fetch User Playlists
3. Fetch Liked Songs
4. Fetch Top Tracks
5. Generate Playlist using LLM
6. Create Playlist
7. Add Tracks to Playlist

======================================
`
);