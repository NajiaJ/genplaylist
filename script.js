// ==========================================
// GenPlaylist
// Human-Centred Design Project
// script.js
// ==========================================


// =====================================================
// Elements
// =====================================================

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

function showError(message, { retry } = {}) {

    console.error("[GenPlaylist error]", message);

    errorBannerText.textContent = message;
    errorBanner.classList.remove("hidden");

    const existingRetry =
        errorBanner.querySelector(".retry-btn");

    if (existingRetry) {
        existingRetry.remove();
    }

    if (typeof retry === "function") {

        const retryBtn =
            document.createElement("button");

        retryBtn.className = "retry-btn";
        retryBtn.textContent = "Retry";

        retryBtn.addEventListener("click", () => {

            clearError();

            retry();

        });

        errorBanner.insertBefore(
            retryBtn,
            errorBannerDismiss
        );
    }
}


function clearError() {

    errorBanner.classList.add("hidden");

    errorBannerText.textContent = "";

    const existingRetry =
        errorBanner.querySelector(".retry-btn");

    if (existingRetry) {
        existingRetry.remove();
    }
}


errorBannerDismiss.addEventListener(
    "click",
    clearError
);


// =====================================================
// Global Error Handling
// =====================================================

window.addEventListener("error", () => {

    showError(
        "Something unexpected went wrong. Please refresh and try again."
    );

});


window.addEventListener(
    "unhandledrejection",
    () => {

        showError(
            "Something unexpected went wrong. Please refresh and try again."
        );

    }
);


// =====================================================
// Network Status
// =====================================================

window.addEventListener(
    "offline",
    () => {

        showError(
            "You're offline. Reconnect to continue using Spotify features."
        );

    }
);


window.addEventListener(
    "online",
    clearError
);


function sleep(ms) {

    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });

}


// =====================================================
// Supabase
// =====================================================

const SUPABASE_URL =
    "https://nyxawdoedmqtmtoihsmx.supabase.co";

const SUPABASE_ANON_KEY =
    "sb_publishable_vNeLmLSYzA2tgZ3Wz_vX3A_JM5rG_Z3";

let supabaseClient = null;


function getSupabaseClient() {

    if (supabaseClient) {
        return supabaseClient;
    }

    const PLACEHOLDER_URL =
        "PASTE_YOUR_SUPABASE_PROJECT_URL_HERE";

    const PLACEHOLDER_KEY =
        "PASTE_YOUR_SUPABASE_ANON_KEY_HERE";


    if (
        !SUPABASE_URL ||
        SUPABASE_URL === PLACEHOLDER_URL ||
        !SUPABASE_ANON_KEY ||
        SUPABASE_ANON_KEY === PLACEHOLDER_KEY
    ) {

        throw new Error(
            "SUPABASE_NOT_CONFIGURED"
        );

    }


    if (
        !window.supabase ||
        typeof window.supabase.createClient !== "function"
    ) {

        throw new Error(
            "SUPABASE_LIBRARY_MISSING"
        );

    }


    supabaseClient =
        window.supabase.createClient(
            SUPABASE_URL,
            SUPABASE_ANON_KEY
        );

    return supabaseClient;
}


// =====================================================
// Save Playlist to Supabase
// =====================================================

async function savePlaylistToDatabase(
    tracks,
    intent
) {

    saveDbBtn.disabled = true;
    saveDbBtn.textContent = "Saving…";


    try {

        const client =
            getSupabaseClient();


        const nameInput =
            document.querySelector(
                '.settings input[type="text"]'
            );


        const { error } =
            await client
                .from("generated_playlists")
                .insert({

                    playlist_name:
                        nameInput &&
                        nameInput.value.trim()
                            ? nameInput.value.trim()
                            : null,

                    intent: intent,

                    track_count:
                        tracks.length,

                    tracks: tracks

                });


        if (error) {
            throw error;
        }


        saveDbBtn.textContent =
            "Saved ✓";

        clearError();


    } catch (err) {

        console.error(
            "[GenPlaylist Supabase error]",
            err
        );


        saveDbBtn.disabled = false;

        saveDbBtn.textContent =
            "Save Playlist";


        if (
            err.message ===
            "SUPABASE_NOT_CONFIGURED"
        ) {

            showError(
                "Supabase isn't configured yet — add your project URL and anon key near the top of script.js."
            );

            return;
        }


        if (
            err.message ===
            "SUPABASE_LIBRARY_MISSING"
        ) {

            showError(
                "The Supabase library could not be loaded. Please refresh and try again."
            );

            return;
        }


        showError(
            "Couldn't save your playlist. Please try again.",
            {
                retry: () =>
                    savePlaylistToDatabase(
                        tracks,
                        intent
                    )
            }
        );

    }
}


saveDbBtn.addEventListener(
    "click",
    () => {

        const tracksToSave =
            Array.from(
                playlistPreview.querySelectorAll(".track")
            ).map(el => ({

                title:
                    el.querySelector("h4")
                        ?.textContent || "",

                artist:
                    el.querySelector("span")
                        ?.textContent || ""

            }));


        if (tracksToSave.length === 0) {

            showError(
                "Generate a playlist first before saving."
            );

            return;
        }


        savePlaylistToDatabase(
            tracksToSave,
            selectedIntent
        );

    }
);


// =====================================================
// Spotify Configuration
// =====================================================

const SPOTIFY_CLIENT_ID =
    "147cdfbc274741aa9adc2ecdf0b24bc6";


const REDIRECT_URI =
    window.location.origin +
    window.location.pathname;


const SPOTIFY_SCOPES = [

    "playlist-read-private",

    "playlist-read-collaborative",

    "playlist-modify-public",

    "playlist-modify-private",

    "user-library-read",

    "user-top-read",

    "user-read-recently-played"

].join(" ");


let spotifyAccessToken = null;


// =====================================================
// PKCE Helpers
// =====================================================

function base64UrlEncode(bytes) {

    return btoa(
        String.fromCharCode(
            ...new Uint8Array(bytes)
        )
    )
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

}


async function pkceChallenge() {

    const verifierBytes =
        new Uint8Array(64);

    crypto.getRandomValues(
        verifierBytes
    );


    const verifier =
        base64UrlEncode(
            verifierBytes
        );


    const digest =
        await crypto.subtle.digest(
            "SHA-256",
            new TextEncoder().encode(
                verifier
            )
        );


    return {

        verifier,

        challenge:
            base64UrlEncode(
                digest
            )

    };

}


// =====================================================
// Spotify Login
// =====================================================

async function redirectToSpotifyLogin() {

    const PLACEHOLDER_CLIENT_ID =
        "PASTE_YOUR_SPOTIFY_CLIENT_ID_HERE";


    if (
        !SPOTIFY_CLIENT_ID ||
        SPOTIFY_CLIENT_ID ===
            PLACEHOLDER_CLIENT_ID
    ) {

        showError(
            "No Spotify Client ID is set. Add yours near the top of script.js before connecting."
        );

        return;
    }


    try {

        const {
            verifier,
            challenge
        } = await pkceChallenge();


        sessionStorage.setItem(
            "spotify_pkce_verifier",
            verifier
        );


        const params =
            new URLSearchParams({

                client_id:
                    SPOTIFY_CLIENT_ID,

                response_type:
                    "code",

                redirect_uri:
                    REDIRECT_URI,

                scope:
                    SPOTIFY_SCOPES,

                code_challenge_method:
                    "S256",

                code_challenge:
                    challenge

            });


        window.location.href =
            `https://accounts.spotify.com/authorize?${params.toString()}`;


    } catch (err) {

        console.error(
            "[GenPlaylist login error]",
            err
        );


        showError(
            "Couldn't start the Spotify login. Please try again.",
            {
                retry:
                    redirectToSpotifyLogin
            }
        );

    }
}


// =====================================================
// Exchange Spotify Authorization Code
// =====================================================

async function exchangeCodeForToken(code) {

    const verifier =
        sessionStorage.getItem(
            "spotify_pkce_verifier"
        );


    if (!verifier) {

        throw new Error(
            "MISSING_VERIFIER"
        );

    }


    const body =
        new URLSearchParams({

            client_id:
                SPOTIFY_CLIENT_ID,

            grant_type:
                "authorization_code",

            code:
                code,

            redirect_uri:
                REDIRECT_URI,

            code_verifier:
                verifier

        });


    let res;


    try {

        res =
            await fetch(
                "https://accounts.spotify.com/api/token",
                {

                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/x-www-form-urlencoded"
                    },

                    body

                }
            );

    } catch (networkErr) {

        throw new Error(
            "NETWORK_ERROR"
        );

    }


    if (!res.ok) {

        let detail = "";


        try {

            const errJson =
                await res.json();

            detail =
                errJson.error_description ||
                errJson.error ||
                "";

        } catch (_) {
            // Ignore invalid response body.
        }


        throw new Error(
            detail
                ? `TOKEN_EXCHANGE_FAILED: ${detail}`
                : "TOKEN_EXCHANGE_FAILED"
        );

    }


    const json =
        await res.json();


    spotifyAccessToken =
        json.access_token;

}


// =====================================================
// Spotify API Fetch Wrapper
// =====================================================

async function spotifyFetch(
    path,
    options = {},
    attempt = 1
) {

    let res;


    try {

        res =
            await fetch(
                `https://api.spotify.com/v1${path}`,
                {

                    method:
                        options.method || "GET",

                    headers: {

                        Authorization:
                            `Bearer ${spotifyAccessToken}`,

                        ...(options.body
                            ? {
                                "Content-Type":
                                    "application/json"
                            }
                            : {})

                    },

                    body:
                        options.body

                }
            );


    } catch (networkErr) {

        if (attempt <= 3) {

            await sleep(
                500 * attempt
            );

            return spotifyFetch(
                path,
                options,
                attempt + 1
            );

        }


        throw new Error(
            "NETWORK_ERROR"
        );

    }


    // Rate limit
    if (
        res.status === 429 &&
        attempt <= 4
    ) {

        const retryAfter =
            parseInt(
                res.headers.get(
                    "Retry-After"
                ) || "1",
                10
            );


        await sleep(
            (retryAfter || 1) * 1000
        );


        return spotifyFetch(
            path,
            options,
            attempt + 1
        );

    }


    // Server errors
    if (
        res.status >= 500 &&
        attempt <= 3
    ) {

        await sleep(
            400 * attempt
        );


        return spotifyFetch(
            path,
            options,
            attempt + 1
        );

    }


    if (res.status === 401) {
        throw new Error(
            "AUTH_EXPIRED"
        );
    }


    if (res.status === 403) {
        throw new Error(
            "FORBIDDEN"
        );
    }


    if (res.status === 404) {
        throw new Error(
            "NOT_FOUND"
        );
    }


    if (!res.ok) {

        throw new Error(
            `SPOTIFY_ERROR_${res.status}`
        );

    }


    if (res.status === 204) {
        return null;
    }


    return res.json();

}


// =====================================================
// Spotify Pagination
// =====================================================

async function spotifyFetchAllPages(path) {

    let items = [];

    let url = path;


    while (url) {

        const json =
            await spotifyFetch(url);


        items =
            items.concat(
                json.items || []
            );


        url =
            json.next
                ? json.next.replace(
                    "https://api.spotify.com/v1",
                    ""
                )
                : null;

    }


    return items;

}


// =====================================================
// Friendly Spotify Errors
// =====================================================

function friendlyMessageFor(err) {

    switch (
        err && err.message
    ) {

        case "NETWORK_ERROR":

            return "Couldn't reach Spotify. Check your connection and try again.";


        case "AUTH_EXPIRED":

            return "Your Spotify session expired. Please reconnect.";


        case "FORBIDDEN":

            return "Spotify denied that request — a scope may be missing, or this endpoint isn't available for this app yet.";


        case "NOT_FOUND":

            return "Spotify couldn't find that resource.";


        default:

            return "Something went wrong talking to Spotify. Please try again.";

    }

}


// =====================================================
// Spotify Connection Button States
// =====================================================

function setSpotifyConnectedState() {

    loginBtn.innerText =
        "Log Out";

    loginBtn.disabled =
        false;

    loginBtn.classList.add(
        "logout-state"
    );

}


function setSpotifyDisconnectedState() {

    loginBtn.innerText =
        "Connect Spotify";

    loginBtn.disabled =
        false;

    loginBtn.classList.remove(
        "logout-state"
    );

}


// =====================================================
// Fake Spotify Logout
// =====================================================
// IMPORTANT:
// This logs the user out of GenPlaylist.
// It does NOT log the user out of the Spotify website/browser.
//
// This is intentional for the HCD prototype.

function fakeSpotifyLogout() {

    // Remove the Spotify access token
    // from this page's JavaScript state.

    spotifyAccessToken = null;


    // Remove the PKCE verifier.

    sessionStorage.removeItem(
        "spotify_pkce_verifier"
    );


    // Reset connection button.

    setSpotifyDisconnectedState();


    // Reset library section.

    libraryList.innerHTML =
        `<p class="placeholder-text">
            Connect to Spotify to see your playlists here.
        </p>`;


    // Reset top songs.

    songGrid.innerHTML =
        `<p class="placeholder-text">
            Connect to Spotify to see your top songs here.
        </p>`;


    // Hide generated playlist.

    loadingSection.classList.add(
        "hidden"
    );

    resultSection.classList.add(
        "hidden"
    );


    // Clear playlist preview.

    playlistPreview.innerHTML = "";


    // Reset playlist name.

    const nameInput =
        document.querySelector(
            '.settings input[type="text"]'
        );


    if (nameInput) {

        nameInput.value = "";

    }


    clearError();


    // Return to top of page.

    window.scrollTo({

        top: 0,

        behavior: "smooth"

    });

}


// =====================================================
// Spotify Login Button
// =====================================================

loginBtn.addEventListener(
    "click",
    () => {

        if (spotifyAccessToken) {

            fakeSpotifyLogout();

            return;

        }


        redirectToSpotifyLogin();

    }
);


// =====================================================
// Initialise Spotify Authentication
// =====================================================

(async function initSpotifyAuth() {

    const params =
        new URLSearchParams(
            window.location.search
        );


    const code =
        params.get("code");


    const authError =
        params.get("error");


    // User cancelled Spotify login.

    if (authError) {

        window.history.replaceState(
            {},
            "",
            window.location.pathname
        );


        showError(
            `Spotify sign-in was cancelled or denied (${authError}).`
        );


        return;

    }


    // Normal page load.

    if (!code) {
        return;
    }


    // Remove OAuth code from URL.

    window.history.replaceState(
        {},
        "",
        window.location.pathname
    );


    try {

        await exchangeCodeForToken(
            code
        );


        setSpotifyConnectedState();


        clearError();


        await loadLibrariesAndAnchors();


    } catch (err) {

        console.error(
            "[GenPlaylist auth error]",
            err
        );


        showError(

            err.message ===
                "NETWORK_ERROR"

                ? friendlyMessageFor(err)

                : "Spotify connection failed. Please reconnect and try again.",

            {
                retry:
                    redirectToSpotifyLogin
            }

        );

    }

})();


// =====================================================
// Load Spotify Libraries + Anchor Songs
// =====================================================

async function loadLibrariesAndAnchors() {

    libraryList.innerHTML =
        `<p class="placeholder-text">
            Loading your playlists…
        </p>`;


    songGrid.innerHTML =
        `<p class="placeholder-text">
            Loading your top songs…
        </p>`;


    // -----------------------------------------
    // Libraries
    // -----------------------------------------

    try {

        const [
            playlistsRes,
            likedRes
        ] = await Promise.all([

            spotifyFetch(
                "/me/playlists?limit=50"
            ),

            spotifyFetch(
                "/me/tracks?limit=1"
            )

        ]);


        renderLibraries(
            playlistsRes.items || [],
            likedRes.total || 0
        );


    } catch (err) {

        if (
            err.message ===
            "AUTH_EXPIRED"
        ) {

            handleAuthExpired();

            return;

        }


        libraryList.innerHTML =
            `<p class="placeholder-text">
                Couldn't load your playlists.
            </p>`;


        showError(
            friendlyMessageFor(err),
            {
                retry:
                    loadLibrariesAndAnchors
            }
        );

    }


    // -----------------------------------------
    // Top Tracks
    // -----------------------------------------

    try {

        const topRes =
            await spotifyFetch(
                "/me/top/tracks?time_range=short_term&limit=8"
            );


        renderTopSongs(
            topRes.items || []
        );


    } catch (err) {

        songGrid.innerHTML =
            `<p class="placeholder-text">
                No top songs available yet — you can still generate a playlist without anchors.
            </p>`;

    }

}


// =====================================================
// Render Libraries
// =====================================================

function renderLibraries(
    playlists,
    likedCount
) {

    libraryList.innerHTML = "";


    const likedLabel =
        document.createElement("label");


    likedLabel.className =
        "library-item";


    likedLabel.innerHTML =
        `<input
            type="checkbox"
            checked
            data-id="liked"
            data-count="${likedCount}"
        >
        Liked Songs (${likedCount})`;


    libraryList.appendChild(
        likedLabel
    );


    playlists.forEach(p => {

        const label =
            document.createElement("label");


        label.className =
            "library-item";


        const trackCount =
            (p.tracks &&
                p.tracks.total) ??
            (p.items &&
                p.items.total) ??
            "?";


        label.innerHTML =
            `<input
                type="checkbox"
                checked
                data-id="${escapeHtml(p.id)}"
                data-count="${trackCount}"
            >
            ${escapeHtml(p.name)}
            (${trackCount})`;


        libraryList.appendChild(
            label
        );

    });

}


// =====================================================
// Render Top Songs
// =====================================================

function renderTopSongs(tracks) {

    songGrid.innerHTML = "";


    if (!tracks || tracks.length === 0) {

        songGrid.innerHTML =
            `<p class="placeholder-text">
                No top songs yet — play some music on Spotify first, or skip anchors entirely.
            </p>`;


        return;

    }


    tracks.forEach(t => {

        const label =
            document.createElement("label");


        label.className =
            "song-card";


        const image =
            getSmallestImage(
                t.album
            ) || "";


        const artist =
            (t.artists || [])
                .map(a => a.name)
                .join(", ");


        label.innerHTML =
            `<input
                type="checkbox"
                data-id="${escapeHtml(t.id)}"
                data-uri="${escapeHtml(t.uri || "")}"
                data-title="${escapeHtml(t.name)}"
                data-artist="${escapeHtml(artist)}"
                data-image="${escapeHtml(image)}"
            >
            ${escapeHtml(t.name)}
            — ${escapeHtml(artist)}`;


        songGrid.appendChild(
            label
        );

    });

}


// =====================================================
// HTML Escaping
// =====================================================

function escapeHtml(str) {

    const div =
        document.createElement("div");


    div.textContent =
        str || "";


    return div.innerHTML;

}


// =====================================================
// Handle Expired Spotify Authentication
// =====================================================

function handleAuthExpired() {

    spotifyAccessToken = null;


    sessionStorage.removeItem(
        "spotify_pkce_verifier"
    );


    setSpotifyDisconnectedState();


    libraryList.innerHTML =
        `<p class="placeholder-text">
            Connect to Spotify to see your playlists here.
        </p>`;


    songGrid.innerHTML =
        `<p class="placeholder-text">
            Connect to Spotify to see your top songs here.
        </p>`;


    showError(

        "Your Spotify session expired. Please reconnect.",

        {
            retry:
                redirectToSpotifyLogin
        }

    );

}


// =====================================================
// Application State
// =====================================================

let selectedIntent =
    "Current Favourites";


// =====================================================
// Hero Button
// =====================================================

startBtn.addEventListener("click", redirectToSpotifyLogin);

// =====================================================
// Intent Selection
// =====================================================

intentionButtons.forEach(
    button => {

        button.addEventListener(
            "click",
            () => {

                intentionButtons.forEach(
                    btn =>
                        btn.classList.remove(
                            "selected"
                        )
                );


                button.classList.add(
                    "selected"
                );


                selectedIntent =
                    button.innerText.trim();

            }
        );

    }
);


// =====================================================
// Generate Playlist
// =====================================================

generateBtn.addEventListener(
    "click",
    generatePlaylist
);


async function generatePlaylist() {

    if (!spotifyAccessToken) {

        showError(
            "Connect your Spotify account first."
        );

        return;

    }


    const selectedLibraries =
        Array.from(
            libraryList.querySelectorAll(
                'input[type="checkbox"]:checked'
            )
        ).map(cb => ({

            id:
                cb.dataset.id,

            isLiked:
                cb.dataset.id === "liked"

        }));


    if (
        selectedLibraries.length === 0
    ) {

        showError(
            "Select at least one library before generating."
        );

        return;

    }


    const anchorTracks =
        Array.from(
            songGrid.querySelectorAll(
                'input[type="checkbox"]:checked'
            )
        ).map(cb => ({

            id:
                cb.dataset.id,

            uri:
                cb.dataset.uri,

            title:
                cb.dataset.title,

            artist:
                cb.dataset.artist,

            image:
                cb.dataset.image || null

        }));


    const sizeSelect =
        document.querySelector(
            ".settings select"
        );


    const targetSize =
        parseInt(
            sizeSelect.value,
            10
        ) || 50;


    loadingSection.classList.remove(
        "hidden"
    );


    resultSection.classList.add(
        "hidden"
    );


    window.scrollTo({

        top:
            loadingSection.offsetTop,

        behavior:
            "smooth"

    });


    try {

        const pool =
            await buildTrackPool(
                selectedLibraries
            );


        if (pool.length === 0) {

            throw new Error(
                "EMPTY_POOL"
            );

        }


        const signals =
            await fetchSignalsWithFallback(
                pool
            );


        const scored =
            scorePool(
                pool,
                signals
            );


        const result =
            assemblePlaylist(
                scored,
                anchorTracks,
                selectedIntent,
                targetSize
            );


        renderPlaylist(
            result
        );


        loadingSection.classList.add(
            "hidden"
        );


        resultSection.classList.remove(
            "hidden"
        );


        resultSection.scrollIntoView({
            behavior: "smooth"
        });


        clearError();


    } catch (err) {

        loadingSection.classList.add(
            "hidden"
        );


        if (
            err.message ===
            "AUTH_EXPIRED"
        ) {

            handleAuthExpired();

            return;

        }


        if (
            err.message ===
            "EMPTY_POOL"
        ) {

            showError(
                "Couldn't find any tracks in your selected libraries."
            );

            return;

        }


        showError(
            friendlyMessageFor(err),
            {
                retry:
                    generatePlaylist
            }
        );

    }

}


// =====================================================
// Build Eligible Track Pool
// =====================================================

async function buildTrackPool(
    selectedLibraries
) {

    const results =
        await Promise.allSettled(

            selectedLibraries.map(
                source =>

                    source.isLiked

                        ? spotifyFetchAllPages(
                            "/me/tracks?limit=50"
                        )

                        : spotifyFetchAllPages(
                            `/playlists/${source.id}/items?limit=100`
                        )

            )

        );


    const byId =
        new Map();


    results.forEach(r => {

        if (
            r.status !== "fulfilled"
        ) {
            return;
        }


        r.value.forEach(entry => {

            const track =
                entry.item ||
                entry.track;


            if (
                !track ||
                !track.id
            ) {
                return;
            }


            if (
                !byId.has(track.id)
            ) {

                byId.set(
                    track.id,
                    {
                        ...track,
                        added_at:
                            entry.added_at ||
                            null
                    }
                );

            }

        });

    });


    return Array.from(
        byId.values()
    );

}


// =====================================================
// Listening Signals
// =====================================================

async function fetchSignalsWithFallback(
    pool
) {

    const results =
        await Promise.allSettled([

            spotifyFetch(
                "/me/top/tracks?time_range=short_term&limit=50"
            ),

            spotifyFetch(
                "/me/top/tracks?time_range=medium_term&limit=50"
            ),

            spotifyFetch(
                "/me/top/tracks?time_range=long_term&limit=50"
            ),

            spotifyFetch(
                "/me/player/recently-played?limit=50"
            )

        ]);


    const [
        shortRes,
        medRes,
        longRes,
        recentRes
    ] = results;


    const shortIds =
        new Set(
            shortRes.status === "fulfilled"
                ? (shortRes.value.items || [])
                    .map(t => t.id)
                : []
        );


    const medIds =
        new Set(
            medRes.status === "fulfilled"
                ? (medRes.value.items || [])
                    .map(t => t.id)
                : []
        );


    const longIds =
        new Set(
            longRes.status === "fulfilled"
                ? (longRes.value.items || [])
                    .map(t => t.id)
                : []
        );


    const recentIds =
        new Set(
            recentRes.status === "fulfilled"
                ? (recentRes.value.items || [])
                    .map(i =>
                        i.track &&
                        i.track.id
                    )
                    .filter(Boolean)
                : []
        );


    const anyRealSignal =
        shortIds.size +
        medIds.size +
        longIds.size +
        recentIds.size > 0;


    if (anyRealSignal) {

        return {

            mode:
                "api",

            shortIds,
            medIds,
            longIds,
            recentIds

        };

    }


    // -----------------------------------------
    // Fallback: added_at
    // -----------------------------------------

    const withDates =
        pool
            .filter(t => t.added_at)
            .map(t => ({

                id:
                    t.id,

                addedAt:
                    new Date(
                        t.added_at
                    ).getTime()

            }));


    if (
        withDates.length === 0
    ) {

        return {
            mode: "none"
        };

    }


    const times =
        withDates.map(
            t => t.addedAt
        );


    const newest =
        Math.max(...times);


    const oldest =
        Math.min(...times);


    return {

        mode:
            "added_at",

        withDates,

        newest,

        oldest

    };

}


// =====================================================
// Album Artwork Helper
// =====================================================

function getSmallestImage(album) {

    if (
        !album ||
        !album.images ||
        album.images.length === 0
    ) {

        return null;

    }


    return album.images[
        album.images.length - 1
    ].url;

}


// =====================================================
// Score Track Pool
// =====================================================

function scorePool(
    pool,
    signals
) {

    return pool.map(t => {

        let recency = 0;
        let dormancy = 0;


        if (
            signals.mode === "api"
        ) {

            const isRecent =
                signals.shortIds.has(t.id) ||
                signals.recentIds.has(t.id);


            const wasFavorite =
                signals.longIds.has(t.id) ||
                signals.medIds.has(t.id);


            recency =
                isRecent
                    ? 1
                    : 0;


            dormancy =
                wasFavorite && !isRecent
                    ? 1
                    : 0;

        }


        else if (
            signals.mode ===
            "added_at" &&
            t.added_at
        ) {

            const addedAt =
                new Date(
                    t.added_at
                ).getTime();


            const span =
                signals.newest -
                signals.oldest ||
                1;


            recency =
                (addedAt -
                    signals.oldest) /
                span;


            dormancy =
                1 - recency;

        }


        const baseline =
            (
                recency === 0 &&
                dormancy === 0
            )
                ? 0.15
                : 0;


        return {

            id:
                t.id,

            title:
                t.name,

            artist:
                (t.artists || [])
                    .map(a => a.name)
                    .join(", "),

            image:
                getSmallestImage(
                    t.album
                ),

            url:
                t.external_urls
                    ? t.external_urls.spotify
                    : `https://open.spotify.com/track/${t.id}`,

            uri:
                t.uri,

            recency,

            dormancy,

            baseline,

            tag:
                dormancy > 0.5
                    ? "worth revisiting"
                    : recency > 0.5
                        ? "in rotation"
                        : ""

        };

    });

}


// =====================================================
// Intent Weighting
// =====================================================

function weightForIntent(
    track,
    intent
) {

    switch (intent) {

        case "Current Favourites":

            return (
                track.recency * 0.8 +
                track.dormancy * 0.2 +
                track.baseline
            );


        case "Rediscover Old Favourites":

            return (
                track.dormancy * 0.8 +
                track.recency * 0.2 +
                track.baseline
            );


        case "Balanced Mix":

            return (
                track.recency * 0.5 +
                track.dormancy * 0.5 +
                track.baseline
            );


        case "Surprise Me":

            return (
                0.4 +
                Math.random() * 0.6
            );


        default:

            return (
                track.recency * 0.5 +
                track.dormancy * 0.5 +
                track.baseline
            );

    }

}


// =====================================================
// Assemble Playlist
// =====================================================

function assemblePlaylist(
    scored,
    anchorTracks,
    intent,
    targetSize
) {

    const anchorIds =
        new Set(
            anchorTracks.map(
                a => a.id
            )
        );


    const anchors =
        scored.filter(
            t => anchorIds.has(t.id)
        );


    const missingAnchors =
        anchorTracks

            .filter(
                a =>
                    !scored.some(
                        t =>
                            t.id === a.id
                    )
            )

            .map(a => ({

                id:
                    a.id,

                title:
                    a.title,

                artist:
                    a.artist,

                image:
                    a.image,

                url:
                    `https://open.spotify.com/track/${a.id}`,

                uri:
                    a.uri,

                tag:
                    "anchor"

            }));


    const remainingPool =
        scored.filter(
            t =>
                !anchorIds.has(t.id)
        );


    const remainingSlots =
        Math.max(
            targetSize -
            anchors.length -
            missingAnchors.length,
            0
        );


    const rest =
        weightedSampleWithoutReplacement(

            remainingPool,

            t =>
                weightForIntent(
                    t,
                    intent
                ),

            Math.min(
                remainingSlots,
                remainingPool.length
            )

        );


    return shuffle([

        ...anchors,

        ...missingAnchors,

        ...rest

    ]);

}


// =====================================================
// Weighted Sampling
// =====================================================

function weightedSampleWithoutReplacement(
    items,
    weightFn,
    count
) {

    const pool =
        items.map(t => ({

            t,

            w:
                Math.max(
                    weightFn(t),
                    0.001
                )

        }));


    const chosen = [];


    const artistCounts =
        new Map();


    const ARTIST_CAP = 3;


    while (
        chosen.length < count &&
        pool.length > 0
    ) {

        const totalWeight =
            pool.reduce(
                (sum, x) =>
                    sum + x.w,
                0
            );


        let r =
            Math.random() *
            totalWeight;


        let idx =
            pool.length - 1;


        for (
            let i = 0;
            i < pool.length;
            i++
        ) {

            r -= pool[i].w;


            if (r <= 0) {

                idx = i;

                break;

            }

        }


        const candidate =
            pool[idx].t;


        const count_ =
            artistCounts.get(
                candidate.artist
            ) || 0;


        pool.splice(
            idx,
            1
        );


        if (
            count_ >= ARTIST_CAP
        ) {

            continue;

        }


        chosen.push(
            candidate
        );


        artistCounts.set(
            candidate.artist,
            count_ + 1
        );

    }


    return chosen;

}


// =====================================================
// Render Playlist
// =====================================================

function renderPlaylist(
    tracks
) {

    playlistPreview.innerHTML =
        "";


    tracks.forEach(
        track => {

            playlistPreview.appendChild(
                createTrack(track)
            );

        }
    );

}


// =====================================================
// Create Track Element
// =====================================================

function createTrack(
    track
) {

    const container =
        document.createElement(
            "div"
        );


    container.className =
        "track";


    container.dataset.uri =
        track.uri || "";


    const albumArt =
        track.image
            ? `<img
                    class="album-art"
                    src="${escapeHtml(track.image)}"
                    alt=""
                    loading="lazy"
                    onerror="this.outerHTML='<div class=&quot;album-art&quot;></div>'"
               >`
            : `<div class="album-art"></div>`;


    container.innerHTML = `

        ${albumArt}

        <div>

            <h4>
                ${escapeHtml(track.title)}
            </h4>

            <span>
                ${escapeHtml(track.artist)}
            </span>

            <small>
                ${escapeHtml(
                    track.tag ||
                    selectedIntent
                )}
            </small>

        </div>

    `;


    return container;

}


// =====================================================
// Shuffle Helper
// =====================================================

function shuffle(array) {

    for (
        let i = array.length - 1;
        i > 0;
        i--
    ) {

        const j =
            Math.floor(
                Math.random() *
                (i + 1)
            );


        [
            array[i],
            array[j]
        ] = [
            array[j],
            array[i]
        ];

    }


    return array;

}


// =====================================================
// Save Generated Playlist to Spotify
// =====================================================

async function savePlaylistToSpotify() {

    const spotifyButton =
        Array.from(
            document.querySelectorAll(
                ".spotify-btn"
            )
        ).find(
            button =>
                button.innerText.trim() ===
                "Save to Spotify"
        );


    if (!spotifyButton) {

        showError(
            "Couldn't find the Spotify save button."
        );

        return;

    }


    if (!spotifyAccessToken) {

        showError(
            "Connect your Spotify account first."
        );

        return;

    }


    const tracks =
        Array.from(
            playlistPreview.querySelectorAll(
                ".track"
            )
        );


    if (
        tracks.length === 0
    ) {

        showError(
            "Generate a playlist first before saving it to Spotify."
        );

        return;

    }


    const trackUris =
        tracks

            .map(
                track =>
                    track.dataset.uri
            )

            .filter(
                uri =>
                    uri &&
                    uri.startsWith(
                        "spotify:track:"
                    )
            );


    if (
        trackUris.length === 0
    ) {

        showError(
            "The generated playlist doesn't contain any valid Spotify tracks."
        );

        return;

    }


    const nameInput =
        document.querySelector(
            '.settings input[type="text"]'
        );


    const playlistName =
        nameInput &&
        nameInput.value.trim()
            ? nameInput.value.trim()
            : "GenPlaylist Mix";


    spotifyButton.disabled =
        true;


    spotifyButton.textContent =
        "Saving…";


    try {

        // -----------------------------------------
        // Step 1: Get current Spotify user
        // -----------------------------------------

        const currentUser =
            await spotifyFetch(
                "/me"
            );


        // -----------------------------------------
        // Step 2: Create playlist
        // -----------------------------------------

        const createdPlaylist =
            await createSpotifyPlaylist(
                currentUser.id,
                playlistName
            );


        // -----------------------------------------
        // Step 3: Add tracks
        // -----------------------------------------

        await addTracksToSpotifyPlaylist(
            createdPlaylist.id,
            trackUris
        );


        spotifyButton.textContent =
            "Saved to Spotify ✓";


        clearError();


        // -----------------------------------------
        // Open new playlist
        // -----------------------------------------

        if (
            createdPlaylist.external_urls &&
            createdPlaylist.external_urls.spotify
        ) {

            window.open(
                createdPlaylist.external_urls.spotify,
                "_blank",
                "noopener,noreferrer"
            );

        }


    } catch (err) {

        console.error(
            "[GenPlaylist Spotify save error]",
            err
        );


        spotifyButton.disabled =
            false;


        spotifyButton.textContent =
            "Save to Spotify";


        if (
            err.message ===
            "AUTH_EXPIRED"
        ) {

            handleAuthExpired();

            return;

        }


        if (
            err.message ===
            "FORBIDDEN"
        ) {

            showError(
                "Spotify denied permission to create playlists. Please reconnect Spotify and approve the playlist permissions."
            );

            return;

        }


        showError(
            "Couldn't save the generated playlist to Spotify. Please try again.",
            {
                retry:
                    savePlaylistToSpotify
            }
        );

    }

}


// =====================================================
// Create Spotify Playlist
// =====================================================

async function createSpotifyPlaylist(
    userId,
    playlistName
) {

    const body = {

        name:
            playlistName,

        public:
            false,

        collaborative:
            false,

        description:
            `Generated by GenPlaylist • ${selectedIntent}`

    };


    // Spotify creates the playlist for the
    // authenticated user, so userId isn't
    // required for this request.

    return spotifyFetch(
        "/me/playlists",
        {

            method:
                "POST",

            body:
                JSON.stringify(body)

        }
    );

}


// =====================================================
// Add Tracks to Spotify Playlist
// =====================================================

async function addTracksToSpotifyPlaylist(
    playlistId,
    trackUris
) {

    const CHUNK_SIZE =
        100;


    for (
        let i = 0;
        i < trackUris.length;
        i += CHUNK_SIZE
    ) {

        const chunk =
            trackUris.slice(
                i,
                i + CHUNK_SIZE
            );


        await spotifyFetch(
            `/playlists/${playlistId}/items`,
            {

                method:
                    "POST",

                body:
                    JSON.stringify({
                        uris: chunk
                    })

            }
        );

    }

}


// =====================================================
// Save to Spotify Button
// =====================================================
// Uses event delegation so the generated/result UI
// does not need to have its own listener setup.

document.addEventListener(
    "click",
    event => {

        if (
            !event.target.classList.contains(
                "spotify-btn"
            )
        ) {

            return;

        }


        if (
            event.target.innerText.trim() !==
            "Save to Spotify"
        ) {

            return;

        }


        savePlaylistToSpotify();

    }
);