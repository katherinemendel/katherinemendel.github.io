// Strava API configuration
const clientId = '156285';
const clientSecret = 'f4d2d545dfb84d8e0b44c1b91c8ff7ceb11d7245';
const redirectUri = window.location.origin + window.location.pathname;
const authScope = 'activity:read_all';

// DOM Elements
let authorizeButton;
let activitiesContainer;
let loadingSpinner;

// Initialize the Strava integration when the page loads
document.addEventListener('DOMContentLoaded', () => {
    authorizeButton = document.getElementById('strava-authorize');
    activitiesContainer = document.getElementById('strava-activities');
    loadingSpinner = document.getElementById('loading-spinner');
    
    // Check if we have a token in localStorage
    const accessToken = localStorage.getItem('strava_access_token');
    const tokenExpiry = localStorage.getItem('strava_token_expiry');
    
    // Set up the authorize button
    authorizeButton.addEventListener('click', authorizeStrava);
    
    // Check if we're handling an OAuth redirect (code in URL)
    const urlParams = new URLSearchParams(window.location.search);
    const authCode = urlParams.get('code');
    
    if (authCode) {
        // Remove code from URL to prevent sharing
        window.history.replaceState({}, document.title, redirectUri);
        // Exchange the code for a token
        exchangeCodeForToken(authCode);
    } else if (accessToken && tokenExpiry && new Date().getTime() < parseInt(tokenExpiry)) {
        // We have a valid token, hide auth button and fetch activities
        authorizeButton.style.display = 'none';
        fetchStravaActivities(accessToken);
    } else {
        // No token or expired token, show auth button
        authorizeButton.style.display = 'inline-block';
        // Clear any old data
        localStorage.removeItem('strava_access_token');
        localStorage.removeItem('strava_token_expiry');
    }
});

// Function to start the OAuth flow
function authorizeStrava() {
    const authUrl = `https://www.strava.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${authScope}`;
    window.location.href = authUrl;
}

// Exchange authorization code for access token
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
            
            // Hide auth button and fetch activities
            authorizeButton.style.display = 'none';
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
        displayActivities(activities);
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
        
        activityCard.innerHTML = `
            <h3>${activity.name}</h3>
            <p class="activity-date">${formattedDate}</p>
            <p>Type: ${activity.type}</p>
            <p>Distance: ${distanceMiles} miles</p>
            <p>Duration: ${formatDuration(activity.moving_time)}</p>
            ${paceInfo}
        `;
        
        activityList.appendChild(activityCard);
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
    activitiesContainer.innerHTML = `<p class="error-message">${message}</p>`;
}
