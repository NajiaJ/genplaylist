// ==========================================
// GenPlaylist
// script.js
// Updated / cleaned version
// ==========================================


// =====================================================
// DOM ELEMENTS
// =====================================================

const loginButtons =
    document.querySelectorAll("#loginBtn, #heroLoginBtn");

const generateBtn =
    document.getElementById("generateBtn");

const dashboard =
    document.getElementById("dashboard");

const welcomeHero =
    document.getElementById("welcomeHero");

const loadingSection =
    document.getElementById("loading");

const resultSection =
    document.getElementById("result");

const playlistPreview =
    document.getElementById("playlistPreview");

const libraryList =
    document.getElementById("libraryList");

const songGrid =
    document.getElementById("songGrid");

const intentionButtons =
    document.querySelectorAll(".intent");

const errorBanner =
    document.getElementById("errorBanner");

const errorBannerText =
    document.getElementById("errorBannerText");

const errorBannerDismiss =
    document.getElementById("errorBannerDismiss");

const savePlaylistBtn =
    document.getElementById("savePlaylistBtn");

const historySaveBtn =
    document.getElementById("historySaveBtn");

const viewHistoryBtn =
    document.getElementById("viewHistoryBtn");

const closeHistoryBtn =
    document.getElementById("closeHistoryBtn");

const historyPanel =
    document.getElementById("historyPanel");

const historyList =
    document.getElementById("historyList");

const historyTrackView =
    document.getElementById("historyTrackView");

const historyTrackList =
    document.getElementById("historyTrackList");

const historyTrackViewTitle =
    document.getElementById("historyTrackViewTitle");

const backToHistoryListBtn =
    document.getElementById("backToHistoryListBtn");

const selectAllBtn =
    document.getElementById("selectAllPlaylists");

const deselectAllBtn =
    document.getElementById("deselectAllPlaylists");


// =====================================================
// PLAYLIST SETTINGS
// =====================================================

const songsModeBtn =
    document.getElementById("songsModeBtn");

const durationModeBtn =
    document.getElementById("durationModeBtn");

const songCountSetting =
    document.getElementById("songCountSetting");

const durationSetting =
    document.getElementById("durationSetting");

const songCount =
    document.getElementById("songCount");

const playlistDuration =
    document.getElementById("playlistDuration");

const playlistNameInput =
    document.getElementById("playlistName");


// =====================================================
// APPLICATION STATE
// =====================================================

let selectedIntent =
    "Current Favourites";

let spotifyAccessToken =
    null;

let spotifyUserId =
    null;

let playlistSizeMode =
    "songs";


// =====================================================
// SPOTIFY CONFIGURATION
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


// =====================================================
// SUPABASE
// =====================================================

const SUPABASE_URL =
    "https://nyxawdoedmqtmtoihsmx.supabase.co";

const SUPABASE_ANON_KEY =
    "sb_publishable_vNeLmLSYzA2tgZ3Wz_vX3A_JM5rG_Z3";

let supabaseClient =
    null;


// =====================================================
// ERROR HANDLING
// =====================================================

function showError(message, options = {}) {

    console.error(
        "[GenPlaylist]",
        message
    );

    if (!errorBanner || !errorBannerText) {

        console.error(message);

        return;

    }

    errorBannerText.textContent =
        message;

    errorBanner.classList.remove(
        "hidden"
    );

    const existingRetry =
        errorBanner.querySelector(
            ".retry-btn"
        );

    if (existingRetry) {
        existingRetry.remove();
    }

    if (
        typeof options.retry ===
        "function"
    ) {

        const retryButton =
            document.createElement("button");

        retryButton.className =
            "retry-btn";

        retryButton.type =
            "button";

        retryButton.textContent =
            "Retry";

        retryButton.addEventListener(
            "click",
            () => {

                clearError();

                options.retry();

            }
        );

        if (errorBannerDismiss) {

            errorBanner.insertBefore(
                retryButton,
                errorBannerDismiss
            );

        } else {

            errorBanner.appendChild(
                retryButton
            );

        }

    }

}


function clearError() {

    if (!errorBanner) {
        return;
    }

    errorBanner.classList.add(
        "hidden"
    );

    if (errorBannerText) {

        errorBannerText.textContent =
            "";

    }

    const existingRetry =
        errorBanner.querySelector(
            ".retry-btn"
        );

    if (existingRetry) {
        existingRetry.remove();
    }

}


errorBannerDismiss?.addEventListener(
    "click",
    clearError
);


// =====================================================
// GLOBAL ERROR HANDLING
// =====================================================

window.addEventListener(
    "error",
    event => {

        console.error(
            "[GenPlaylist JS error]",
            event.error || event.message
        );

        // Ignore image/resource failures.
        if (
            event.target &&
            event.target !== window
        ) {

            return;

        }

        showError(
            "Something unexpected went wrong. Please refresh and try again."
        );

    }
);


window.addEventListener(
    "unhandledrejection",
    event => {

        console.error(
            "[GenPlaylist Promise error]",
            event.reason
        );

        showError(
            "Something unexpected went wrong. Please refresh and try again."
        );

    }
);


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


// =====================================================
// SMALL HELPERS
// =====================================================

function sleep(ms) {

    return new Promise(
        resolve =>
            setTimeout(
                resolve,
                ms
            )
    );

}


function escapeHtml(value) {

    const div =
        document.createElement("div");

    div.textContent =
        value == null
            ? ""
            : String(value);

    return div.innerHTML;

}


function getSmallestImage(album) {

    if (
        !album ||
        !Array.isArray(album.images) ||
        album.images.length === 0
    ) {

        return null;

    }

    return (
        album.images[
            album.images.length - 1
        ]?.url || null
    );

}


// =====================================================
// YOUTUBE NORMALIZATION
// =====================================================
// Everything downstream (scorePool, weightForIntent,
// assemblePlaylist, weightedSampleWithoutReplacement,
// renderLibraries, renderTopSongs, createTrackElement) was
// written against Spotify-shaped objects. Rather than duplicate
// all of that logic for YouTube, these functions translate raw
// YouTube API responses into that same shape once, up front —
// so all the shared code below works completely unchanged for
// either platform.

// Parses YouTube's ISO 8601 duration ("PT4M13S") into
// milliseconds, since YouTube doesn't return a plain integer
// like Spotify's duration_ms.
function parseIso8601DurationToMs(duration) {

    if (!duration) {
        return 0;
    }

    const match =
        duration.match(
            /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/
        );

    if (!match) {
        return 0;
    }

    const hours = parseInt(match[1] || "0", 10);
    const minutes = parseInt(match[2] || "0", 10);
    const seconds = parseInt(match[3] || "0", 10);

    return (
        (hours * 3600 + minutes * 60 + seconds) * 1000
    );

}


// YouTube's thumbnails come back as an object keyed by size
// name, not an array. Ordered largest-to-smallest here so
// getSmallestImage's `images[length - 1]` convention still
// picks the smallest one, same as it does for Spotify.
function youtubeThumbnailsToImages(thumbnails) {

    if (!thumbnails) {
        return [];
    }

    const order = ["maxres", "standard", "high", "medium", "default"];

    return order
        .map(key => thumbnails[key])
        .filter(Boolean)
        .map(thumb => ({ url: thumb.url }));

}


// A YouTube playlist (from playlists.list) into the same shape
// renderLibraries already expects from Spotify.
function normalizeYoutubePlaylist(playlist) {

    return {

        id: playlist.id,
        name: playlist.snippet?.title || "Untitled",

        tracks: {
            total: playlist.contentDetails?.itemCount ?? 0
        }

    };

}


// A single YouTube video (merged from a playlistItem + its own
// videos.list details, since duration only comes from the
// latter) into the same shape scorePool/renderTopSongs/
// createTrackElement already expect from Spotify.
function normalizeYoutubeTrack(item, videoDetails) {

    const videoId =
        item.contentDetails?.videoId ||
        item.snippet?.resourceId?.videoId ||
        item.id;

    if (!videoId) {
        return null;
    }

    return {

        id: videoId,
        name: item.snippet?.title || "Untitled",

        artists: [
            { name: item.snippet?.videoOwnerChannelTitle || item.snippet?.channelTitle || "Unknown" }
        ],

        album: {
            images: youtubeThumbnailsToImages(item.snippet?.thumbnails)
        },

        // Deliberately reusing the `external_urls.spotify` key
        // name that scorePool already reads — not a Spotify URL,
        // a YouTube watch URL. Keeps scorePool untouched rather
        // than forking it per-platform for one field.
        external_urls: {
            spotify: `https://music.youtube.com/watch?v=${videoId}`
        },

        uri: videoId,

        duration_ms: parseIso8601DurationToMs(videoDetails?.contentDetails?.duration),

        added_at: item.snippet?.publishedAt || null

    };

}



// =====================================================
// DASHBOARD
// =====================================================

function showDashboard() {

    welcomeHero?.classList.add(
        "hidden"
    );

    dashboard?.classList.remove(
        "hidden"
    );

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


function hideDashboard() {

    dashboard?.classList.add(
        "hidden"
    );

    welcomeHero?.classList.remove(
        "hidden"
    );

}


// =====================================================
// PKCE
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


async function createPkceChallenge() {

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

    const challenge =
        base64UrlEncode(
            digest
        );

    return {
        verifier,
        challenge
    };

}


// =====================================================
// SPOTIFY LOGIN
// =====================================================

async function redirectToSpotifyLogin() {

    try {

        const {
            verifier,
            challenge
        } =
            await createPkceChallenge();

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

    } catch (error) {

        console.error(
            "[Spotify login]",
            error
        );

        showError(
            "Couldn't start Spotify login. Please try again.",
            {
                retry:
                    redirectToSpotifyLogin
            }
        );

    }

}


// =====================================================
// EXCHANGE CODE FOR TOKEN
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

            code,

            redirect_uri:
                REDIRECT_URI,

            code_verifier:
                verifier

        });

    let response;

    try {

        response =
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

    } catch (error) {

        throw new Error(
            "NETWORK_ERROR"
        );

    }

    if (!response.ok) {

        let detail = "";

        try {

            const json =
                await response.json();

            detail =
                json.error_description ||
                json.error ||
                "";

        } catch (_) {}

        throw new Error(
            detail
                ? `TOKEN_EXCHANGE_FAILED: ${detail}`
                : "TOKEN_EXCHANGE_FAILED"
        );

    }

    const data =
        await response.json();

    spotifyAccessToken =
        data.access_token;

    sessionStorage.removeItem(
        "spotify_pkce_verifier"
    );

}


// =====================================================
// SPOTIFY API
// =====================================================

async function spotifyFetch(
    path,
    options = {},
    attempt = 1
) {

    if (!spotifyAccessToken) {

        throw new Error(
            "AUTH_EXPIRED"
        );

    }

    let response;

    try {

        response =
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

    } catch (error) {

        if (attempt < 3) {

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

    if (
        response.status === 429 &&
        attempt < 4
    ) {

        const retryAfter =
            parseInt(
                response.headers.get(
                    "Retry-After"
                ) || "1",
                10
            );

        await sleep(
            Math.min(
                retryAfter * 1000,
                10000
            )
        );

        return spotifyFetch(
            path,
            options,
            attempt + 1
        );

    }

    if (
        response.status >= 500 &&
        attempt < 3
    ) {

        await sleep(
            500 * attempt
        );

        return spotifyFetch(
            path,
            options,
            attempt + 1
        );

    }

    if (response.status === 401) {

        throw new Error(
            "AUTH_EXPIRED"
        );

    }

    if (response.status === 403) {

        throw new Error(
            "FORBIDDEN"
        );

    }

    if (response.status === 404) {

        throw new Error(
            "NOT_FOUND"
        );

    }

    if (!response.ok) {

        throw new Error(
            `SPOTIFY_ERROR_${response.status}`
        );

    }

    if (response.status === 204) {

        return null;

    }

    return response.json();

}


// =====================================================
// SPOTIFY PAGINATION
// =====================================================

async function spotifyFetchAllPages(
    initialPath
) {

    const items = [];

    let nextPath =
        initialPath;

    while (nextPath) {

        const response =
            await spotifyFetch(
                nextPath
            );

        if (
            Array.isArray(
                response?.items
            )
        ) {

            items.push(
                ...response.items
            );

        }

        if (response?.next) {

            nextPath =
                response.next.replace(
                    "https://api.spotify.com/v1",
                    ""
                );

        } else {

            nextPath =
                null;

        }

    }

    return items;

}


// =====================================================
// FRIENDLY ERRORS
// =====================================================

function friendlyMessageFor(error) {

    switch (error?.message) {

        case "NETWORK_ERROR":

            return "Couldn't reach Spotify. Check your internet connection and try again.";

        case "AUTH_EXPIRED":

            return "Your Spotify session expired. Please reconnect.";

        case "FORBIDDEN":

            return "Spotify denied that request. Please reconnect and make sure the required permissions are approved.";

        case "NOT_FOUND":

            return "Spotify couldn't find that resource.";

        case "MISSING_VERIFIER":

            return "The Spotify login session was lost. Please reconnect.";

        case "EMPTY_POOL":

            return "Couldn't find any tracks in your selected libraries.";

        case "SUPABASE_LIBRARY_MISSING":

            return "Supabase isn't loaded. Add the Supabase JavaScript library to your HTML.";

        default:

            return "Something went wrong while communicating with Spotify.";

    }

}


// =====================================================
// LOGIN BUTTON STATE
// =====================================================

// Applies the active-platform accent theme to <body>, based on
// whichever platform was most recently connected — not just
// "is YouTube connected," so switching back to Spotify while
// YouTube is still connected correctly re-themes to green.
let lastConnectedPlatform = null;

function applyPlatformTheme() {

    if (lastConnectedPlatform === "youtube") {
        document.body.classList.add("theme-youtube");
        return;
    }

    document.body.classList.remove("theme-youtube");
}


function setSpotifyConnectedState() {

    loginButtons.forEach(
        button => {

            button.textContent =
                "Spotify Log Out";

            button.disabled =
                false;

            button.classList.add(
                "logout-state"
            );

        }
    );

    applyPlatformTheme();

}


function setSpotifyDisconnectedState() {

    loginButtons.forEach(
        button => {

            button.textContent =
                "Connect to Spotify";

            button.disabled =
                false;

            button.classList.remove(
                "logout-state"
            );

        }
    );

    applyPlatformTheme();

}


// =====================================================
// LOGOUT
// =====================================================

function logoutFromGenPlaylist() {

    // Immediately disconnect Spotify
    spotifyAccessToken = null;
    spotifyUserId = null;

    sessionStorage.removeItem(
        "spotify_pkce_verifier"
    );
    
    // Also log out of the Spotify browser session.
    window.open(
        "https://accounts.spotify.com/logout",
        "_blank",
        "noopener,noreferrer"
    );

    // Immediately update Spotify buttons
    setSpotifyDisconnectedState();


    // ------------------------------------------
    // YouTube is still connected
    // ------------------------------------------

    if (youtubeAccessToken) {

        // Switch to YouTube properly.
        setActiveLibrarySource("youtube");

        updateLibrarySourceBar();
        updateHistoryPlatformTabs();

        showDashboard();

        clearError();

        return;
    }


    // ------------------------------------------
    // Neither platform is connected
    // ------------------------------------------

    activeLibrarySource = "spotify";

    lastConnectedPlatform = null;

    applyPlatformTheme();

    updateLibrarySourceBar();
    updateHistoryPlatformTabs();

    hideDashboard();

    // Show the landing page.
    welcomeHero?.classList.remove(
        "hidden"
    );

    if (libraryList) {
        libraryList.innerHTML =
            `
            <p class="placeholder-text">
                Connect to Spotify or YouTube Music
                to see your playlists here.
            </p>
            `;
    }

    if (songGrid) {
        songGrid.innerHTML =
            `
            <p class="placeholder-text">
                Connect to Spotify or YouTube Music
                to see your top songs here.
            </p>
            `;
    }

    if (playlistPreview) {
        playlistPreview.innerHTML = "";
    }

    loadingSection?.classList.add(
        "hidden"
    );

    resultSection?.classList.add(
        "hidden"
    );

    clearError();

}


// =====================================================
// LOGIN BUTTONS
// =====================================================

loginButtons.forEach(
    button => {

        button.addEventListener(
            "click",
            () => {

                if (spotifyAccessToken) {

                    logoutFromGenPlaylist();

                } else {

                    redirectToSpotifyLogin();

                }

            }
        );

    }
);


// =====================================================
// SPOTIFY AUTH INITIALISATION
// =====================================================

async function initialiseSpotifyAuth() {

    const params =
        new URLSearchParams(
            window.location.search
        );

    const code =
        params.get("code");

    const authError =
        params.get("error");

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

    if (!code) {

        hideDashboard();

        return;

    }

    window.history.replaceState(
        {},
        "",
        window.location.pathname
    );

    try {

        await exchangeCodeForToken(
            code
        );

        lastConnectedPlatform = "spotify";

        setSpotifyConnectedState();

        showDashboard();

        clearError();

        try {
            const me = await spotifyFetch("/me");
            spotifyUserId = me.id;
        } catch (idError) {
            // Non-fatal — the rest of the app still works without
            // this; only "Save Playlist" and "View Playlist
            // History" need it, and each handles it missing.
            spotifyUserId = null;
        }

        updateLibrarySourceBar();
        updateHistoryPlatformTabs();
        await setActiveLibrarySource("spotify");

    } catch (error) {

        console.error(
            "[Spotify authentication]",
            error
        );

        spotifyAccessToken =
            null;

        setSpotifyDisconnectedState();

        hideDashboard();

        showError(
            friendlyMessageFor(error),
            {
                retry:
                    redirectToSpotifyLogin
            }
        );

    }

}


// =====================================================
// LOAD SPOTIFY DATA
// =====================================================

async function loadLibrariesAndAnchors() {

    if (libraryList) {

        libraryList.innerHTML =
            `
            <p class="placeholder-text">
                Loading your playlists…
            </p>
            `;

    }

    if (songGrid) {

        songGrid.innerHTML =
            `
            <p class="placeholder-text">
                Loading your top songs…
            </p>
            `;

    }

    try {

        const [
            playlists,
            liked
        ] =
            await Promise.all([

                spotifyFetchAllPages(
                    "/me/playlists?limit=50"
                ),

                spotifyFetch(
                    "/me/tracks?limit=1"
                )

            ]);

        renderLibraries(
            playlists,
            liked?.total || 0
        );

    } catch (error) {

        if (
            error.message ===
            "AUTH_EXPIRED"
        ) {

            handleAuthExpired();

            return;

        }

        if (libraryList) {

            libraryList.innerHTML =
                `
                <p class="placeholder-text">
                    Couldn't load your playlists.
                </p>
                `;

        }

        showError(
            friendlyMessageFor(error),
            {
                retry:
                    loadLibrariesAndAnchors
            }
        );

        return;

    }

    try {

        const topTracks =
            await spotifyFetch(
                "/me/top/tracks?time_range=short_term&limit=8"
            );

        renderTopSongs(
            topTracks?.items || []
        );

    } catch (error) {

        console.error(
            "[Top tracks]",
            error
        );

        if (songGrid) {

            songGrid.innerHTML =
                `
                <p class="placeholder-text">
                    No top songs are available yet.
                </p>
                `;

        }

    }

}


// =====================================================
// RENDER LIBRARIES
// =====================================================

function renderLibraries(
    playlists,
    likedCount
) {

    if (!libraryList) {
        return;
    }

    libraryList.innerHTML =
        "";

    const likedLabel =
        document.createElement("label");

    likedLabel.className =
        "library-item";

    likedLabel.innerHTML =
        `
        <input
            type="checkbox"
            data-id="liked"
            data-count="${likedCount}"
        >

        Liked Songs (${likedCount})
        `;

    libraryList.appendChild(
        likedLabel
    );

    playlists.forEach(
        playlist => {

            const label =
                document.createElement("label");

            label.className =
                "library-item";

            const count =
                playlist.tracks?.total ??
                playlist.items?.total ??
                "?";

            label.innerHTML =
                `
                <input
                    type="checkbox"
                    data-id="${escapeHtml(playlist.id)}"
                    data-count="${escapeHtml(count)}"
                >

                ${escapeHtml(playlist.name)}
                (${escapeHtml(count)})
                `;

            libraryList.appendChild(
                label
            );

        }
    );

}


// =====================================================
// RENDER TOP SONGS
// =====================================================

function renderTopSongs(tracks) {

    if (!songGrid) {
        return;
    }

    songGrid.innerHTML =
        "";

    if (
        !Array.isArray(tracks) ||
        tracks.length === 0
    ) {

        songGrid.innerHTML =
            `
            <p class="placeholder-text">
                No top songs available yet.
            </p>
            `;

        return;

    }

    tracks.forEach(
        track => {

            const label =
                document.createElement("label");

            label.className =
                "song-card";

            const image =
                getSmallestImage(
                    track.album
                ) || "";

            const artist =
                (track.artists || [])
                    .map(
                        artist =>
                            artist.name
                    )
                    .join(", ");

            label.innerHTML =
                `
                <input
                    type="checkbox"
                    data-id="${escapeHtml(track.id)}"
                    data-uri="${escapeHtml(track.uri || "")}"
                    data-title="${escapeHtml(track.name)}"
                    data-artist="${escapeHtml(artist)}"
                    data-image="${escapeHtml(image)}"
                    data-duration="${track.duration_ms || 0}"
                >

                ${escapeHtml(track.name)}
                — ${escapeHtml(artist)}
                `;

            songGrid.appendChild(
                label
            );

        }
    );

}


// =====================================================
// SELECT ALL / DESELECT ALL
// =====================================================

function setAllLibraries(
    checked
) {

    if (!libraryList) {
        return;
    }

    const checkboxes =
        libraryList.querySelectorAll(
            'input[type="checkbox"]'
        );

    checkboxes.forEach(
        checkbox => {

            checkbox.checked =
                checked;

        }
    );

}


selectAllBtn?.addEventListener(
    "click",
    () =>
        setAllLibraries(true)
);


deselectAllBtn?.addEventListener(
    "click",
    () =>
        setAllLibraries(false)
);


// =====================================================
// PLAYLIST SIZE TOGGLE
// =====================================================
//
// Supports:
//
// Songs mode
// Duration mode
//
// Expected HTML IDs:
//
// #songsModeBtn
// #durationModeBtn
// #songCountSetting
// #durationSetting
// #songCount
// #playlistDuration
//
// =====================================================

function updatePlaylistSizeMode() {

    const songsMode =
        playlistSizeMode === "songs";

    // -----------------------------------------
    // BUTTON STATES
    // -----------------------------------------

    songsModeBtn?.classList.toggle(
        "active",
        songsMode
    );

    durationModeBtn?.classList.toggle(
        "active",
        !songsMode
    );


    // -----------------------------------------
    // SETTINGS VISIBILITY
    // -----------------------------------------

    if (songsMode) {

        songCountSetting?.classList.remove(
            "hidden"
        );

        durationSetting?.classList.add(
            "hidden"
        );

        if (songCountSetting) {
            songCountSetting.style.display =
                "flex";
        }

        if (durationSetting) {
            durationSetting.style.display =
                "none";
        }

    } else {

        songCountSetting?.classList.add(
            "hidden"
        );

        durationSetting?.classList.remove(
            "hidden"
        );

        if (songCountSetting) {
            songCountSetting.style.display =
                "none";
        }

        if (durationSetting) {
            durationSetting.style.display =
                "flex";
        }

    }

}


// =====================================================
// SONGS MODE TOGGLE
// =====================================================

songsModeBtn?.addEventListener(
    "click",
    event => {

        event.preventDefault();

        playlistSizeMode =
            "songs";

        updatePlaylistSizeMode();

    }
);


// =====================================================
// DURATION MODE TOGGLE
// =====================================================

durationModeBtn?.addEventListener(
    "click",
    event => {

        event.preventDefault();

        playlistSizeMode =
            "duration";

        updatePlaylistSizeMode();

    }
);


// =====================================================
// GET TARGET SETTINGS
// =====================================================

function getTargetSongCount() {

    if (
        playlistSizeMode ===
        "songs"
    ) {

        const count =
            parseInt(
                songCount?.value || "50",
                10
            );

        return Math.min(
            Math.max(
                Number.isFinite(count)
                    ? count
                    : 50,
                1
            ),
            100
        );

    }


    // Duration mode uses an approximate
    // 3-minute average only as a fallback.
    const minutes =
        parseInt(
            playlistDuration?.value || "45",
            10
        );

    const safeMinutes =
        Number.isFinite(minutes)
            ? minutes
            : 45;

    const estimatedSongs =
        Math.round(
            safeMinutes / 3
        );

    return Math.min(
        Math.max(
            estimatedSongs,
            1
        ),
        100
    );

}


function getTargetDurationMs() {

    if (
        playlistSizeMode !==
        "duration"
    ) {

        return null;

    }

    const minutes =
        parseInt(
            playlistDuration?.value || "45",
            10
        );

    const safeMinutes =
        Number.isFinite(minutes)
            ? minutes
            : 45;

    return Math.min(
        Math.max(
            safeMinutes,
            1
        ),
        300
    ) * 60 * 1000;

}


// =====================================================
// INTENTION BUTTONS
// =====================================================

intentionButtons.forEach(
    button => {

        button.addEventListener(
            "click",
            () => {

                intentionButtons.forEach(
                    otherButton => {

                        otherButton.classList.remove(
                            "selected"
                        );

                    }
                );

                button.classList.add(
                    "selected"
                );

                selectedIntent =
                    button.dataset.intent ||
                    button.innerText.trim();

            }
        );

    }
);


// =====================================================
// GENERATE BUTTON
// =====================================================

generateBtn?.addEventListener(
    "click",
    generatePlaylist
);


// =====================================================
// GENERATE PLAYLIST
// =====================================================

async function generatePlaylist() {

    const activeToken =
        activeLibrarySource === "youtube" ? youtubeAccessToken : spotifyAccessToken;

    if (!activeToken) {

        showError(
            `Connect your ${activeLibrarySource === "youtube" ? "YouTube Music" : "Spotify"} account first.`
        );

        return;

    }

    if (!libraryList) {

        showError(
            "Your libraries aren't available yet."
        );

        return;

    }


    // -----------------------------------------
    // SELECTED LIBRARIES
    // -----------------------------------------

    const selectedLibraries =
        Array.from(
            libraryList.querySelectorAll(
                'input[type="checkbox"]:checked'
            )
        ).map(
            checkbox => ({

                id:
                    checkbox.dataset.id,

                isLiked:
                    checkbox.dataset.id ===
                    "liked"

            })
        );


    if (
        selectedLibraries.length === 0
    ) {

        showError(
            "Select at least one library before generating."
        );

        return;

    }


    // -----------------------------------------
    // ANCHOR TRACKS
    // -----------------------------------------

    const anchorTracks =
        songGrid
            ? Array.from(
                songGrid.querySelectorAll(
                    'input[type="checkbox"]:checked'
                )
            ).map(
                checkbox => ({

                    id:
                        checkbox.dataset.id,

                    uri:
                        checkbox.dataset.uri,

                    title:
                        checkbox.dataset.title,

                    artist:
                        checkbox.dataset.artist,

                    image:
                        checkbox.dataset.image ||
                        null,

                    duration_ms:
                        parseInt(
                            checkbox.dataset.duration ||
                            "0",
                            10
                        )

                })
            )
            : [];


    // -----------------------------------------
    // TARGET SIZE
    // -----------------------------------------

    const targetSize =
        getTargetSongCount();

    const targetDurationMs =
        getTargetDurationMs();


    // -----------------------------------------
    // LOADING
    // -----------------------------------------

    loadingSection?.classList.remove(
        "hidden"
    );

    resultSection?.classList.add(
        "hidden"
    );

    clearError();


    try {

        // -----------------------------------------
        // BUILD POOL
        // -----------------------------------------

        const pool =
            activeLibrarySource === "youtube"
                ? await buildYoutubeTrackPool(selectedLibraries)
                : await buildTrackPool(selectedLibraries);


        if (
            pool.length === 0
        ) {

            throw new Error(
                "EMPTY_POOL"
            );

        }


        // -----------------------------------------
        // LISTENING SIGNALS
        // -----------------------------------------
        // YouTube has no top-tracks/recently-played equivalent,
        // so it always runs through the added_at fallback that
        // Spotify only falls back to when its own signals fail.

        const signals =
            activeLibrarySource === "youtube"
                ? computeAddedAtSignals(pool)
                : await fetchSignalsWithFallback(pool);


        // -----------------------------------------
        // SCORE
        // -----------------------------------------

        const scored =
            scorePool(
                pool,
                signals
            );


        // -----------------------------------------
        // ASSEMBLE
        // -----------------------------------------

        const playlist =
            assemblePlaylist(
                scored,
                anchorTracks,
                selectedIntent,
                targetSize,
                targetDurationMs
            );


        if (
            playlist.length === 0
        ) {

            throw new Error(
                "EMPTY_POOL"
            );

        }


        // -----------------------------------------
        // RENDER
        // -----------------------------------------

        renderPlaylist(
            playlist
        );


        // A previous save (if any) left the button disabled with
        // "Saved ✓" text — a fresh playlist needs it clickable
        // again, labeled for whichever platform is active now.
        if (savePlaylistBtn) {
            savePlaylistBtn.disabled = false;
        }

        updateSaveButtonLabel();


        loadingSection?.classList.add(
            "hidden"
        );

        resultSection?.classList.remove(
            "hidden"
        );

        resultSection?.scrollIntoView({
            behavior: "smooth"
        });

    } catch (error) {

        console.error(
            "[GenPlaylist generation error]",
            error
        );

        loadingSection?.classList.add(
            "hidden"
        );


        if (
            error.message === "AUTH_EXPIRED" ||
            error.message === "YOUTUBE_AUTH_EXPIRED"
        ) {

            if (error.message === "YOUTUBE_AUTH_EXPIRED") {
                youtubeAccessToken = null;
                setYoutubeDisconnectedState();
                showError(
                    "Your YouTube session expired. Please reconnect.",
                    { retry: () => connectYoutube() }
                );
                return;
            }

            handleAuthExpired();

            return;

        }


        if (
            error.message ===
            "EMPTY_POOL"
        ) {

            showError(
                "Couldn't find any tracks in your selected libraries."
            );

            return;

        }


        showError(
            activeLibrarySource === "youtube"
                ? friendlyYoutubeMessageFor(error)
                : friendlyMessageFor(error),
            {
                retry:
                    generatePlaylist
            }
        );

    }

}


// =====================================================
// BUILD TRACK POOL
// =====================================================

async function buildTrackPool(
    selectedLibraries
) {

    const requests =
        selectedLibraries.map(
            source => {

                if (
                    source.isLiked
                ) {

                    return spotifyFetchAllPages(
                        "/me/tracks?limit=50"
                    );

                }

                return spotifyFetchAllPages(
                    `/playlists/${encodeURIComponent(source.id)}/items?limit=100`
                );

            }
        );


    const results =
        await Promise.allSettled(
            requests
        );


    const tracksById =
        new Map();


    results.forEach(
        result => {

            if (
                result.status !==
                "fulfilled"
            ) {

                return;

            }

            result.value.forEach(
                entry => {

                    const track =
                        entry?.item ||
                        entry?.track ||
                        entry;

                    if (
                        !track ||
                        !track.id
                    ) {

                        return;

                    }

                    if (
                        track.is_local
                    ) {

                        return;

                    }

                    if (
                        !tracksById.has(
                            track.id
                        )
                    ) {

                        tracksById.set(
                            track.id,
                            {

                                ...track,

                                added_at:
                                    entry?.added_at ||
                                    null

                            }
                        );

                    }

                }
            );

        }
    );


    return Array.from(
        tracksById.values()
    );

}


// =====================================================
// LISTENING SIGNALS
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
        shortResult,
        mediumResult,
        longResult,
        recentResult
    ] =
        results;


    const shortIds =
        new Set(
            shortResult.status ===
            "fulfilled"

                ? (
                    shortResult.value.items ||
                    []
                ).map(
                    track =>
                        track.id
                )

                : []
        );


    const mediumIds =
        new Set(
            mediumResult.status ===
            "fulfilled"

                ? (
                    mediumResult.value.items ||
                    []
                ).map(
                    track =>
                        track.id
                )

                : []
        );


    const longIds =
        new Set(
            longResult.status ===
            "fulfilled"

                ? (
                    longResult.value.items ||
                    []
                ).map(
                    track =>
                        track.id
                )

                : []
        );


    const recentIds =
        new Set(
            recentResult.status ===
            "fulfilled"

                ? (
                    recentResult.value.items ||
                    []
                )
                    .map(
                        item =>
                            item.track?.id
                    )
                    .filter(Boolean)

                : []
        );


    const hasSignals =
        shortIds.size > 0 ||
        mediumIds.size > 0 ||
        longIds.size > 0 ||
        recentIds.size > 0;


    if (hasSignals) {

        return {

            mode:
                "api",

            shortIds,
            mediumIds,
            longIds,
            recentIds

        };

    }


    // -----------------------------------------
    // FALLBACK: ADDED DATE
    // -----------------------------------------

    return computeAddedAtSignals(pool);

}


// Shared by both Spotify's fallback path (when top-tracks/
// recently-played are unavailable) and YouTube's primary path
// (which has no listening-history equivalent at all) — derives
// recency/dormancy purely from each track's added_at date.
function computeAddedAtSignals(pool) {

    const dated =
        pool
            .filter(
                track =>
                    track.added_at
            )
            .map(
                track => ({

                    id:
                        track.id,

                    addedAt:
                        new Date(
                            track.added_at
                        ).getTime()

                })
            )
            .filter(
                item =>
                    Number.isFinite(
                        item.addedAt
                    )
            );


    if (
        dated.length === 0
    ) {

        return {
            mode:
                "none"
        };

    }


    const times =
        dated.map(
            item =>
                item.addedAt
        );


    const newest =
        Math.max(
            ...times
        );

    const oldest =
        Math.min(
            ...times
        );


    return {

        mode:
            "added_at",

        withDates:
            dated,

        newest,

        oldest

    };

}


// =====================================================
// SCORE TRACKS
// =====================================================

function scorePool(
    pool,
    signals
) {

    return pool.map(
        track => {

            let recency =
                0;

            let dormancy =
                0;


            if (
                signals.mode ===
                "api"
            ) {

                const isRecent =
                    signals.shortIds.has(
                        track.id
                    ) ||
                    signals.recentIds.has(
                        track.id
                    );


                const wasFavourite =
                    signals.longIds.has(
                        track.id
                    ) ||
                    signals.mediumIds.has(
                        track.id
                    );


                recency =
                    isRecent
                        ? 1
                        : 0;


                dormancy =
                    wasFavourite &&
                    !isRecent
                        ? 1
                        : 0;

            }


            else if (
                signals.mode ===
                "added_at" &&
                track.added_at
            ) {

                const addedAt =
                    new Date(
                        track.added_at
                    ).getTime();


                const span =
                    signals.newest -
                    signals.oldest ||
                    1;


                recency =
                    (
                        addedAt -
                        signals.oldest
                    ) / span;


                dormancy =
                    1 -
                    recency;

            }


            const baseline =
                (
                    recency === 0 &&
                    dormancy === 0
                )
                    ? 0.15
                    : 0;


            const artist =
                (track.artists || [])
                    .map(
                        artist =>
                            artist.name
                    )
                    .join(", ");


            return {

                id:
                    track.id,

                title:
                    track.name,

                artist,

                image:
                    getSmallestImage(
                        track.album
                    ),

                url:
                    track.external_urls?.spotify ||
                    `https://open.spotify.com/track/${track.id}`,

                uri:
                    track.uri,

                duration_ms:
                    track.duration_ms ||
                    0,

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

        }
    );

}


// =====================================================
// INTENT WEIGHTING
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
// ASSEMBLE PLAYLIST
// =====================================================

function assemblePlaylist(
    scored,
    anchorTracks,
    intent,
    targetSize,
    targetDurationMs = null
) {

    const anchorIds =
        new Set(
            anchorTracks.map(
                anchor =>
                    anchor.id
            )
        );


    const anchors =
        scored.filter(
            track =>
                anchorIds.has(
                    track.id
                )
        );


    const missingAnchors =
        anchorTracks
            .filter(
                anchor =>
                    !scored.some(
                        track =>
                            track.id ===
                            anchor.id
                    )
            )
            .map(
                anchor => ({

                    id:
                        anchor.id,

                    title:
                        anchor.title,

                    artist:
                        anchor.artist,

                    image:
                        anchor.image,

                    url:
                        `https://open.spotify.com/track/${anchor.id}`,

                    uri:
                        anchor.uri,

                    duration_ms:
                        anchor.duration_ms ||
                        0,

                    tag:
                        "anchor"

                })
            );


    const allAnchors = [

        ...anchors,

        ...missingAnchors

    ];


    // =================================================
    // SONG COUNT MODE
    // =================================================

    if (
        !targetDurationMs
    ) {

        const selectedAnchors =
            allAnchors.slice(
                0,
                targetSize
            );


        const selectedAnchorIds =
            new Set(
                selectedAnchors.map(
                    track =>
                        track.id
                )
            );


        const remainingPool =
            scored.filter(
                track =>
                    !selectedAnchorIds.has(
                        track.id
                    )
            );


        const remainingSlots =
            Math.max(
                targetSize -
                selectedAnchors.length,
                0
            );


        const selectedRest =
            weightedSampleWithoutReplacement(
                remainingPool,
                track =>
                    weightForIntent(
                        track,
                        intent
                    ),
                remainingSlots
            );


        return shuffle([

            ...selectedAnchors,

            ...selectedRest

        ]);

    }


    // =================================================
    // DURATION MODE
    // =================================================

    return assembleDurationPlaylist(
        scored,
        allAnchors,
        intent,
        targetDurationMs
    );

}


// =====================================================
// DURATION PLAYLIST ASSEMBLY
// =====================================================

function assembleDurationPlaylist(
    scored,
    anchors,
    intent,
    targetDurationMs
) {

    const selected = [];

    const selectedIds =
        new Set();

    let totalDuration =
        0;


    // -----------------------------------------
    // Add anchors first
    // -----------------------------------------

    for (
        const anchor of anchors
    ) {

        if (
            selectedIds.has(
                anchor.id
            )
        ) {

            continue;

        }

        if (
            selected.length >= 100
        ) {

            break;

        }

        // Don't allow anchors to make the
        // playlist wildly larger than requested.
        if (
            totalDuration +
            (anchor.duration_ms || 0) >
            targetDurationMs * 1.15 &&
            selected.length > 0
        ) {

            continue;

        }

        selected.push(
            anchor
        );

        selectedIds.add(
            anchor.id
        );

        totalDuration +=
            anchor.duration_ms || 0;

    }


    // -----------------------------------------
    // Remaining tracks
    // -----------------------------------------

    const remainingPool =
        scored.filter(
            track =>
                !selectedIds.has(
                    track.id
                )
        );


    const weighted =
        remainingPool.map(
            track => ({

                track,

                weight:
                    Math.max(
                        weightForIntent(
                            track,
                            intent
                        ),
                        0.001
                    )

            })
        );


    const artistCounts =
        new Map();


    selected.forEach(
        track => {

            const artist =
                track.artist || "";

            artistCounts.set(
                artist,
                (
                    artistCounts.get(
                        artist
                    ) || 0
                ) + 1
            );

        }
    );


    const ARTIST_CAP =
        3;


    while (
        weighted.length > 0 &&
        selected.length < 100 &&
        totalDuration <
            targetDurationMs
    ) {

        const totalWeight =
            weighted.reduce(
                (sum, item) =>
                    sum + item.weight,
                0
            );


        let random =
            Math.random() *
            totalWeight;


        let selectedIndex =
            weighted.length - 1;


        for (
            let i = 0;
            i < weighted.length;
            i++
        ) {

            random -=
                weighted[i].weight;

            if (
                random <= 0
            ) {

                selectedIndex =
                    i;

                break;

            }

        }


        const candidate =
            weighted[
                selectedIndex
            ].track;


        weighted.splice(
            selectedIndex,
            1
        );


        const artistCount =
            artistCounts.get(
                candidate.artist
            ) || 0;


        if (
            artistCount >= ARTIST_CAP
        ) {

            continue;

        }


        const duration =
            candidate.duration_ms ||
            0;


        // If adding this track would exceed
        // the target, keep looking for a track
        // that fits.
        if (
            totalDuration +
            duration >
            targetDurationMs
        ) {

            continue;

        }


        selected.push(
            candidate
        );

        selectedIds.add(
            candidate.id
        );

        artistCounts.set(
            candidate.artist,
            artistCount + 1
        );

        totalDuration +=
            duration;

    }


    return shuffle(
        selected
    );

}


// =====================================================
// WEIGHTED SAMPLING
// =====================================================

function weightedSampleWithoutReplacement(
    items,
    weightFn,
    count
) {

    const pool =
        items.map(
            track => ({

                track,

                weight:
                    Math.max(
                        weightFn(track),
                        0.001
                    )

            })
        );


    const chosen = [];

    const artistCounts =
        new Map();

    const ARTIST_CAP =
        3;


    while (
        chosen.length < count &&
        pool.length > 0
    ) {

        const totalWeight =
            pool.reduce(
                (sum, item) =>
                    sum + item.weight,
                0
            );


        let random =
            Math.random() *
            totalWeight;


        let selectedIndex =
            pool.length - 1;


        for (
            let i = 0;
            i < pool.length;
            i++
        ) {

            random -=
                pool[i].weight;

            if (
                random <= 0
            ) {

                selectedIndex =
                    i;

                break;

            }

        }


        const candidate =
            pool[
                selectedIndex
            ].track;


        pool.splice(
            selectedIndex,
            1
        );


        const artistCount =
            artistCounts.get(
                candidate.artist
            ) || 0;


        if (
            artistCount >=
            ARTIST_CAP
        ) {

            continue;

        }


        chosen.push(
            candidate
        );


        artistCounts.set(
            candidate.artist,
            artistCount + 1
        );

    }


    return chosen;

}


// =====================================================
// SHUFFLE
// =====================================================

function shuffle(array) {

    const result =
        [...array];


    for (
        let i =
            result.length - 1;
        i > 0;
        i--
    ) {

        const j =
            Math.floor(
                Math.random() *
                (i + 1)
            );


        [
            result[i],
            result[j]
        ] =
        [
            result[j],
            result[i]
        ];

    }


    return result;

}


// =====================================================
// RENDER PLAYLIST
// =====================================================

function renderPlaylist(
    tracks
) {

    if (!playlistPreview) {
        return;
    }

    playlistPreview.innerHTML =
        "";


    if (
        !tracks ||
        tracks.length === 0
    ) {

        playlistPreview.innerHTML =
            `
            <p class="placeholder-text">
                No tracks could be selected.
            </p>
            `;

        return;

    }


    tracks.forEach(
        track => {

            playlistPreview.appendChild(
                createTrackElement(
                    track
                )
            );

        }
    );

}


// =====================================================
// CREATE TRACK ELEMENT
// =====================================================

function createTrackElement(
    track
) {

    const container =
        document.createElement("div");


    container.className =
        "track";


    container.dataset.uri =
        track.uri || "";


    container.dataset.id =
        track.id || "";


    container.dataset.duration =
        track.duration_ms || 0;


    container.dataset.image =
        track.image || "";


    const albumArt =
        track.image
            ? `
                <img
                    class="album-art"
                    src="${escapeHtml(track.image)}"
                    alt=""
                    loading="lazy"
                >
              `
            : `
                <div class="album-art"></div>
              `;


    container.innerHTML =
        `
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


    const image =
        container.querySelector(
            "img.album-art"
        );


    if (image) {

        image.addEventListener(
            "error",
            () => {

                const replacement =
                    document.createElement(
                        "div"
                    );

                replacement.className =
                    "album-art";

                image.replaceWith(
                    replacement
                );

            }
        );

    }


    return container;

}


// =====================================================
// SAVE GENERATED PLAYLIST (combined)
// =====================================================
// One button does both jobs that used to be two buttons: saves
// to Supabase (the right table for whichever platform is
// active) AND creates the real playlist on that platform, in
// one click. The History panel's save button reuses the same
// platform-creation step, but skips the Supabase insert since
// a history row is already saved.

savePlaylistBtn?.addEventListener(
    "click",
    () => saveGeneratedPlaylist()
);


historySaveBtn?.addEventListener(
    "click",
    () => {

        if (!currentHistoryRow) {

            showError(
                "Select a playlist from your history first."
            );

            return;

        }

        saveHistoryEntryToPlatform(
            currentHistoryRow,
            currentHistoryPlatform,
            historySaveBtn
        );

    }
);


let currentHistoryRow = null;
let currentHistoryPlatform = "spotify";


// Extracts track URIs in the shape each platform's API needs —
// Spotify wants "spotify:track:..." URIs, YouTube just wants
// plain video IDs (that's what normalizeYoutubeTrack stores in
// `uri` already, so no prefix to check there).
function getPlatformTrackUris(tracks, platform) {

    if (platform === "youtube") {

        return tracks
            .map(track => track.uri)
            .filter(Boolean);

    }

    return tracks
        .map(track => track.uri)
        .filter(uri => uri && uri.startsWith("spotify:track:"));

}


async function createAndPopulatePlatformPlaylist(platform, name, trackUris) {

    if (platform === "youtube") {

        const playlist = await createYoutubePlaylist(name);

        await addVideosToYoutubePlaylist(playlist.id, trackUris);

        return {
            id: playlist.id,
            url: `https://music.youtube.com/playlist?list=${encodeURIComponent(
                playlist.id
            )}`
        };

    }

    const currentUser = await spotifyFetch("/me");

    const playlist = await createSpotifyPlaylist(currentUser.id, name);

    await addTracksToSpotifyPlaylist(playlist.id, trackUris);

    return {
        id: playlist.id,
        url: playlist.external_urls?.spotify || null
    };

}


function extractTracksFromPreview() {

    if (!playlistPreview) {
        return [];
    }

    return Array.from(
        playlistPreview.querySelectorAll(".track")
    ).map(element => ({

        id: element.dataset.id || null,
        uri: element.dataset.uri || null,
        title: element.querySelector("h4")?.textContent || "",
        artist: element.querySelector("span")?.textContent || "",
        duration_ms: parseInt(element.dataset.duration || "0", 10),
        image: element.dataset.image || null

    }));

}


async function saveGeneratedPlaylist() {

    const platform = activeLibrarySource;

    const tracks = extractTracksFromPreview();

    if (tracks.length === 0) {

        showError(
            "Generate a playlist first before saving it."
        );

        return;

    }

    const trackUris = getPlatformTrackUris(tracks, platform);

    if (trackUris.length === 0) {

        showError(
            `The generated playlist doesn't contain any valid ${platform === "youtube" ? "YouTube" : "Spotify"} tracks.`
        );

        return;

    }

    const name =
        playlistNameInput?.value.trim() ||
        "GenPlaylist Mix";

    if (savePlaylistBtn) {
        savePlaylistBtn.disabled = true;
        savePlaylistBtn.textContent = "Saving…";
    }

    // Step 1: Supabase (History). Non-fatal if it fails — still
    // attempt the real platform save below, since losing history
    // is a smaller problem than not saving the playlist at all.
    try {

        const client = getSupabaseClient();

        const table =
            platform === "youtube" ? "youtube_generated_playlists" : "generated_playlists";

        const userIdField =
            platform === "youtube" ? "youtube_user_id" : "spotify_user_id";

        const { error } = await client
            .from(table)
            .insert({

                playlist_name: name,
                intent: selectedIntent,
                track_count: tracks.length,
                [userIdField]: platform === "youtube" ? youtubeUserId : spotifyUserId,
                tracks

            });

        if (error) {
            throw error;
        }

    } catch (historyError) {

        console.error("[Supabase]", historyError);
        // Intentionally not shown as a blocking error — see comment above.

    }

    // Step 2: the real platform playlist.
    try {

        const playlist = await createAndPopulatePlatformPlaylist(platform, name, trackUris);

        if (savePlaylistBtn) {
            savePlaylistBtn.textContent =
                `Saved to ${platform === "youtube" ? "YouTube Music" : "Spotify"} ✓`;
        }

        clearError();

        if (playlist.url) {
            window.open(playlist.url, "_blank", "noopener,noreferrer");
        }

    } catch (error) {

        console.error("[Platform save]", error);

        if (savePlaylistBtn) {
            savePlaylistBtn.disabled = false;
            updateSaveButtonLabel();
        }

        if (
            error.message === "AUTH_EXPIRED" ||
            error.message === "YOUTUBE_AUTH_EXPIRED"
        ) {

            if (error.message === "YOUTUBE_AUTH_EXPIRED") {
                youtubeAccessToken = null;
                setYoutubeDisconnectedState();
                showError("Your YouTube session expired. Please reconnect.");
                return;
            }

            handleAuthExpired();
            return;

        }

        showError(
            platform === "youtube" ? friendlyYoutubeMessageFor(error) : friendlyMessageFor(error),
            { retry: saveGeneratedPlaylist }
        );

    }

}


async function saveHistoryEntryToPlatform(row, platform, button) {

    const historicalTracks =
        Array.isArray(row.tracks) ? row.tracks : [];

    if (historicalTracks.length === 0) {

        showError(
            "This saved playlist doesn't contain any tracks."
        );

        return;

    }

    const trackUris = getPlatformTrackUris(historicalTracks, platform);

    if (trackUris.length === 0) {

        showError(
            `This saved playlist doesn't contain any valid ${platform === "youtube" ? "YouTube" : "Spotify"} tracks.`
        );

        return;

    }

    const name = row.playlist_name?.trim() || "GenPlaylist Mix";

    if (button) {
        button.disabled = true;
        button.textContent = "Saving…";
    }

    try {

        const playlist = await createAndPopulatePlatformPlaylist(platform, name, trackUris);

        if (button) {
            button.textContent = `Saved to ${platform === "youtube" ? "YouTube Music" : "Spotify"} ✓`;
        }

        clearError();

        if (playlist.url) {
            window.open(playlist.url, "_blank", "noopener,noreferrer");
        }

    } catch (error) {

        console.error("[History save]", error);

        if (button) {
            button.disabled = false;
            button.textContent = `Save to ${platform === "youtube" ? "YouTube Music" : "Spotify"}`;
        }

        if (
            error.message === "AUTH_EXPIRED" ||
            error.message === "YOUTUBE_AUTH_EXPIRED"
        ) {

            if (error.message === "YOUTUBE_AUTH_EXPIRED") {
                youtubeAccessToken = null;
                setYoutubeDisconnectedState();
                showError("Your YouTube session expired. Please reconnect.");
                return;
            }

            handleAuthExpired();
            return;

        }

        showError(
            platform === "youtube" ? friendlyYoutubeMessageFor(error) : friendlyMessageFor(error),
            { retry: () => saveHistoryEntryToPlatform(row, platform, button) }
        );

    }

}


// Keeps the single save button's label in sync with whichever
// platform is currently active, so it never says "Save to
// Spotify" while YouTube is the one about to actually be used.
function updateSaveButtonLabel() {

    if (!savePlaylistBtn) {
        return;
    }

    savePlaylistBtn.textContent =
        `Save to ${activeLibrarySource === "youtube" ? "YouTube Music" : "Spotify"}`;

}


// =====================================================

async function createSpotifyPlaylist(
    userId,
    name
) {

    return spotifyFetch(
        "/me/playlists",
        {

            method:
                "POST",

            body:
                JSON.stringify({

                    name,

                    public:
                        false,

                    collaborative:
                        false,

                    description:
                        `Generated by GenPlaylist • ${selectedIntent}`

                })

        }
    );

}


// =====================================================
// ADD TRACKS TO SPOTIFY
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
            `/playlists/${encodeURIComponent(playlistId)}/items`,
            {

                method:
                    "POST",

                body:
                    JSON.stringify({

                        uris:
                            chunk

                    })

            }
        );

    }

}


// =====================================================
// CREATE YOUTUBE PLAYLIST
// =====================================================

// =====================================================
// CREATE YOUTUBE PLAYLIST
// =====================================================

async function createYoutubePlaylist(
    name
) {

    if (!youtubeAccessToken) {

        throw new Error(
            "YOUTUBE_AUTH_EXPIRED"
        );

    }


    const safeName =
        name?.trim() ||
        "GenPlaylist Mix";


    return youtubeFetch(
        "/playlists?part=snippet,status",
        {

            method:
                "POST",

            body:
                JSON.stringify({

                    snippet: {

                        title:
                            safeName,

                        description:
                            `Generated by GenPlaylist • ${selectedIntent}`

                    },

                    status: {

                        privacyStatus:
                            "private"

                    }

                })

        }
    );

}


// =====================================================
// ADD VIDEOS TO YOUTUBE PLAYLIST
// =====================================================
// Unlike Spotify, YouTube's API can only add ONE video per
// request — no batching. Each insert costs 50 quota units, so a
// 50-song playlist costs ~2,550 units, roughly a quarter of the
// free 10,000/day quota. That's why the save flow below caps
// YouTube saves to a smaller size by default.

async function addVideosToYoutubePlaylist(playlistId, videoIds) {

    const uniqueVideoIds = [
        ...new Set(
            videoIds.filter(Boolean)
        )
    ];

    let added = 0;
    let skipped = 0;

    for (const videoId of uniqueVideoIds) {

        try {

            await youtubeFetch(
                "/playlistItems?part=snippet",
                {
                    method: "POST",

                    body: JSON.stringify({
                        snippet: {
                            playlistId,
                            resourceId: {
                                kind: "youtube#video",
                                videoId
                            }
                        }
                    })
                }
            );

            added++;

        } catch (error) {

            console.warn(
                "[YouTube] Could not add video:",
                videoId,
                error
            );

            skipped++;
        }
    }

    console.log(
        `[YouTube] Playlist population complete: ${added} added, ${skipped} skipped.`
    );

    // Only fail the overall save if literally nothing
    // could be added.
    if (
        added === 0 &&
        uniqueVideoIds.length > 0
    ) {
        throw new Error(
            "YOUTUBE_NO_VIDEOS_ADDED"
        );
    }

    return {
        added,
        skipped
    };
}


// =====================================================
// SUPABASE CLIENT
// =====================================================

function getSupabaseClient() {

    if (supabaseClient) {
        return supabaseClient;
    }


    if (
        !window.supabase ||
        typeof window.supabase.createClient !==
        "function"
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
// PLAYLIST HISTORY
// =====================================================
// Filtered by spotify_user_id at the query level, so each user
// only sees their own saved playlists in the app's UI. Worth
// knowing: this is an app-level filter, not a security boundary
// — the current RLS policy still permits any anon key holder to
// query the table directly. Real per-user isolation would need
// Supabase Auth + RLS tied to auth.uid(), which is a bigger
// change than what was asked for here.

async function loadPlaylistHistory() {

    const platform = historyPlatform;

    const userId =
        platform === "youtube" ? youtubeUserId : spotifyUserId;

    if (!userId) {

        historyList.innerHTML =
            `
            <p class="placeholder-text">
                Connect ${platform === "youtube" ? "YouTube Music" : "Spotify"} to view your playlist history.
            </p>
            `;

        return;

    }

    historyList.innerHTML =
        `
        <p class="placeholder-text">
            Loading your playlist history…
        </p>
        `;

    try {

        const client =
            getSupabaseClient();

        const table =
            platform === "youtube" ? "youtube_generated_playlists" : "generated_playlists";

        const userIdField =
            platform === "youtube" ? "youtube_user_id" : "spotify_user_id";

        const {
            data,
            error
        } =
            await client
                .from(table)
                .select("*")
                .eq(userIdField, userId)
                .order("created_at", { ascending: false })
                .limit(50);

        if (error) {
            throw error;
        }

        renderHistoryList(data || []);

    } catch (error) {

        console.error(
            "[Supabase history]",
            error
        );

        if (error.message === "SUPABASE_LIBRARY_MISSING") {

            historyList.innerHTML =
                `
                <p class="placeholder-text">
                    Supabase isn't loaded. Add the Supabase JavaScript library to your HTML.
                </p>
                `;

            return;

        }

        historyList.innerHTML =
            `
            <p class="placeholder-text">
                Couldn't load your playlist history.
            </p>
            `;

        showError(
            "Couldn't load your playlist history. Please try again.",
            { retry: loadPlaylistHistory }
        );

    }

}


function renderHistoryList(rows) {

    if (rows.length === 0) {

        historyList.innerHTML =
            `
            <p class="placeholder-text">
                You haven't saved any playlists yet.
            </p>
            `;

        return;

    }

    historyList.innerHTML = "";

    rows.forEach(row => {

        const item =
            document.createElement("div");

        item.className = "history-item";

        const dateLabel =
            new Date(row.created_at).toLocaleDateString(
                undefined,
                { month: "short", day: "numeric", year: "numeric" }
            );

        item.innerHTML =
            `
            <div>
                <div class="history-item-name">
                    ${escapeHtml(row.playlist_name || "Untitled Playlist")}
                </div>
                <div class="history-item-meta">
                    ${escapeHtml(row.intent)} · ${escapeHtml(row.track_count)} songs · ${escapeHtml(dateLabel)}
                </div>
            </div>
            <i class="fa-solid fa-chevron-right"></i>
            `;

        item.addEventListener(
            "click",
            () => viewHistoryEntry(row)
        );

        historyList.appendChild(item);

    });

}


// function viewHistoryEntry(row) {

//     historyTrackViewTitle.textContent =
//         row.playlist_name || "Untitled Playlist";

//     historyTrackList.innerHTML = "";

//     // Saved tracks don't carry their own tag/image — reuse the
//     // playlist's own saved intent as the tag instead of falling
//     // back to createTrackElement's default (today's live
//     // selectedIntent), which would be misleading for old data.
//     (row.tracks || []).forEach(track => {

//         historyTrackList.appendChild(
//             createTrackElement({
//                 ...track,
//                 tag: row.intent
//             })
//         );

//     });

//     historyList.classList.add("hidden");
//     historyTrackView.classList.remove("hidden");

// }

function viewHistoryEntry(row) {

    currentHistoryRow =
        row;

    currentHistoryPlatform =
        historyPlatform;


    historyTrackViewTitle.textContent =
        row.playlist_name || "Untitled Playlist";


    historyTrackList.innerHTML = "";


    // Reset the save button whenever a different historical
    // playlist is opened, labeled for whichever platform this
    // specific row actually belongs to.

    if (historySaveBtn) {

        historySaveBtn.disabled =
            false;

        historySaveBtn.textContent =
            `Save to ${currentHistoryPlatform === "youtube" ? "YouTube Music" : "Spotify"}`;

    }


    // Saved tracks don't carry their own tag/image — reuse the
    // playlist's own saved intent as the tag instead of falling
    // back to createTrackElement's default (today's live
    // selectedIntent), which would be misleading for old data.

    (row.tracks || []).forEach(
        track => {

            historyTrackList.appendChild(
                createTrackElement({
                    ...track,
                    tag: row.intent
                })
            );

        }
    );


    historyList.classList.add(
        "hidden"
    );


    historyTrackView.classList.remove(
        "hidden"
    );

}


let historyPlatform = "spotify";

const historyPlatformTabs =
    document.getElementById("historyPlatformTabs");

const historyTabSpotify =
    document.getElementById("historyTabSpotify");

const historyTabYoutube =
    document.getElementById("historyTabYoutube");


// Only worth showing the tabs once more than one platform is
// actually connected — same reasoning as the Library Source bar.
function updateHistoryPlatformTabs() {

    if (!historyPlatformTabs) {
        return;
    }

    const bothConnected =
        Boolean(spotifyAccessToken) && Boolean(youtubeAccessToken);

    historyPlatformTabs.classList.toggle("hidden", !bothConnected);

}


function setHistoryPlatform(platform) {

    historyPlatform = platform;

    historyTabSpotify?.classList.toggle("active", platform === "spotify");
    historyTabYoutube?.classList.toggle("active", platform === "youtube");

    historyTrackView.classList.add("hidden");
    historyList.classList.remove("hidden");

    loadPlaylistHistory();

}


historyTabSpotify?.addEventListener(
    "click",
    () => setHistoryPlatform("spotify")
);

historyTabYoutube?.addEventListener(
    "click",
    () => setHistoryPlatform("youtube")
);


function showPlaylistHistory() {

    historyPanel.classList.remove("hidden");
    historyTrackView.classList.add("hidden");
    historyList.classList.remove("hidden");

    updateHistoryPlatformTabs();

    // Default to whichever platform is currently active for
    // generation — most likely what the person wants to see.
    historyPlatform = activeLibrarySource;
    historyTabSpotify?.classList.toggle("active", historyPlatform === "spotify");
    historyTabYoutube?.classList.toggle("active", historyPlatform === "youtube");

    loadPlaylistHistory();

}


function hidePlaylistHistory() {

    historyPanel?.classList.add("hidden");

}


viewHistoryBtn?.addEventListener(
    "click",
    showPlaylistHistory
);

closeHistoryBtn?.addEventListener(
    "click",
    hidePlaylistHistory
);

backToHistoryListBtn?.addEventListener(
    "click",
    () => {
        historyTrackView.classList.add("hidden");
        historyList.classList.remove("hidden");
    }
);


// =====================================================
// AUTH EXPIRED
// =====================================================

function handleAuthExpired() {

    spotifyAccessToken =
        null;

    spotifyUserId =
        null;

    hidePlaylistHistory();

    sessionStorage.removeItem(
        "spotify_pkce_verifier"
    );

    setSpotifyDisconnectedState();

    hideDashboard();


    if (libraryList) {

        libraryList.innerHTML =
            `
            <p class="placeholder-text">
                Connect to Spotify to see your playlists here.
            </p>
            `;

    }


    if (songGrid) {

        songGrid.innerHTML =
            `
            <p class="placeholder-text">
                Connect to Spotify to see your top songs here.
            </p>
            `;

    }


    showError(
        "Your Spotify session expired. Please reconnect.",
        {
            retry:
                redirectToSpotifyLogin
        }
    );

}


// =====================================================
// INITIAL UI STATE
// =====================================================

setSpotifyDisconnectedState();

hideDashboard();

updatePlaylistSizeMode();


// =====================================================
// YOUTUBE MUSIC AUTH
// =====================================================
// Uses Google Identity Services (a popup-based token flow) —
// architecturally different from Spotify's redirect-based PKCE
// flow above, since that's how Google's browser auth works.
//
// SETUP NEEDED before this works:
// 1. Create a project in Google Cloud Console, enable
//    "YouTube Data API v3".
// 2. Configure the OAuth consent screen (scopes below).
// 3. Create an OAuth Client ID (Web application), add this
//    page's exact origin as an Authorized JavaScript origin.
// 4. Add testers by email under "Test users" while in
//    Testing mode (up to ~100).

const YOUTUBE_CLIENT_ID =
    "314089697669-8l2s82s8hc58aqfm1bdbjl39ghtc6f6a.apps.googleusercontent.com";

const YOUTUBE_SCOPES =
    "https://www.googleapis.com/auth/youtube";

const youtubeLoginButtons =
    document.querySelectorAll("#youtubeLoginBtn, #heroYoutubeLoginBtn");

let youtubeAccessToken = null;
let youtubeLikedPlaylistId = null;
let youtubeTokenClient = null;


function getYoutubeTokenClient() {

    if (youtubeTokenClient) {
        return youtubeTokenClient;
    }

    const PLACEHOLDER_YOUTUBE_CLIENT_ID =
        "PASTE_YOUR_GOOGLE_OAUTH_CLIENT_ID_HERE";

    if (
        !YOUTUBE_CLIENT_ID ||
        YOUTUBE_CLIENT_ID === PLACEHOLDER_YOUTUBE_CLIENT_ID
    ) {
        throw new Error("YOUTUBE_NOT_CONFIGURED");
    }

    if (
        !window.google ||
        !window.google.accounts ||
        !window.google.accounts.oauth2
    ) {
        throw new Error("YOUTUBE_LIBRARY_MISSING");
    }

    youtubeTokenClient =
        window.google.accounts.oauth2.initTokenClient({
            client_id: YOUTUBE_CLIENT_ID,
            scope: YOUTUBE_SCOPES,
            callback: (response) => {

                if (response.error) {
                    showError(
                        `YouTube sign-in was cancelled or denied (${response.error}).`
                    );
                    return;
                }

                youtubeAccessToken = response.access_token;
                console.log(
                    "[YouTube OAuth]",
                    {
                        hasToken: Boolean(youtubeAccessToken),
                        tokenLength: youtubeAccessToken?.length,
                        scope: response.scope,
                        expiresIn: response.expires_in
                    }
                );
                lastConnectedPlatform = "youtube";
                setYoutubeConnectedState();
                applyPlatformTheme();
                showDashboard();
                clearError();

                updateLibrarySourceBar();
                updateHistoryPlatformTabs();
                setActiveLibrarySource("youtube");

            }
        });

    return youtubeTokenClient;

}


function connectYoutube() {

    try {

        const client = getYoutubeTokenClient();

        client.requestAccessToken();

    } catch (err) {

        if (err.message === "YOUTUBE_NOT_CONFIGURED") {
            showError(
                "No Google OAuth Client ID is set. Add yours near the top of script.js before connecting YouTube."
            );
            return;
        }

        if (err.message === "YOUTUBE_LIBRARY_MISSING") {
            showError(
                "Google's sign-in library hasn't loaded yet. Please wait a moment and try again."
            );
            return;
        }

        showError(
            "Couldn't start YouTube sign-in. Please try again.",
            { retry: connectYoutube }
        );

    }

}


function setYoutubeConnectedState() {

    youtubeLoginButtons.forEach(
        button => {

            button.textContent = "YouTube Log Out";
            button.classList.add("logout-state");

        }
    );

}


function setYoutubeDisconnectedState() {

    youtubeLoginButtons.forEach(
        button => {

            button.innerHTML =
                `<i class="fa-brands fa-youtube"></i> Connect YouTube Music`;
            button.classList.remove("logout-state");

        }
    );

}


// Resilient fetch wrapper for the YouTube Data API, matching the
// same retry/backoff shape as spotifyFetch — including handling
// quota exhaustion (403 quotaExceeded) as its own clear error,
// since that's a real, expected failure mode for this API.
// =====================================================
// YOUTUBE API FETCH
// =====================================================
// Supports GET and POST requests, including JSON request bodies.
// This is important because playlist creation and adding videos
// both require POST requests.

async function youtubeFetch(
    path,
    options = {},
    attempt = 1
) {

    if (!youtubeAccessToken) {

        throw new Error(
            "YOUTUBE_AUTH_EXPIRED"
        );

    }


    const method =
        options.method || "GET";


    const headers = {

        Authorization:
            `Bearer ${youtubeAccessToken}`

    };


    if (options.body) {

        headers["Content-Type"] =
            "application/json";

    }


    let res;


    try {

        res = await fetch(
            `https://www.googleapis.com/youtube/v3${path}`,
            {

                method,

                headers,

                body:
                    options.body || undefined

            }
        );

    } catch (networkErr) {

        console.error(
            "[YouTube network error]",
            networkErr
        );


        if (attempt < 3) {

            await sleep(
                500 * attempt
            );

            return youtubeFetch(
                path,
                options,
                attempt + 1
            );

        }


        throw new Error(
            "NETWORK_ERROR"
        );

    }


    // -----------------------------------------
    // RETRY SERVER ERRORS
    // -----------------------------------------

    if (
        res.status >= 500 &&
        attempt < 3
    ) {

        await sleep(
            400 * attempt
        );

        return youtubeFetch(
            path,
            options,
            attempt + 1
        );

    }


    // -----------------------------------------
    // AUTH EXPIRED
    // -----------------------------------------

    if (
        res.status === 401
    ) {

        throw new Error(
            "YOUTUBE_AUTH_EXPIRED"
        );

    }


    // -----------------------------------------
    // FORBIDDEN / QUOTA
    // -----------------------------------------

    if (
        res.status === 403
    ) {

        const body =
            await res.json().catch(
                () => null
            );


        const reason =
            body?.error?.errors?.[0]?.reason ||
            body?.error?.status ||
            "";


        console.error(
            "[YouTube 403]",
            body
        );


        if (
            reason ===
                "quotaExceeded" ||
            reason ===
                "dailyLimitExceeded"
        ) {

            throw new Error(
                "YOUTUBE_QUOTA_EXCEEDED"
            );

        }


        if (
            reason ===
                "insufficientPermissions" ||
            reason ===
                "forbidden"
        ) {

            throw new Error(
                "YOUTUBE_WRITE_PERMISSION_REQUIRED"
            );

        }


        throw new Error(
            "FORBIDDEN"
        );

    }


    // -----------------------------------------
    // NOT FOUND
    // -----------------------------------------

    if (
        res.status === 404
    ) {

        throw new Error(
            "YOUTUBE_NOT_FOUND"
        );

    }


    // -----------------------------------------
    // OTHER API ERRORS
    // -----------------------------------------

    if (!res.ok) {

        const body =
            await res.json().catch(
                () => null
            );


        console.error(
            "[YouTube API error]",
            {

                status:
                    res.status,

                method,

                path,

                body

            }
        );


        throw new Error(
            `YOUTUBE_ERROR_${res.status}`
        );

    }


    // -----------------------------------------
    // NO CONTENT
    // -----------------------------------------

    if (
        res.status === 204
    ) {

        return null;

    }


    return res.json();

}


// =====================================================
// YOUTUBE DATA LAYER
// =====================================================
// Mirrors the Spotify data layer above: fetch libraries, fetch
// anchor candidates, build a track pool, score it — using the
// exact same downstream functions once data is normalized.

let youtubeUserId = null;

// YouTube's playlistItems.list paginates via nextPageToken
// rather than a `next` URL, unlike Spotify — otherwise the same
// idea as spotifyFetchAllPages.
async function youtubeFetchAllPages(basePath) {

    let items = [];
    let pageToken = null;

    do {

        const path =
            basePath +
            (pageToken ? `&pageToken=${pageToken}` : "");

        const data = await youtubeFetch(path);

        items = items.concat(data.items || []);
        pageToken = data.nextPageToken || null;

    } while (pageToken);

    return items;

}


// YouTube has no single "get my user id" endpoint like Spotify's
// /me — the channel ID is the closest stable per-account
// identifier, and doubles as the way to find the special "Liked
// videos" playlist (relatedPlaylists.likes).
async function fetchYoutubeChannelInfo() {

    const data = await youtubeFetch(
        "/channels?part=id,contentDetails&mine=true"
    );

    const channel = data.items?.[0];

    return {
        channelId: channel?.id || null,
        likedPlaylistId: channel?.contentDetails?.relatedPlaylists?.likes || null
    };

}


async function loadYoutubeLibrariesAndAnchors() {

    libraryList.innerHTML =
        `<p class="placeholder-text">Loading your playlists…</p>`;

    songGrid.innerHTML =
        `<p class="placeholder-text">Loading your top songs…</p>`;

    try {

        const [playlistsData, channelInfo] = await Promise.all([
            youtubeFetch("/playlists?part=snippet,contentDetails&mine=true&maxResults=50"),
            fetchYoutubeChannelInfo()
        ]);

        youtubeUserId = channelInfo.channelId;
        youtubeLikedPlaylistId = channelInfo.likedPlaylistId;

        const normalizedPlaylists =
            (playlistsData.items || []).map(normalizeYoutubePlaylist);

        // Liked videos rendered the same way Spotify's Liked
        // Songs pseudo-library is — reuses renderLibraries
        // unchanged since both are now Spotify-shaped.
        let likedCount = 0;

        if (youtubeLikedPlaylistId) {

            try {

                const likedPreview = await youtubeFetch(
                    `/playlistItems?part=id&playlistId=${encodeURIComponent(youtubeLikedPlaylistId)}&maxResults=1`
                );

                likedCount = likedPreview.pageInfo?.totalResults || 0;

            } catch (likedErr) {
                // Non-fatal — playlists still render without this.
            }

        }

        renderLibraries(normalizedPlaylists, likedCount);

    } catch (err) {

        if (err.message === "YOUTUBE_AUTH_EXPIRED") {
            youtubeAccessToken = null;
            setYoutubeDisconnectedState();
        }

        libraryList.innerHTML =
            `<p class="placeholder-text">Couldn't load your playlists.</p>`;

        showError(
            friendlyYoutubeMessageFor(err),
            { retry: loadYoutubeLibrariesAndAnchors }
        );

        return;

    }

    // Anchor candidates: YouTube has no personalized "top
    // videos" signal, so the most recently liked videos are used
    // as a proxy — clearly not the same as Spotify's real
    // listening-based top tracks, but the closest available.
    try {

        if (!youtubeLikedPlaylistId) {
            songGrid.innerHTML =
                `<p class="placeholder-text">No liked videos found to suggest anchors from.</p>`;
            return;
        }

        const recentLiked = await youtubeFetch(
            `/playlistItems?part=snippet,contentDetails&playlistId=${encodeURIComponent(youtubeLikedPlaylistId)}&maxResults=8`
        );

        const items = recentLiked.items || [];
        const videoIds = items.map(item => item.contentDetails?.videoId).filter(Boolean);
        const videoDetailsById = await fetchYoutubeVideoDetails(videoIds);

        const normalizedAnchors =
            items
                .map(item => normalizeYoutubeTrack(item, videoDetailsById.get(item.contentDetails?.videoId)))
                .filter(Boolean);

        renderTopSongs(normalizedAnchors);

    } catch (err) {

        songGrid.innerHTML =
            `<p class="placeholder-text">Couldn't load anchor suggestions.</p>`;

    }

}


// Video duration/full details only come from videos.list, not
// playlistItems.list — batched up to 50 IDs per call (YouTube's
// max), returned as a Map keyed by video ID for easy merging.
async function fetchYoutubeVideoDetails(videoIds) {

    const detailsById = new Map();
    const CHUNK_SIZE = 50;

    for (let i = 0; i < videoIds.length; i += CHUNK_SIZE) {

        const chunk = videoIds.slice(i, i + CHUNK_SIZE);

        if (chunk.length === 0) {
            continue;
        }

        const data = await youtubeFetch(
            `/videos?part=contentDetails&id=${chunk.join(",")}`
        );

        (data.items || []).forEach(video => {
            detailsById.set(video.id, video);
        });

    }

    return detailsById;

}


async function buildYoutubeTrackPool(selectedLibraries) {

    const requests =
        selectedLibraries.map(source => {

            const playlistId =
                source.isLiked ? youtubeLikedPlaylistId : source.id;

            if (!playlistId) {
                return Promise.resolve([]);
            }

            return youtubeFetchAllPages(
                `/playlistItems?part=snippet,contentDetails&playlistId=${encodeURIComponent(playlistId)}&maxResults=50`
            );

        });

    const results = await Promise.allSettled(requests);

    const rawItems = [];

    results.forEach(result => {
        if (result.status === "fulfilled") {
            rawItems.push(...result.value);
        }
    });

    // Deleted/private videos show up with this placeholder title
    // — filter them out rather than showing broken entries.
    const validItems =
        rawItems.filter(item =>
            item.snippet?.title &&
            item.snippet.title !== "Private video" &&
            item.snippet.title !== "Deleted video"
        );

    const videoIds =
        validItems
            .map(item => item.contentDetails?.videoId)
            .filter(Boolean);

    const videoDetailsById = await fetchYoutubeVideoDetails(videoIds);

    const tracksById = new Map();

    validItems.forEach(item => {

        const track = normalizeYoutubeTrack(
            item,
            videoDetailsById.get(item.contentDetails?.videoId)
        );

        if (track && !tracksById.has(track.id)) {
            tracksById.set(track.id, track);
        }

    });

    return Array.from(tracksById.values());

}


// =====================================================
// LIBRARY SOURCE TOGGLE
// =====================================================
// Lets the person pick which connected platform's data
// populates Libraries/Anchors/Generate. Deliberately a toggle,
// not a merge — merging both platforms into one pool is a
// bigger feature to build on top of this later if wanted.

let activeLibrarySource = "spotify";

const librarySourceBar =
    document.getElementById("librarySourceBar");

const sourceSpotifyBtn =
    document.getElementById("sourceSpotifyBtn");

const sourceYoutubeBtn =
    document.getElementById("sourceYoutubeBtn");


// Only worth showing the toggle once more than one platform is
// actually connected — otherwise there's nothing to switch
// between, and it'd just be a confusing extra control.
function updateLibrarySourceBar() {

    if (!librarySourceBar) {
        return;
    }

    const bothConnected =
        Boolean(spotifyAccessToken) && Boolean(youtubeAccessToken);

    librarySourceBar.classList.toggle("hidden", !bothConnected);

}


async function setActiveLibrarySource(source) {

    activeLibrarySource = source;

    // Make the selected platform control the theme.
    lastConnectedPlatform = source;

    sourceSpotifyBtn?.classList.toggle(
        "active",
        source === "spotify"
    );

    sourceYoutubeBtn?.classList.toggle(
        "active",
        source === "youtube"
    );

    applyPlatformTheme();

    updateSaveButtonLabel();


    if (source === "spotify") {

        if (!spotifyAccessToken) {
            return;
        }

        await loadLibrariesAndAnchors();

    } else {

        if (!youtubeAccessToken) {
            return;
        }

        await loadYoutubeLibrariesAndAnchors();

    }

}


sourceSpotifyBtn?.addEventListener(
    "click",
    () => setActiveLibrarySource("spotify")
);

sourceYoutubeBtn?.addEventListener(
    "click",
    () => setActiveLibrarySource("youtube")
);


youtubeLoginButtons.forEach(
    button => button.addEventListener(
        "click",
        () => {

            if (youtubeAccessToken) {
                youtubeAccessToken = null;

                if (lastConnectedPlatform === "youtube") {
                    lastConnectedPlatform =
                        spotifyAccessToken ? "spotify" : null;
                    applyPlatformTheme();
                }

                updateLibrarySourceBar();
                updateHistoryPlatformTabs();

                if (activeLibrarySource === "youtube" && spotifyAccessToken) {
                    setActiveLibrarySource("spotify");
                }

                setYoutubeDisconnectedState();
                clearError();
                return;
            }

            connectYoutube();

        }
    )
);


setYoutubeDisconnectedState();


// =====================================================
// START APP
// =====================================================

initialiseSpotifyAuth();