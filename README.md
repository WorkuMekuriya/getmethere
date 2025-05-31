# GetMeThere - Navigation App

A React Native navigation app built with Expo that provides real-time navigation with multiple route options, turn-by-turn directions, and offline support.

## Features

- Real-time location tracking with high accuracy
- Interactive map with user heading and speed display
- Destination search with Google Places autocomplete
- Multiple route options (fastest, shortest, scenic)
- Turn-by-turn navigation instructions
- Offline route caching
- Live distance and ETA updates
- Compass mode for navigation
- Multiple map types (standard, satellite, hybrid, terrain)

## Prerequisites

- Node.js (v14 or later)
- npm or yarn
- Expo CLI
- Google Maps API key with the following APIs enabled:
  - Directions API
  - Places API
  - Maps SDK for Android/iOS

## Setup

1. Clone the repository:
```bash
git clone https://github.com/workuMekuriya/getmethere.git
cd getmethere
```

2. Install dependencies:
```bash
yarn install
```

3. Create a `.env` file in the root directory with your Google Maps API key:
```
GOOGLE_MAPS_API_KEY=your_api_key_here
```

4. Start the development server:
```bash
yarn start
```

5. Run on your device:
- Install the Expo Go app on your iOS or Android device
- Scan the QR code from the terminal or Expo Dev Tools
- Or press 'i' for iOS simulator or 'a' for Android emulator

## Architecture

The app follows a clean architecture pattern with the following structure:

```
src/
  ├── components/     # Reusable UI components
  ├── hooks/         # Custom React hooks
  ├── services/      # API and business logic
  ├── store/         # Redux state management
  ├── types/         # TypeScript type definitions
  └── screens/       # Screen components
```

### Key Components

- `Map`: Handles map display, markers, and route visualization
- `SearchBar`: Google Places autocomplete integration
- `NavigationInstructions`: Turn-by-turn directions
- `RouteSelector`: Alternative route selection
- `BottomSheet`: Reusable bottom sheet component

### State Management

The app uses Redux for state management with the following key slices:
- Current location and heading
- Destination and route information
- Navigation state and instructions
- Loading and error states

### Offline Support

The app implements offline caching using AsyncStorage:
- Routes are cached for up to 1 hour
- Cached routes are automatically restored when offline
- Location tracking continues to work offline

## Known Limitations

- Location accuracy depends on device GPS capabilities
- Offline caching is limited to 1 hour
- Some features require an active internet connection
- Background location updates may be limited by OS restrictions

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Google Maps Platform for mapping and navigation APIs
- Expo team for the amazing development platform
- React Native community for the ecosystem 