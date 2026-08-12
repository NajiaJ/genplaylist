// ==========================================
// GenPlaylist
// script.js
// Complete regenerated version
// ==========================================


// =====================================================
// DOM ELEMENTS
// =====================================================

// IMPORTANT:
// The current HTML contains TWO elements with id="loginBtn":
// one in the navigation and one in the hero.
//
// Technically IDs should be unique, but we support both here
// so both buttons continue working without changing the HTML.

const loginButtons =
    document.querySelectorAll("#loginBtn");

const startBtn =
    document.getElementById("startBtn");

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
    document.querySelector(".playlist-preview");

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

const saveDbBtn =
    document.getElementById("saveDbBtn");

const saveSpotifyBtn =
    document.getElementById("saveSpotifyBtn");

const selectAllBtn =
    document.getElementById("selectAllPlaylists");

const deselectAllBtn =
    document.getElementById("deselectAllPlaylists");


// Playlist settings
const sizeMode =
    document.getElementById("sizeMode");

const songCountSetting =
    document.getElementById("songCountSetting");

const durationSetting =
    document.getElementById("durationSetting");

const songCount =
    document.getElementById("songCount");

const playlistDuration =
    document.getElementById("playlistDuration");


// Playlist name
const playlistNameInput =
    document.getElementById("playlistName");


// =====================================================
// APPLICATION STATE
// =====================================================

let selectedIntent =
    "Current Favourites";

let spotifyAccessToken =
    null;


// =====================================================
// ERROR HANDLING
// =====================================================

function showError(message, options = {}) {

    console.error("[GenPlaylist]", message);

    if (!errorBanner || !errorBannerText) {
        console.error(message);
        return;
    }

    errorBannerText.textContent =
        message;

    errorBanner.classList.remove("hidden");


    const existingRetry =
        errorBanner.querySelector(".retry-btn");

    if (existingRetry) {
        existingRetry.remove();
    }


    if (typeof options.retry === "function") {

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

    errorBanner.classList.add("hidden");

    if (errorBannerText) {
        errorBannerText.textContent = "";
    }


    const existingRetry =
        errorBanner.querySelector(".retry-btn");

    if (existingRetry) {
        existingRetry.remove();
    }

}


if (errorBannerDismiss) {

    errorBannerDismiss.addEventListener(
        "click",
        clearError
    );

}


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
        resolve => setTimeout(resolve, ms)
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
// DASHBOARD VISIBILITY
// =====================================================

function showDashboard() {

    if (welcomeHero) {

        welcomeHero.classList.add(
            "hidden"
        );

    }


    if (dashboard) {

        dashboard.classList.remove(
            "hidden"
        );

    }


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


function hideDashboard() {

    if (dashboard) {

        dashboard.classList.add(
            "hidden"
        );

    }


    if (welcomeHero) {

        welcomeHero.classList.remove(
            "hidden"
        );

    }

}


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

    if (!SPOTIFY_CLIENT_ID) {

        showError(
            "Spotify Client ID is missing."
        );

        return;

    }


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

        } catch (_) {
            // Ignore invalid JSON.
        }


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


    // Rate limited
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
            retryAfter * 1000
        );


        return spotifyFetch(
            path,
            options,
            attempt + 1
        );

    }


    // Spotify server error
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

async function spotifyFetchAllPages(path) {

    const items = [];

    let nextUrl =
        path;


    while (nextUrl) {

        let response;


        if (
            nextUrl.startsWith(
                "https://api.spotify.com/v1"
            )
        ) {

            response =
                await fetch(
                    nextUrl,
                    {

                        headers: {
                            Authorization:
                                `Bearer ${spotifyAccessToken}`
                        }

                    }
                );


            if (response.status === 401) {

                throw new Error(
                    "AUTH_EXPIRED"
                );

            }


            if (!response.ok) {

                throw new Error(
                    `SPOTIFY_ERROR_${response.status}`
                );

            }


            response =
                await response.json();

        } else {

            response =
                await spotifyFetch(
                    nextUrl
                );

        }


        if (Array.isArray(response.items)) {

            items.push(
                ...response.items
            );

        }


        nextUrl =
            response.next
                ? response.next.replace(
                    "https://api.spotify.com/v1",
                    ""
                )
                : null;

    }


    return items;

}


// =====================================================
// FRIENDLY ERRORS
// =====================================================

function friendlyMessageFor(error) {

    switch (
        error?.message
    ) {

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


        default:

            return "Something went wrong while communicating with Spotify.";

    }

}


// =====================================================
// LOGIN BUTTON STATE
// =====================================================

function setSpotifyConnectedState() {

    loginButtons.forEach(button => {

        button.innerHTML =
            "Log Out";

        button.disabled =
            false;

        button.classList.add(
            "logout-state"
        );

    });

}


function setSpotifyDisconnectedState() {

    loginButtons.forEach(button => {

        button.innerHTML =
            "Connect to Spotify";

        button.disabled =
            false;

        button.classList.remove(
            "logout-state"
        );

    });

}


// =====================================================
// LOGOUT
// =====================================================

function logoutFromGenPlaylist() {

    spotifyAccessToken =
        null;


    sessionStorage.removeItem(
        "spotify_pkce_verifier"
    );


    setSpotifyDisconnectedState();


    hideDashboard();


    libraryList.innerHTML =
        `
        <p class="placeholder-text">
            Connect to Spotify to see your playlists here.
        </p>
        `;


    songGrid.innerHTML =
        `
        <p class="placeholder-text">
            Connect to Spotify to see your top songs here.
        </p>
        `;


    playlistPreview.innerHTML =
        "";


    loadingSection?.classList.add(
        "hidden"
    );


    resultSection?.classList.add(
        "hidden"
    );


    clearError();


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


// =====================================================
// LOGIN BUTTON EVENTS
// =====================================================

loginButtons.forEach(button => {

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

});


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


    // -----------------------------------------
    // User cancelled login
    // -----------------------------------------

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


    // -----------------------------------------
    // No authorization code
    // -----------------------------------------

    if (!code) {

        hideDashboard();

        return;

    }


    // -----------------------------------------
    // Remove code from browser URL
    // -----------------------------------------

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


        // THIS is what makes the dashboard appear.
        showDashboard();


        clearError();


        await loadLibrariesAndAnchors();


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

    libraryList.innerHTML =
        `
        <p class="placeholder-text">
            Loading your playlists…
        </p>
        `;


    songGrid.innerHTML =
        `
        <p class="placeholder-text">
            Loading your top songs…
        </p>
        `;


    // -----------------------------------------
    // Playlists + Liked Songs
    // -----------------------------------------

    try {

        const [
            playlists,
            liked
        ] =
            await Promise.all([

                spotifyFetch(
                    "/me/playlists?limit=50"
                ),

                spotifyFetch(
                    "/me/tracks?limit=1"
                )

            ]);


        renderLibraries(
            playlists.items || [],
            liked.total || 0
        );


    } catch (error) {

        if (
            error.message ===
            "AUTH_EXPIRED"
        ) {

            handleAuthExpired();

            return;

        }


        libraryList.innerHTML =
            `
            <p class="placeholder-text">
                Couldn't load your playlists.
            </p>
            `;


        showError(
            friendlyMessageFor(error),
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

        const topTracks =
            await spotifyFetch(
                "/me/top/tracks?time_range=short_term&limit=8"
            );


        renderTopSongs(
            topTracks.items || []
        );


    } catch (error) {

        songGrid.innerHTML =
            `
            <p class="placeholder-text">
                No top songs are available yet.
            </p>
            `;

    }

}


// =====================================================
// RENDER LIBRARIES
// =====================================================

function renderLibraries(
    playlists,
    likedCount
) {

    libraryList.innerHTML =
        "";


    // Liked Songs
    const likedLabel =
        document.createElement("label");


    likedLabel.className =
        "library-item";


    likedLabel.innerHTML =
        `
        <input
            type="checkbox"
            checked
            data-id="liked"
            data-count="${likedCount}"
        >

        Liked Songs (${likedCount})
        `;


    libraryList.appendChild(
        likedLabel
    );


    // Playlists
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
                    checked
                    data-id="${escapeHtml(playlist.id)}"
                    data-count="${count}"
                >

                ${escapeHtml(playlist.name)}
                (${count})
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

    songGrid.innerHTML =
        "";


    if (
        !tracks ||
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


    tracks.forEach(track => {

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
            >

            ${escapeHtml(track.name)}
            — ${escapeHtml(artist)}
            `;


        songGrid.appendChild(
            label
        );

    });

}


// =====================================================
// SELECT ALL / DESELECT ALL
// =====================================================

function setAllLibraries(checked) {

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


if (selectAllBtn) {

    selectAllBtn.addEventListener(
        "click",
        () => {
            setAllLibraries(true);
        }
    );

}


if (deselectAllBtn) {

    deselectAllBtn.addEventListener(
        "click",
        () => {
            setAllLibraries(false);
        }
    );

}


// =====================================================
// PLAYLIST SIZE MODE
// =====================================================
//
// This is the important section for your current issue.
//
// If "Number of Songs" is selected:
//     show songCountSetting
//     hide durationSetting
//
// If "Approximate Duration" is selected:
//     hide songCountSetting
//     show durationSetting
//
// =====================================================

function updatePlaylistSizeMode() {

    if (!sizeMode) {
        return;
    }


    const mode =
        sizeMode.value;


    if (mode === "duration") {

        durationSetting?.classList.remove(
            "hidden"
        );


        songCountSetting?.classList.add(
            "hidden"
        );

    } else {

        songCountSetting?.classList.remove(
            "hidden"
        );


        durationSetting?.classList.add(
            "hidden"
        );

    }

}


if (sizeMode) {

    sizeMode.addEventListener(
        "change",
        updatePlaylistSizeMode
    );

}


// Run immediately when page loads.
updatePlaylistSizeMode();


// =====================================================
// CONVERT SIZE SETTING INTO TARGET SONG COUNT
// =====================================================
//
// Spotify playlist generation ultimately needs a number
// of tracks.
//
// For duration mode we estimate:
// approximately 2.5 songs per minute.
//
// Examples:
//
// 30 min  -> ~75 songs
// 45 min  -> ~112 songs
// 60 min  -> ~150 songs
// 90 min  -> ~225 songs
// 120 min -> ~300 songs
//
// We also cap the result at 100 because Spotify playlist
// generation shouldn't attempt to create an enormous
// playlist from the current UI.
// =====================================================

function getTargetSongCount() {

    if (!sizeMode) {

        return 50;

    }


    if (
        sizeMode.value ===
        "duration"
    ) {

        const minutes =
            parseInt(
                playlistDuration?.value || "45",
                10
            );


        const estimated =
            Math.round(
                minutes * 2.5
            );


        return Math.min(
            Math.max(
                estimated,
                1
            ),
            100
        );

    }


    const count =
        parseInt(
            songCount?.value || "50",
            10
        );


    return Math.min(
        Math.max(
            count,
            1
        ),
        100
    );

}


// =====================================================
// INTENTION BUTTONS
// =====================================================

intentionButtons.forEach(button => {

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
                button.innerText.trim();

        }
    );

});


// =====================================================
// HERO BUTTON SUPPORT
// =====================================================
//
// Your current HTML has a duplicate loginBtn rather than
// a startBtn.
//
// This means the loginButtons NodeList above handles it.
//
// This block also supports startBtn if you later change
// the HTML to use that ID.
// =====================================================

if (startBtn) {

    startBtn.addEventListener(
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


// =====================================================
// GENERATE PLAYLIST BUTTON
// =====================================================

if (generateBtn) {

    generateBtn.addEventListener(
        "click",
        generatePlaylist
    );

}


// =====================================================
// GENERATE PLAYLIST
// =====================================================

async function generatePlaylist() {

    if (!spotifyAccessToken) {

        showError(
            "Connect your Spotify account first."
        );

        return;

    }


    // -----------------------------------------
    // Selected libraries
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
                    checkbox.dataset.id === "liked"

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
    // Anchor songs
    // -----------------------------------------

    const anchorTracks =
        Array.from(
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
                    checkbox.dataset.image || null

            })
        );


    // -----------------------------------------
    // TARGET SIZE
    // -----------------------------------------

    const targetSize =
        getTargetSongCount();


    console.log(
        "[GenPlaylist] Target songs:",
        targetSize
    );


    // -----------------------------------------
    // Loading state
    // -----------------------------------------

    loadingSection?.classList.remove(
        "hidden"
    );


    resultSection?.classList.add(
        "hidden"
    );


    try {

        // -----------------------------------------
        // Build track pool
        // -----------------------------------------

        const pool =
            await buildTrackPool(
                selectedLibraries
            );


        if (
            pool.length === 0
        ) {

            throw new Error(
                "EMPTY_POOL"
            );

        }


        // -----------------------------------------
        // Listening signals
        // -----------------------------------------

        const signals =
            await fetchSignalsWithFallback(
                pool
            );


        // -----------------------------------------
        // Score tracks
        // -----------------------------------------

        const scored =
            scorePool(
                pool,
                signals
            );


        // -----------------------------------------
        // Assemble playlist
        // -----------------------------------------

        const playlist =
            assemblePlaylist(
                scored,
                anchorTracks,
                selectedIntent,
                targetSize
            );


        // -----------------------------------------
        // Render
        // -----------------------------------------

        renderPlaylist(
            playlist
        );


        loadingSection?.classList.add(
            "hidden"
        );


        resultSection?.classList.remove(
            "hidden"
        );


        resultSection?.scrollIntoView({
            behavior: "smooth"
        });


        clearError();


    } catch (error) {

        console.error(
            "[GenPlaylist generation error]",
            error
        );


        loadingSection?.classList.add(
            "hidden"
        );


        if (
            error.message ===
            "AUTH_EXPIRED"
        ) {

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
            friendlyMessageFor(error),
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

                if (source.isLiked) {

                    return spotifyFetchAllPages(
                        "/me/tracks?limit=50"
                    );

                }


                return spotifyFetchAllPages(
                    `/playlists/${source.id}/items?limit=100`
                );

            }
        );


    const results =
        await Promise.allSettled(
            requests
        );


    const tracksById =
        new Map();


    results.forEach(result => {

        if (
            result.status !==
            "fulfilled"
        ) {

            return;

        }


        result.value.forEach(entry => {

            const track =
                entry.item ||
                entry.track ||
                entry;


            if (
                !track ||
                !track.id
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
                            entry.added_at ||
                            null

                    }
                );

            }

        });

    });


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
            shortResult.status === "fulfilled"
                ? (
                    shortResult.value.items || []
                ).map(
                    track => track.id
                )
                : []
        );


    const mediumIds =
        new Set(
            mediumResult.status === "fulfilled"
                ? (
                    mediumResult.value.items || []
                ).map(
                    track => track.id
                )
                : []
        );


    const longIds =
        new Set(
            longResult.status === "fulfilled"
                ? (
                    longResult.value.items || []
                ).map(
                    track => track.id
                )
                : []
        );


    const recentIds =
        new Set(
            recentResult.status === "fulfilled"
                ? (
                    recentResult.value.items || []
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
    // Fallback using added_at
    // -----------------------------------------

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
            );


    if (
        dated.length === 0
    ) {

        return {
            mode: "none"
        };

    }


    const times =
        dated.map(
            item =>
                item.addedAt
        );


    const newest =
        Math.max(...times);


    const oldest =
        Math.min(...times);


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
// SCORE TRACK POOL
// =====================================================

function scorePool(
    pool,
    signals
) {

    return pool.map(track => {

        let recency = 0;

        let dormancy = 0;


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
                1 - recency;

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
    targetSize
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


    // Anchor songs selected by the user that
    // weren't found in the library pool.
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

                    tag:
                        "anchor"

                })
            );


    const remainingPool =
        scored.filter(
            track =>
                !anchorIds.has(
                    track.id
                )
        );


    const remainingSlots =
        Math.max(
            targetSize -
            anchors.length -
            missingAnchors.length,
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
            Math.min(
                remainingSlots,
                remainingPool.length
            )
        );


    return shuffle([

        ...anchors,

        ...missingAnchors,

        ...selectedRest

    ]);

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
            pool[selectedIndex].track;


        pool.splice(
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
        ] =
        [
            array[j],
            array[i]
        ];

    }


    return array;

}


// =====================================================
// RENDER PLAYLIST
// =====================================================

function renderPlaylist(tracks) {

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
                createTrackElement(track)
            );

        }
    );

}


// =====================================================
// CREATE TRACK ELEMENT
// =====================================================

function createTrackElement(track) {

    const container =
        document.createElement("div");


    container.className =
        "track";


    container.dataset.uri =
        track.uri || "";


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
// SAVE GENERATED PLAYLIST TO SPOTIFY
// =====================================================

if (saveSpotifyBtn) {

    saveSpotifyBtn.addEventListener(
        "click",
        savePlaylistToSpotify
    );

}


async function savePlaylistToSpotify() {

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


    const name =
        playlistNameInput?.value.trim() ||
        "GenPlaylist Mix";


    saveSpotifyBtn.disabled =
        true;


    saveSpotifyBtn.textContent =
        "Saving…";


    try {

        const currentUser =
            await spotifyFetch(
                "/me"
            );


        const playlist =
            await createSpotifyPlaylist(
                currentUser.id,
                name
            );


        await addTracksToSpotifyPlaylist(
            playlist.id,
            trackUris
        );


        saveSpotifyBtn.textContent =
            "Saved to Spotify ✓";


        clearError();


        if (
            playlist.external_urls?.spotify
        ) {

            window.open(
                playlist.external_urls.spotify,
                "_blank",
                "noopener,noreferrer"
            );

        }


    } catch (error) {

        console.error(
            "[Spotify save]",
            error
        );


        saveSpotifyBtn.disabled =
            false;


        saveSpotifyBtn.textContent =
            "Save to Spotify";


        if (
            error.message ===
            "AUTH_EXPIRED"
        ) {

            handleAuthExpired();

            return;

        }


        showError(
            friendlyMessageFor(error),
            {
                retry:
                    savePlaylistToSpotify
            }
        );

    }

}


// =====================================================
// CREATE SPOTIFY PLAYLIST
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
// ADD TRACKS TO SPOTIFY PLAYLIST
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

                        uris:
                            chunk

                    })

            }
        );

    }

}


// =====================================================
// SUPABASE
// =====================================================

const SUPABASE_URL =
    "https://nyxawdoedmqtmtoihsmx.supabase.co";


const SUPABASE_ANON_KEY =
    "sb_publishable_vNeLmLSYzA2tgZ3Wz_vX3A_JM5rG_Z3";


let supabaseClient =
    null;


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
// SAVE PLAYLIST TO SUPABASE
// =====================================================

if (saveDbBtn) {

    saveDbBtn.addEventListener(
        "click",
        savePlaylistToDatabase
    );

}


async function savePlaylistToDatabase() {

    const tracks =
        Array.from(
            playlistPreview.querySelectorAll(
                ".track"
            )
        ).map(
            element => ({

                title:
                    element.querySelector(
                        "h4"
                    )?.textContent || "",

                artist:
                    element.querySelector(
                        "span"
                    )?.textContent || ""

            })
        );


    if (
        tracks.length === 0
    ) {

        showError(
            "Generate a playlist first before saving it."
        );

        return;

    }


    if (saveDbBtn) {

        saveDbBtn.disabled =
            true;

        saveDbBtn.textContent =
            "Saving…";

    }


    try {

        const client =
            getSupabaseClient();


        const {
            error
        } =
            await client
                .from(
                    "generated_playlists"
                )
                .insert({

                    playlist_name:
                        playlistNameInput?.value.trim() ||
                        null,

                    intent:
                        selectedIntent,

                    track_count:
                        tracks.length,

                    tracks

                });


        if (error) {

            throw error;

        }


        saveDbBtn.textContent =
            "Saved ✓";


        clearError();


    } catch (error) {

        console.error(
            "[Supabase]",
            error
        );


        if (saveDbBtn) {

            saveDbBtn.disabled =
                false;

            saveDbBtn.textContent =
                "Save Playlist";

        }


        if (
            error.message ===
            "SUPABASE_LIBRARY_MISSING"
        ) {

            showError(
                "Supabase isn't loaded. Add the Supabase JavaScript library to your HTML."
            );

            return;

        }


        showError(
            "Couldn't save your playlist. Please try again.",
            {
                retry:
                    savePlaylistToDatabase
            }
        );

    }

}


// =====================================================
// AUTH EXPIRED
// =====================================================

function handleAuthExpired() {

    spotifyAccessToken =
        null;


    sessionStorage.removeItem(
        "spotify_pkce_verifier"
    );


    setSpotifyDisconnectedState();


    hideDashboard();


    libraryList.innerHTML =
        `
        <p class="placeholder-text">
            Connect to Spotify to see your playlists here.
        </p>
        `;


    songGrid.innerHTML =
        `
        <p class="placeholder-text">
            Connect to Spotify to see your top songs here.
        </p>
        `;


    showError(
        "Your Spotify session expired. Please reconnect.",
        {
            retry:
                redirectToSpotifyLogin
        }
    );

}


// =====================================================
// START APP
// =====================================================

initialiseSpotifyAuth();


// =====================================================
// INITIAL UI STATE
// =====================================================

updatePlaylistSizeMode();

setSpotifyDisconnectedState();

hideDashboard();
