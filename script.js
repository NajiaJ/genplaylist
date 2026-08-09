// ==========================================
// GenPlaylist
// Human-Centred Design Project
// ==========================================

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
const saveDbBtn = document.getElementById("saveDbBtn");

// =====================================================
// Error Handling Layer
// =====================================================
// Central place for surfacing errors to the user instead of
// silent failures, console-only logs, or blocking alert().

function showError(message, { retry } = {}) {
    console.error("[GenPlaylist error]", message);

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

// =====================================================
// Supabase
// =====================================================
// Get these two values from Project Settings > API in your
// Supabase dashboard. The anon key is safe to expose client-side
// ONLY because Row Level Security policies (set up in the SQL
// editor) control what it's actually allowed to do.

const SUPABASE_URL = "https://nyxawdoedmqtmtoihsmx.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_vNeLmLSYzA2tgZ3Wz_vX3A_JM5rG_Z3";

let supabaseClient = null;

function getSupabaseClient() {
    if (supabaseClient) return supabaseClient;

    const PLACEHOLDER_URL = "https://nyxawdoedmqtmtoihsmx.supabase.co";
    const PLACEHOLDER_KEY = "sb_publishable_vNeLmLSYzA2tgZ3Wz_vX3A_JM5rG_Z3";

    if (
        !SUPABASE_URL || SUPABASE_URL === PLACEHOLDER_URL ||
        !SUPABASE_ANON_KEY || SUPABASE_ANON_KEY === PLACEHOLDER_KEY
    ) {
        throw new Error("SUPABASE_NOT_CONFIGURED");
    }

    // window.supabase comes from the CDN script tag in index.html
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return supabaseClient;
}

async function savePlaylistToDatabase(tracks, intent) {
    saveDbBtn.disabled = true;
    saveDbBtn.textContent = "Saving…";

    try {
        const client = getSupabaseClient();

        const { error } = await client
            .from("generated_playlists")
            .insert({
                playlist_name: document.querySelector('.settings input[type="text"]').value || null,
                intent: intent,
                track_count: tracks.length,
                tracks: tracks
            });

        if (error) throw error;

        saveDbBtn.textContent = "Saved ✓";
        clearError();
    } catch (err) {
        saveDbBtn.disabled = false;
        saveDbBtn.textContent = "Save Playlist";

        if (err.message === "SUPABASE_NOT_CONFIGURED") {
            showError("Supabase isn't configured yet — add your project URL and anon key near the top of script.js.");
            return;
        }
        showError("Couldn't save your playlist. Please try again.", {
            retry: () => savePlaylistToDatabase(tracks, intent)
        });
    }
}

saveDbBtn.addEventListener("click", () => {
    const tracksToSave = Array.from(playlistPreview.querySelectorAll(".track")).map(el => ({
        title: el.querySelector("h4").textContent,
        artist: el.querySelector("span").textContent
    }));

    if (tracksToSave.length === 0) {
        showError("Generate a playlist first before saving.");
        return;
    }

    savePlaylistToDatabase(tracksToSave, selectedIntent);
});

// =====================================================
// Spotify Auth
// =====================================================
// Register an app at https://developer.spotify.com/dashboard
// and add this page's exact URL as a Redirect URI there.

const SPOTIFY_CLIENT_ID = "147cdfbc274741aa9adc2ecdf0b24bc6";
const REDIRECT_URI = window.location.origin + window.location.pathname;
const SPOTIFY_SCOPES = [
    "playlist-read-private",
    "playlist-read-collaborative",
    "user-library-read",
    "user-top-read",
    "user-read-recently-played"
].join(" ");

let spotifyAccessToken = null;

function base64UrlEncode(bytes) {
    return btoa(String.fromCharCode(...new Uint8Array(bytes)))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
}

async function pkceChallenge() {
    const verifierBytes = new Uint8Array(64);
    crypto.getRandomValues(verifierBytes);
    const verifier = base64UrlEncode(verifierBytes);
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
    return { verifier, challenge: base64UrlEncode(digest) };
}

async function redirectToSpotifyLogin() {
    const PLACEHOLDER_CLIENT_ID = "PASTE_YOUR_SPOTIFY_CLIENT_ID_HERE";
    if (!SPOTIFY_CLIENT_ID || SPOTIFY_CLIENT_ID === PLACEHOLDER_CLIENT_ID) {
        showError("No Spotify Client ID is set. Add yours near the top of script.js before connecting.");
        return;
    }

    try {
        const { verifier, challenge } = await pkceChallenge();
        sessionStorage.setItem("spotify_pkce_verifier", verifier);

        const params = new URLSearchParams({
            client_id: SPOTIFY_CLIENT_ID,
            response_type: "code",
            redirect_uri: REDIRECT_URI,
            scope: SPOTIFY_SCOPES,
            code_challenge_method: "S256",
            code_challenge: challenge
        });

        window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
    } catch (err) {
        showError("Couldn't start the Spotify login. Please try again.", { retry: redirectToSpotifyLogin });
    }
}

async function exchangeCodeForToken(code) {
    const verifier = sessionStorage.getItem("spotify_pkce_verifier");
    if (!verifier) throw new Error("MISSING_VERIFIER");

    const body = new URLSearchParams({
        client_id: SPOTIFY_CLIENT_ID,
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI,
        code_verifier: verifier
    });

    let res;
    try {
        res = await fetch("https://accounts.spotify.com/api/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body
        });
    } catch (networkErr) {
        throw new Error("NETWORK_ERROR");
    }

    if (!res.ok) {
        let detail = "";
        try {
            const errJson = await res.json();
            detail = errJson.error_description || errJson.error || "";
        } catch (_) { /* ignore non-JSON body */ }
        throw new Error(detail ? `TOKEN_EXCHANGE_FAILED: ${detail}` : "TOKEN_EXCHANGE_FAILED");
    }

    const json = await res.json();
    spotifyAccessToken = json.access_token;
}

// Resilient fetch wrapper: retries on rate-limit/server errors,
// throws specific codes so callers can degrade gracefully instead
// of failing the whole generation over one bad request.
async function spotifyFetch(path, attempt = 1) {
    let res;
    try {
        res = await fetch(`https://api.spotify.com/v1${path}`, {
            headers: { Authorization: `Bearer ${spotifyAccessToken}` }
        });
    } catch (networkErr) {
        if (attempt <= 3) {
            await sleep(500 * attempt);
            return spotifyFetch(path, attempt + 1);
        }
        throw new Error("NETWORK_ERROR");
    }

    if (res.status === 429 && attempt <= 4) {
        const retryAfter = parseInt(res.headers.get("Retry-After") || "1", 10);
        await sleep((retryAfter || 1) * 1000);
        return spotifyFetch(path, attempt + 1);
    }
    if (res.status >= 500 && attempt <= 3) {
        await sleep(400 * attempt);
        return spotifyFetch(path, attempt + 1);
    }
    if (res.status === 401) throw new Error("AUTH_EXPIRED");
    if (res.status === 403) throw new Error("FORBIDDEN");
    if (res.status === 404) throw new Error("NOT_FOUND");
    if (!res.ok) throw new Error(`SPOTIFY_ERROR_${res.status}`);

    if (res.status === 204) return null;
    return res.json();
}

async function spotifyFetchAllPages(path) {
    let items = [];
    let url = path;
    while (url) {
        const json = await spotifyFetch(url);
        items = items.concat(json.items || []);
        url = json.next ? json.next.replace("https://api.spotify.com/v1", "") : null;
    }
    return items;
}

function friendlyMessageFor(err) {
    switch (err && err.message) {
        case "NETWORK_ERROR": return "Couldn't reach Spotify. Check your connection and try again.";
        case "AUTH_EXPIRED": return "Your Spotify session expired. Please reconnect.";
        case "FORBIDDEN": return "Spotify denied that request — a scope may be missing, or this endpoint isn't available for this app yet.";
        case "NOT_FOUND": return "Spotify couldn't find that resource.";
        default: return "Something went wrong talking to Spotify. Please try again.";
    }
}

// -----------------------------
// Spotify Login (real)
// -----------------------------

loginBtn.addEventListener("click", redirectToSpotifyLogin);

(async function initSpotifyAuth() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const authError = params.get("error");

    if (authError) {
        window.history.replaceState({}, "", window.location.pathname);
        showError(`Spotify sign-in was cancelled or denied (${authError}).`);
        return;
    }
    if (!code) return;

    window.history.replaceState({}, "", window.location.pathname);

    try {
        await exchangeCodeForToken(code);
        loginBtn.innerText = "Connected ✓";
        loginBtn.disabled = true;
        clearError();
        await loadLibrariesAndAnchors();
    } catch (err) {
        showError(
            err.message === "NETWORK_ERROR" ? friendlyMessageFor(err) : "Spotify connection failed. Please reconnect and try again.",
            { retry: redirectToSpotifyLogin }
        );
    }
})();

// =====================================================
// Loading real libraries + anchor songs
// =====================================================

async function loadLibrariesAndAnchors() {
    libraryList.innerHTML = `<p class="placeholder-text">Loading your playlists…</p>`;
    songGrid.innerHTML = `<p class="placeholder-text">Loading your top songs…</p>`;

    try {
        const [playlistsRes, likedRes] = await Promise.all([
            spotifyFetch("/me/playlists?limit=50"),
            spotifyFetch("/me/tracks?limit=1")
        ]);
        renderLibraries(playlistsRes.items, likedRes.total);
    } catch (err) {
        if (err.message === "AUTH_EXPIRED") return handleAuthExpired();
        libraryList.innerHTML = `<p class="placeholder-text">Couldn't load your playlists.</p>`;
        showError(friendlyMessageFor(err), { retry: loadLibrariesAndAnchors });
    }

    // Top tracks are used as anchor candidates only — if this fails
    // (e.g. brand-new account with no listening history yet), the
    // rest of the app still works fine without manual anchors.
    try {
        const topRes = await spotifyFetch("/me/top/tracks?time_range=short_term&limit=8");
        renderTopSongs(topRes.items);
    } catch (err) {
        songGrid.innerHTML = `<p class="placeholder-text">No top songs available yet — you can still generate a playlist without anchors.</p>`;
    }
}

function renderLibraries(playlists, likedCount) {
    libraryList.innerHTML = "";

    const likedLabel = document.createElement("label");
    likedLabel.className = "library-item";
    likedLabel.innerHTML = `<input type="checkbox" checked data-id="liked" data-count="${likedCount}"> Liked Songs (${likedCount})`;
    libraryList.appendChild(likedLabel);

    playlists.forEach(p => {
        const label = document.createElement("label");
        label.className = "library-item";
        label.innerHTML = `<input type="checkbox" checked data-id="${p.id}" data-count="${p.tracks.total}"> ${escapeHtml(p.name)} (${p.tracks.total})`;
        libraryList.appendChild(label);
    });
}

function renderTopSongs(tracks) {
    songGrid.innerHTML = "";
    if (tracks.length === 0) {
        songGrid.innerHTML = `<p class="placeholder-text">No top songs yet — play some music on Spotify first, or skip anchors entirely.</p>`;
        return;
    }
    tracks.forEach(t => {
        const label = document.createElement("label");
        label.className = "song-card";
        label.innerHTML = `<input type="checkbox" data-id="${t.id}" data-uri="${t.uri}" data-title="${escapeHtml(t.name)}" data-artist="${escapeHtml(t.artists.map(a => a.name).join(", "))}"> ${escapeHtml(t.name)} — ${escapeHtml(t.artists.map(a => a.name).join(", "))}`;
        songGrid.appendChild(label);
    });
}

function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str || "";
    return div.innerHTML;
}

function handleAuthExpired() {
    spotifyAccessToken = null;
    loginBtn.innerText = "Connect Spotify";
    loginBtn.disabled = false;
    showError("Your Spotify session expired. Please reconnect.", { retry: redirectToSpotifyLogin });
}

// -----------------------------
// State
// -----------------------------

let selectedIntent = "Current Favourites";

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

async function generatePlaylist() {

    if (!spotifyAccessToken) {
        showError("Connect your Spotify account first.");
        return;
    }

    const selectedLibraries = Array.from(libraryList.querySelectorAll('input[type="checkbox"]:checked'))
        .map(cb => ({ id: cb.dataset.id, isLiked: cb.dataset.id === "liked" }));

    if (selectedLibraries.length === 0) {
        showError("Select at least one library before generating.");
        return;
    }

    const anchorTracks = Array.from(songGrid.querySelectorAll('input[type="checkbox"]:checked')).map(cb => ({
        id: cb.dataset.id,
        uri: cb.dataset.uri,
        title: cb.dataset.title,
        artist: cb.dataset.artist
    }));

    const sizeSelect = document.querySelector(".settings select");
    const targetSize = parseInt(sizeSelect.value, 10) || 50;

    loadingSection.classList.remove("hidden");
    resultSection.classList.add("hidden");
    window.scrollTo({ top: loadingSection.offsetTop, behavior: "smooth" });

    try {
        const pool = await buildTrackPool(selectedLibraries);
        if (pool.length === 0) {
            throw new Error("EMPTY_POOL");
        }

        const signals = await fetchSignalsWithFallback(pool);
        const scored = scorePool(pool, signals);
        const result = assemblePlaylist(scored, anchorTracks, selectedIntent, targetSize);

        renderPlaylist(result);

        loadingSection.classList.add("hidden");
        resultSection.classList.remove("hidden");
        resultSection.scrollIntoView({ behavior: "smooth" });
        clearError();
    } catch (err) {
        loadingSection.classList.add("hidden");
        if (err.message === "AUTH_EXPIRED") return handleAuthExpired();
        if (err.message === "EMPTY_POOL") {
            showError("Couldn't find any tracks in your selected libraries.");
            return;
        }
        showError(friendlyMessageFor(err), { retry: generatePlaylist });
    }
}

// -----------------------------
// Build the eligible track pool
// -----------------------------
// Fetches tracks from every selected library. Each library is
// fetched independently — if one playlist fails (deleted, access
// revoked, etc.) the rest still contribute, rather than the whole
// generation failing over one bad source.

async function buildTrackPool(selectedLibraries) {
    const results = await Promise.allSettled(
        selectedLibraries.map(source =>
            source.isLiked
                ? spotifyFetchAllPages("/me/tracks?limit=50")
                : spotifyFetchAllPages(`/playlists/${source.id}/items?limit=100`)
        )
    );

    const byId = new Map();
    results.forEach(r => {
        if (r.status !== "fulfilled") return;
        r.value.forEach(entry => {
            // Feb 2026 API rename: playlist items use `item`, Liked
            // Songs entries still use `track` — support both.
            const track = entry.item || entry.track;
            if (!track || !track.id) return;
            if (!byId.has(track.id)) {
                byId.set(track.id, { ...track, added_at: entry.added_at || null });
            }
        });
    });

    return Array.from(byId.values());
}

// -----------------------------
// Listening signals, with a fallback path
// -----------------------------
// Primary signal: Spotify's top-tracks (short vs. long/medium term)
// plus recently-played, comparing "hot now" against "was a
// favourite, has gone quiet." If those endpoints fail or come back
// empty (new account, missing scope, temporary outage), we fall
// back to using each track's own `added_at` timestamp from the
// pool itself — recently-added counts as "current," long-added
// counts as a rediscovery candidate. Degraded, but never blank.

async function fetchSignalsWithFallback(pool) {
    const results = await Promise.allSettled([
        spotifyFetch("/me/top/tracks?time_range=short_term&limit=50"),
        spotifyFetch("/me/top/tracks?time_range=medium_term&limit=50"),
        spotifyFetch("/me/top/tracks?time_range=long_term&limit=50"),
        spotifyFetch("/me/player/recently-played?limit=50"),
    ]);

    const [shortRes, medRes, longRes, recentRes] = results;

    const shortIds = new Set(shortRes.status === "fulfilled" ? shortRes.value.items.map(t => t.id) : []);
    const medIds = new Set(medRes.status === "fulfilled" ? medRes.value.items.map(t => t.id) : []);
    const longIds = new Set(longRes.status === "fulfilled" ? longRes.value.items.map(t => t.id) : []);
    const recentIds = new Set(recentRes.status === "fulfilled" ? (recentRes.value.items || []).map(i => i.track.id) : []);

    const anyRealSignal = shortIds.size + medIds.size + longIds.size + recentIds.size > 0;

    if (anyRealSignal) {
        return { mode: "api", shortIds, medIds, longIds, recentIds };
    }

    // Fallback: derive recency/dormancy purely from added_at dates
    // already present in the pool — no extra API calls needed.
    const withDates = pool.filter(t => t.added_at).map(t => ({ id: t.id, addedAt: new Date(t.added_at).getTime() }));
    if (withDates.length === 0) {
        return { mode: "none" };
    }
    const times = withDates.map(t => t.addedAt);
    const newest = Math.max(...times);
    const oldest = Math.min(...times);
    return { mode: "added_at", withDates, newest, oldest };
}

// -----------------------------
// Scoring
// -----------------------------

function scorePool(pool, signals) {
    return pool.map(t => {
        let recency = 0;
        let dormancy = 0;

        if (signals.mode === "api") {
            const isRecent = signals.shortIds.has(t.id) || signals.recentIds.has(t.id);
            const wasFavorite = signals.longIds.has(t.id) || signals.medIds.has(t.id);
            recency = isRecent ? 1 : 0;
            dormancy = (wasFavorite && !isRecent) ? 1 : 0;
        } else if (signals.mode === "added_at" && t.added_at) {
            const addedAt = new Date(t.added_at).getTime();
            const span = signals.newest - signals.oldest || 1;
            // newer additions score higher on recency, older ones on dormancy
            recency = (addedAt - signals.oldest) / span;
            dormancy = 1 - recency;
        }

        const baseline = (recency === 0 && dormancy === 0) ? 0.15 : 0;

        return {
            id: t.id,
            title: t.name,
            artist: (t.artists || []).map(a => a.name).join(", "),
            url: t.external_urls ? t.external_urls.spotify : `https://open.spotify.com/track/${t.id}`,
            uri: t.uri,
            recency, dormancy, baseline,
            tag: dormancy > 0.5 ? "worth revisiting" : (recency > 0.5 ? "in rotation" : "")
        };
    });
}

function weightForIntent(track, intent) {
    switch (intent) {
        case "Current Favourites": return track.recency * 0.8 + track.dormancy * 0.2 + track.baseline;
        case "Rediscover Old Favourites": return track.dormancy * 0.8 + track.recency * 0.2 + track.baseline;
        case "Balanced Mix": return track.recency * 0.5 + track.dormancy * 0.5 + track.baseline;
        case "Surprise Me": return 0.4 + Math.random() * 0.6;
        default: return track.recency * 0.5 + track.dormancy * 0.5 + track.baseline;
    }
}

function assemblePlaylist(scored, anchorTracks, intent, targetSize) {
    const anchorIds = new Set(anchorTracks.map(a => a.id));

    const anchors = scored.filter(t => anchorIds.has(t.id));
    // anything the user manually picked as an anchor but that
    // wasn't in the fetched pool (edge case) still gets included
    const missingAnchors = anchorTracks.filter(a => !scored.some(t => t.id === a.id))
        .map(a => ({ id: a.id, title: a.title, artist: a.artist, url: `https://open.spotify.com/track/${a.id}`, uri: a.uri, tag: "anchor" }));

    const remainingPool = scored.filter(t => !anchorIds.has(t.id));
    const remainingSlots = Math.max(targetSize - anchors.length - missingAnchors.length, 0);

    const rest = weightedSampleWithoutReplacement(
        remainingPool,
        (t) => weightForIntent(t, intent),
        Math.min(remainingSlots, remainingPool.length)
    );

    return shuffle([...anchors, ...missingAnchors, ...rest]);
}

function weightedSampleWithoutReplacement(items, weightFn, count) {
    const pool = items.map(t => ({ t, w: Math.max(weightFn(t), 0.001) }));
    const chosen = [];
    const artistCounts = new Map();
    const ARTIST_CAP = 3;

    while (chosen.length < count && pool.length > 0) {
        const totalWeight = pool.reduce((s, x) => s + x.w, 0);
        let r = Math.random() * totalWeight;
        let idx = pool.length - 1;
        for (let i = 0; i < pool.length; i++) {
            r -= pool[i].w;
            if (r <= 0) { idx = i; break; }
        }

        const candidate = pool[idx].t;
        const count_ = artistCounts.get(candidate.artist) || 0;
        pool.splice(idx, 1);
        if (count_ >= ARTIST_CAP) continue;

        chosen.push(candidate);
        artistCounts.set(candidate.artist, count_ + 1);
    }
    return chosen;
}

// -----------------------------
// Render results
// -----------------------------

function renderPlaylist(tracks) {
    playlistPreview.innerHTML = "";
    tracks.forEach(track => playlistPreview.appendChild(createTrack(track)));
}

function createTrack(track) {

    const container = document.createElement("div");

    container.className = "track";
    container.dataset.uri = track.uri || "";

    container.innerHTML = `

        <div class="album-art"></div>

        <div>

            <h4>${escapeHtml(track.title)}</h4>

            <span>${escapeHtml(track.artist)}</span>

            <small>${track.tag || selectedIntent}</small>

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