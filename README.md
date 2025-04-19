# TempoTracker

![TempoTracker](https://img.shields.io/badge/TempoTracker-Run%20with%20Music-blue)

A web application that harmonizes your Strava running activities with your Spotify listening history. TempoTracker helps you discover and document what songs powered your best runs.

## Features

- **Dual API Integration**: Seamlessly connects to both Strava and Spotify
- **Activity Matching**: Automatically pairs songs with your runs based on timestamps
- **Music Visualization**: Displays album art and track details alongside your activities
- **One-Click Updates**: Add your run soundtrack to your Strava activity descriptions
- **Smart Song Detection**: Uses an intelligent algorithm to match songs that overlap with your activities

## How It Works

1. **Connect Your Accounts**: Authorize TempoTracker with both your Strava and Spotify accounts
2. **View Your Activities**: See your recent Strava runs displayed with detailed metrics
3. **Discover Your Soundtrack**: For each activity, view the songs that played during your run
4. **Share Your Music**: Add your playlist to your Strava activity description with one click

## Technical Details

### API Integrations

#### Strava API
- OAuth 2.0 Authentication
- Scopes: `activity:read_all`, `activity:write`
- Features: Fetch activities, update descriptions

#### Spotify API
- OAuth 2.0 Authentication
- Scopes: `user-read-recently-played`
- Features: Retrieve listening history, match with activities

## Local Development

To run this project locally:

```bash
# Clone the repository
git clone https://github.com/katherinemendel/katherinemendel.github.io.git
cd katherinemendel.github.io

# Start a local server
python -m http.server 8000
```

Then navigate to `http://127.0.0.1:8000` in your browser.

## Future Enhancements

- Detailed music analysis for pace correlation
- Playlist generation based on your best running songs
- Extended historical data visualization
- Mobile app version