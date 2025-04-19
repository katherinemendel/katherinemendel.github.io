// Strava API configuration
const clientId = '156285';
const clientSecret = 'f4d2d545dfb84d8e0b44c1b91c8ff7ceb11d7245';
const redirectUri = window.location.origin + window.location.pathname;
const authScope = 'activity:read_all,activity:write';

// Spotify API configuration
const spotifyClientId = 'Bbf257ddfc0140dcaf7d70aaab213205';
const spotifyClientSecret = '06f1b3ca4b1644ef99137d6b9cdaa72c';
// For local development use: window.location.origin + window.location.pathname
// For production use the exact URI registered in Spotify Dashboard
const spotifyRedirectUri = "https://katherinemendel.github.io/";
const spotifyAuthScope = 'user-read-recently-played';

// DOM Elements
let authorizeButton;
let logoutButton;
let spotifyAuthorizeButton;
let spotifyLogoutButton;
let activitiesContainer;
let loadingSpinner;

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    authorizeButton = document.getElementById('strava-authorize');
    logoutButton = document.getElementById('strava-logout');
    spotifyAuthorizeButton = document.getElementById('spotify-authorize');
    spotifyLogoutButton = document.getElementById('spotify-logout');
    activitiesContainer = document.getElementById('strava-activities');
    loadingSpinner = document.getElementById('loading-spinner');
    
    // Set up the Strava buttons
    authorizeButton.addEventListener('click', authorizeStrava);
    logoutButton.addEventListener('click', logoutStrava);
    
    // Set up the Spotify buttons
    spotifyAuthorizeButton.addEventListener('click', authorizeSpotify);
    spotifyLogoutButton.addEventListener('click', logoutSpotify);
    
    // Check if we're handling an OAuth redirect (code in URL)
    const urlParams = new URLSearchParams(window.location.search);
    const stravaCode = urlParams.get('code');
    const state = urlParams.get('state');
    
    // Check if we have a valid Strava token
    const stravaToken = localStorage.getItem('strava_access_token');
    const stravaTokenExpiry = localStorage.getItem('strava_token_expiry');
    
    // Check if we have a valid Spotify token
    const spotifyToken = localStorage.getItem('spotify_access_token');
    const spotifyTokenExpiry = localStorage.getItem('spotify_token_expiry');
    
    if (stravaCode) {
        // If state is 'spotify', this is a Spotify callback
        if (state === 'spotify') {
            // Remove code from URL to prevent sharing
            window.history.replaceState({}, document.title, redirectUri);
            // Exchange the code for a Spotify token
            exchangeSpotifyCodeForToken(stravaCode);
        } else {
            // Otherwise it's a Strava callback
            // Remove code from URL to prevent sharing
            window.history.replaceState({}, document.title, redirectUri);
            // Exchange the code for a Strava token
            exchangeCodeForToken(stravaCode);
        }
    } else {
        // Check if we have valid tokens and update button visibility
        function updateButtonVisibility() {
            // Check token validity
            const validStravaToken = stravaToken && stravaTokenExpiry && new Date().getTime() < parseInt(stravaTokenExpiry);
            const validSpotifyToken = spotifyToken && spotifyTokenExpiry && new Date().getTime() < parseInt(spotifyTokenExpiry);
            
            // Update Strava buttons
            authorizeButton.style.display = validStravaToken ? 'none' : 'inline-block';
            logoutButton.style.display = validStravaToken ? 'inline-block' : 'none';
            
            // Update Spotify buttons
            spotifyAuthorizeButton.style.display = validSpotifyToken ? 'none' : 'inline-block';
            spotifyLogoutButton.style.display = validSpotifyToken ? 'inline-block' : 'none';
            
            return { validStravaToken, validSpotifyToken };
        }
        
        // Update button visibility
        const { validStravaToken: hasValidStravaToken, validSpotifyToken: hasValidSpotifyToken } = updateButtonVisibility();
        
        // If we have a valid Strava token, fetch activities
        if (hasValidStravaToken) {
            fetchStravaActivities(stravaToken);
        } else {
            // Clear any old Strava data
            localStorage.removeItem('strava_access_token');
            localStorage.removeItem('strava_token_expiry');
        }
        
        // If no valid Spotify token, clear old data
        if (!hasValidSpotifyToken) {
            localStorage.removeItem('spotify_access_token');
            localStorage.removeItem('spotify_token_expiry');
        }
    }
});

// Function to start the Strava OAuth flow
function authorizeStrava() {
    const authUrl = `https://www.strava.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${authScope}`;
    window.location.href = authUrl;
}

// Function to start the Spotify OAuth flow
function authorizeSpotify() {
    const authUrl = `https://accounts.spotify.com/authorize?client_id=${spotifyClientId}&redirect_uri=${spotifyRedirectUri}&response_type=code&scope=${spotifyAuthScope}&state=spotify`;
    window.location.href = authUrl;
}

// Function to logout from Strava
function logoutStrava() {
    // Clear Strava tokens from localStorage
    localStorage.removeItem('strava_access_token');
    localStorage.removeItem('strava_token_expiry');
    
    // Update UI
    authorizeButton.style.display = 'inline-block';
    logoutButton.style.display = 'none';
    
    // Clear activities display and add styled connect prompt
    activitiesContainer.innerHTML = `
        <div class="connect-prompt">
            <div class="prompt-icon"></div>
            <h3>Tune into your running history</h3>
            <p>Connect your Strava account to view your activities and harmonize them with your Spotify listening history.</p>
        </div>
    `;
    
    // Show confirmation message
    const message = document.createElement('div');
    message.className = 'success-message';
    message.textContent = 'Successfully disconnected from Strava';
    document.querySelector('.strava-container').appendChild(message);
    
    setTimeout(() => {
        message.remove();
    }, 3000);
}

// Function to logout from Spotify
function logoutSpotify() {
    // Clear Spotify tokens from localStorage
    localStorage.removeItem('spotify_access_token');
    localStorage.removeItem('spotify_token_expiry');
    
    // Update UI
    spotifyAuthorizeButton.style.display = 'inline-block';
    spotifyLogoutButton.style.display = 'none';
    
    // Refresh activities display (without song data)
    const stravaToken = localStorage.getItem('strava_access_token');
    if (stravaToken) {
        fetchStravaActivities(stravaToken);
    }
    
    // Show confirmation message
    const message = document.createElement('div');
    message.className = 'success-message';
    message.textContent = 'Successfully disconnected from Spotify';
    document.querySelector('.strava-container').appendChild(message);
    
    setTimeout(() => {
        message.remove();
    }, 3000);
}

// Exchange authorization code for Strava access token
function exchangeCodeForToken(code) {
    showLoading(true);
    
    fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            client_id: clientId,
            client_secret: clientSecret,
            code: code,
            grant_type: 'authorization_code'
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.access_token) {
            // Save token to localStorage
            localStorage.setItem('strava_access_token', data.access_token);
            localStorage.setItem('strava_token_expiry', new Date().getTime() + (data.expires_in * 1000));
            
            // Update button visibility using our consistent function
            updateButtonVisibility();
            fetchStravaActivities(data.access_token);
        } else {
            showError('Failed to authorize with Strava.');
        }
    })
    .catch(error => {
        console.error('Error exchanging code for token:', error);
        showError('Failed to connect to Strava. Please try again later.');
    })
    .finally(() => {
        showLoading(false);
    });
}

// Exchange authorization code for Spotify access token
function exchangeSpotifyCodeForToken(code) {
    showLoading(true);

    
    // This would normally be handled server-side due to the client_secret
    // For demo purposes we're doing it client-side
    const requestBody = new URLSearchParams();
    requestBody.append('grant_type', 'authorization_code');
    requestBody.append('code', code);
    requestBody.append('redirect_uri', spotifyRedirectUri);
    requestBody.append('client_id', spotifyClientId);
    requestBody.append('client_secret', spotifyClientSecret);
    
    fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: requestBody
    })
    .then(response => response.json())
    .then(data => {

        if (data.access_token) {
            // Save token to localStorage
            localStorage.setItem('spotify_access_token', data.access_token);
            localStorage.setItem('spotify_token_expiry', new Date().getTime() + (data.expires_in * 1000));
            
            // Update button visibility using our consistent function
            updateButtonVisibility();
            
            // If we also have a Strava token, re-fetch activities to include songs
            const stravaToken = localStorage.getItem('strava_access_token');
            if (stravaToken) {
                fetchStravaActivities(stravaToken);
            }
        } else {
            showError('Failed to authorize with Spotify.');
        }
    })
    .catch(error => {
        console.error('Error exchanging code for Spotify token:', error);
        showError('Failed to connect to Spotify. Please try again later.');
    })
    .finally(() => {
        showLoading(false);
    });
}

// Fetch athlete's activities from Strava
function fetchStravaActivities(accessToken) {
    showLoading(true);
    
    fetch('https://www.strava.com/api/v3/athlete/activities?per_page=10', {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('API request failed');
        }
        return response.json();
    })
    .then(activities => {
        // After fetching activities, try to get Spotify data if we have a token
        const spotifyToken = localStorage.getItem('spotify_access_token');
        if (spotifyToken) {
            // Fetch Spotify recently played tracks and match with activities
            fetchSpotifyTracksAndMatchActivities(spotifyToken, activities);
        } else {
            // If no Spotify token, just display activities without songs
            displayActivities(activities);
        }
    })
    .catch(error => {
        console.error('Error fetching activities:', error);
        showError('Failed to fetch activities from Strava.');
        // Clear token as it might be invalid
        localStorage.removeItem('strava_access_token');
        localStorage.removeItem('strava_token_expiry');
        authorizeButton.style.display = 'inline-block';
    })
    .finally(() => {
        showLoading(false);
    });
}

// Fetch recently played tracks from Spotify and match with Strava activities
function fetchSpotifyTracksAndMatchActivities(spotifyToken, activities) {
    // Get timestamp from 2 weeks ago (Spotify limit)
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const timestamp = twoWeeksAgo.getTime();
    
    fetch(`https://api.spotify.com/v1/me/player/recently-played?limit=50&after=${timestamp}`, {
        headers: {
            'Authorization': `Bearer ${spotifyToken}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Spotify API request failed');
        }
        return response.json();
    })
    .then(data => {
        if (data.items && data.items.length) {
            // Match songs with activities based on timestamps
            const activitiesWithSongs = matchSongsWithActivities(activities, data.items);
            displayActivities(activitiesWithSongs);
        } else {
            // If no songs found, just display activities
            displayActivities(activities);
        }
    })
    .catch(error => {
        console.error('Error fetching Spotify data:', error);
        // Just display activities without songs
        displayActivities(activities);
        // Spotify token might be invalid
        localStorage.removeItem('spotify_access_token');
        localStorage.removeItem('spotify_token_expiry');
        spotifyAuthorizeButton.style.display = 'inline-block';
    });
}

// Match songs with activities based on timestamps
function matchSongsWithActivities(activities, spotifyItems) {
    console.log('Matching songs with activities');
    console.log('Activities:', activities.length);
    console.log('Spotify items:', spotifyItems.length);
    
    // Average song duration estimate (in milliseconds)
    const averageSongDuration = 3.5 * 60 * 1000; // 3.5 minutes
    
    return activities.map(activity => {
        // Get start and end time of activity
        const startTime = new Date(activity.start_date).getTime();
        const endTime = startTime + (activity.elapsed_time * 1000);
        
        console.log(`Activity: ${activity.name}, Start: ${new Date(startTime).toLocaleString()}, End: ${new Date(endTime).toLocaleString()}, Duration: ${activity.elapsed_time}s`);
        
        // Find songs that could have been playing during the activity
        const songs = spotifyItems.filter(item => {
            // When the song started playing
            const playedAt = new Date(item.played_at).getTime();
            
            // Estimate when the song ended (using average song duration)
            const estimatedSongEnd = playedAt + averageSongDuration;
            
            // Check if there's any overlap between song playing period and activity period
            // Song starts before activity ends AND song ends after activity starts
            return playedAt <= endTime && estimatedSongEnd >= startTime;
        });
        
        console.log(`Found ${songs.length} songs that overlapped with activity: ${activity.name}`);
        
        // Add songs to activity object
        return {
            ...activity,
            songs: songs.map(song => ({
                name: song.track.name,
                artist: song.track.artists.map(artist => artist.name).join(', '),
                albumArt: song.track.album.images[0]?.url,
                uri: song.track.uri
            }))
        };
    });
}

// Update a Strava activity description with song information
function updateActivityDescription(activityId, songs) {
    const accessToken = localStorage.getItem('strava_access_token');
    if (!accessToken) {
        showError('Strava authorization required to update activity description.');
        return;
    }
    
    showLoading(true);
    
    // Create description with songs
    const songsList = songs.map(song => `${song.name} - ${song.artist}`).join('\n');
    const description = `Songs played during this activity:\n\n${songsList}\n\n—Added by TempoTracker`;
    
    fetch(`https://www.strava.com/api/v3/activities/${activityId}`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            description: description
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to update activity');
        }
        return response.json();
    })
    .then(data => {
        // Show success message
        const successMessage = document.createElement('div');
        successMessage.className = 'success-message';
        successMessage.textContent = 'Activity description updated with songs!';
        
        // Replace update button with success message
        const updateButton = document.querySelector(`#update-activity-${activityId}`);
        if (updateButton) {
            updateButton.parentNode.replaceChild(successMessage, updateButton);
        }
    })
    .catch(error => {
        console.error('Error updating activity:', error);
        showError('Failed to update activity description. Please try again.');
    })
    .finally(() => {
        showLoading(false);
    });
}

// Display the activities on the page
function displayActivities(activities) {
    activitiesContainer.innerHTML = '';
    
    if (activities.length === 0) {
        activitiesContainer.innerHTML = '<p>No recent activities found.</p>';
        return;
    }
    
    const activityList = document.createElement('div');
    activityList.className = 'activity-list';
    
    activities.forEach(activity => {
        const activityCard = document.createElement('div');
        activityCard.className = 'activity-card';
        
        // Format the date
        const activityDate = new Date(activity.start_date);
        const formattedDate = activityDate.toLocaleDateString();
        
        // Calculate pace if it's a run (in min/mile)
        let paceInfo = '';
        if (activity.type === 'Run') {
            const paceSeconds = activity.moving_time / (activity.distance / 1609.34); // seconds per mile
            const paceMinutes = Math.floor(paceSeconds / 60);
            const paceRemainingSeconds = Math.floor(paceSeconds % 60);
            paceInfo = `<p>Pace: ${paceMinutes}:${paceRemainingSeconds.toString().padStart(2, '0')} /mile</p>`;
        }
        
        // Convert meters to miles
        const distanceMiles = (activity.distance / 1609.34).toFixed(2);
        
        // Create HTML for activity details
        let activityHTML = `
            <h3>${activity.name}</h3>
            <p class="activity-date">${formattedDate}</p>
            <p>Type: ${activity.type}</p>
            <p>Distance: ${distanceMiles} miles</p>
            <p>Duration: ${formatDuration(activity.moving_time)}</p>
            ${paceInfo}
        `;
        
        // Add songs section if available
        if (activity.songs && activity.songs.length > 0) {
            activityHTML += `
                <div class="songs-container">
                    <h4>Songs Played (${activity.songs.length})</h4>
                    <ul class="songs-list">
            `;
            
            activity.songs.forEach(song => {
                activityHTML += `
                    <li class="song-item">
                        ${song.albumArt ? `<img src="${song.albumArt}" alt="${song.name}" class="album-art">` : ''}
                        <div class="song-details">
                            <strong>${song.name}</strong>
                            <span>${song.artist}</span>
                        </div>
                    </li>
                `;
            });
            
            activityHTML += `
                    </ul>
                    <button id="update-activity-${activity.id}" class="update-button">Add Songs to Activity Description</button>
                </div>
            `;
        } else if (localStorage.getItem('spotify_access_token')) {
            // If we have Spotify token but no songs for this activity
            activityHTML += `
                <div class="songs-container">
                    <p>No songs found for this activity.</p>
                </div>
            `;
        } else {
            // If no Spotify token
            activityHTML += `
                <div class="songs-container">
                    <div class="spotify-connect-prompt">
                        <div class="spotify-prompt-icon"></div>
                        <h4>Add the soundtrack to your run</h4>
                        <p>Connect your Spotify account to discover what songs powered your pace.</p>
                    </div>
                </div>
            `;
        }
        
        activityCard.innerHTML = activityHTML;
        activityList.appendChild(activityCard);
        
        // Add event listener for update button if songs are available
        if (activity.songs && activity.songs.length > 0) {
            setTimeout(() => {
                const updateButton = document.getElementById(`update-activity-${activity.id}`);
                if (updateButton) {
                    updateButton.addEventListener('click', () => {
                        updateActivityDescription(activity.id, activity.songs);
                    });
                }
            }, 0);
        }
    });
    
    activitiesContainer.appendChild(activityList);
}

// Format seconds into HH:MM:SS
function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return [
        hours > 0 ? hours : '',
        minutes.toString().padStart(hours > 0 ? 2 : 1, '0'),
        secs.toString().padStart(2, '0')
    ].filter(Boolean).join(':');
}

// Show/hide loading spinner
function showLoading(isLoading) {
    loadingSpinner.style.display = isLoading ? 'block' : 'none';
}

// Show error message
function showError(message) {
    const errorElement = document.createElement('div');
    errorElement.className = 'error-message';
    errorElement.textContent = message;
    
    // Add the error to the activities container
    activitiesContainer.innerHTML = '';
    activitiesContainer.appendChild(errorElement);
}
