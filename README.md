# SmartNest

SmartNest is a React Native IoT control application for monitoring and controlling a Smart Home Automation and Energy Monitoring system. The app combines authenticated REST API commands with Socket.IO real-time telemetry for dashboards, device controllers, alerts, and history analytics.

## Technology Stack

- React Native 0.85.3
- React 19.2
- TypeScript
- React Navigation 7
- Socket.IO client
- AsyncStorage
- React Native Safe Area Context
- React Native Vector Icons
- Express and Socket.IO mock backend for local testing

## Current Features

- Login system with session persistence, token refresh, demo fallback for unavailable local auth backends, and loading-state protection against duplicate login requests.
- SmartNest branding on the login and About screens using the app logo asset.
- Safe-area aware bottom navigation for gesture navigation and Android 3-button navigation devices.
- Horizontal swipe navigation between the four primary tabs: Home, Devices, History, and Account.
- Home dashboard with live electrical metrics, trend cards, recent alerts, global unlock, and global shutdown actions.
- Devices module with device cards for Main Board, Digital Board, and AC Controller.
- Main Board controller for relay state, relay locking, lighting group control, reboot, and telemetry.
- Digital Board controller for digital relay control, reboot, and electrical metrics.
- AC Controller for power, temperature up/down, quick temperature presets, fan speed, and AC telemetry.
- History module for energy records, Today / 7 Days / 30 Days filters, custom range placeholder, request cancellation, and downsampled charts.
- Account module with profile/session state, diagnostics items, sign out, and a dedicated About page.
- About page with project description, team members, roles, LinkedIn links, technology stack, organization details, and copyright.
- Real-time connection toast for device online/offline transitions.

## Navigation Overview

- Authentication controls whether the app renders `LoginScreen` or the authenticated tab navigator.
- Bottom tabs: `Home`, `Devices`, `History`, `Account`.
- `Home` contains `Dashboard` and `AllAlerts`.
- `Devices` contains `DeviceList`, `MainBoard`, `AC`, and `DigitalBoard`.
- `Account` contains `AccountMain` and `About`.
- Swipe navigation is enabled only on root-level primary tabs. Nested screens do not swipe between tabs.
- Leaving the Devices tab resets the Devices stack to `DeviceList`, so returning to Devices always shows the device cards.

## REST API Communication

REST calls are centralized through authentication-aware helpers where required.

Expected backend endpoints include:

- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- Device command and snapshot endpoints under `/api/device/:deviceId/...`
- Dashboard trend endpoint: `GET /dashboard`
- History endpoint variants under `/api/history/energy`

The current device ID is configured in [src/config/communication.ts](src/config/communication.ts).

## Socket.IO Communication

Socket communication is managed by [src/socket/SocketManager.ts](src/socket/SocketManager.ts) and [src/socket/liveCommunication.ts](src/socket/liveCommunication.ts).

The app listens for events including:

- `device:sensors`
- `device:relays`
- `device:status`
- `device:slaves`
- `device:connection`
- `command:ack`
- `dashboard:update`
- `dashboard-alerts:update`
- `devices:update`
- `alerts:update`
- `main-board:update`
- `digital-board:update`
- `ac:update`

The socket manager reconnects automatically and re-subscribes after reconnect.

## Environment Configuration

Update [src/config/communication.ts](src/config/communication.ts) for the target backend:

```ts
const API_HOST = "https://smartnest-9k4c.onrender.com";

export const REST_BASE_URL = API_HOST;
export const SOCKET_URL = API_HOST;
export const DEVICE_ID = "SmartNest_001";
```

Use the same host for REST and Socket.IO unless the backend deploys them separately.

## Backend Requirements

The production backend should provide:

- Auth endpoints that return `accessToken` and `refreshToken`.
- Protected REST endpoints that accept `Authorization: Bearer <token>`.
- Device command endpoints for relay, board, global, and AC controls.
- History data with `filter`, `summary`, and `records`.
- Socket.IO events for live sensors, relays, status, slave board state, command acknowledgements, alerts, and device connection status.
- Device payloads compatible with [src/types/communication.ts](src/types/communication.ts).

## Installation

Install dependencies from the project root:

```sh
npm install
```

For iOS, install CocoaPods dependencies:

```sh
cd ios
bundle install
bundle exec pod install
cd ..
```

## Running Locally

Start Metro:

```sh
npm start
```

Run Android debug:

```sh
npm run android
```

Run iOS debug:

```sh
npm run ios
```

## Local Mock Backend

The mock backend is useful when the real API or device firmware is unavailable.

From the project root:

```sh
npm run serve:db
npm run serve:socket
```

The JSON server reads [db.json](db.json). The Socket.IO mock server lives in [mock-server/server.js](mock-server/server.js).

You can also run the mock socket package directly:

```sh
cd mock-server
npm install
npm start
```

## Build Instructions

### Android Debug APK

```sh
cd android
gradlew.bat assembleDebug
```

Output:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

### Android Release APK

```sh
cd android
gradlew.bat assembleRelease
```

Output:

```text
android/app/build/outputs/apk/release/app-release.apk
```

The current release configuration still uses the debug signing config. Configure a production keystore in `android/app/build.gradle` before publishing.

### Android Release Bundle

```sh
cd android
gradlew.bat bundleRelease
```

Output:

```text
android/app/build/outputs/bundle/release/app-release.aab
```

### iOS

Open the workspace in Xcode after installing pods:

```sh
open ios/SmartNest.xcworkspace
```

Select the target scheme, configure signing, and archive from Xcode for release distribution.

## Project Structure

```text
SmartNest/
|-- App.tsx
|-- index.js
|-- package.json
|-- README.md
|-- android/
|-- ios/
|-- mock-server/
|   |-- package.json
|   `-- server.js
|-- src/
|   |-- api/
|   |   `-- historyApi.ts
|   |-- authentication/
|   |   |-- AuthContext.tsx
|   |   `-- authService.ts
|   |-- components/
|   |   |-- MetricCard.tsx
|   |   |-- MiniChart.tsx
|   |   |-- RelayToggle.tsx
|   |   `-- SmartNestLogo.tsx
|   |-- config/
|   |   `-- communication.ts
|   |-- constants/
|   |   `-- colors.ts
|   |-- screens/
|   |   |-- AccountScreen.tsx
|   |   |-- AcScreen.tsx
|   |   |-- AlertsScreen.tsx
|   |   |-- DashboardScreen.tsx
|   |   |-- DevicesScreen.tsx
|   |   |-- DigitalBoardScreen.tsx
|   |   |-- HistoryScreen.tsx
|   |   |-- LoginScreen.tsx
|   |   `-- MainBoardScreen.tsx
|   |-- socket/
|   |   |-- events.ts
|   |   |-- liveCommunication.ts
|   |   `-- SocketManager.ts
|   `-- types/
|       `-- communication.ts
`-- __tests__/
```

## Key Files

- [App.tsx](App.tsx): root navigation, authenticated tabs, safe-area tab bar, swipe navigation, and connection toast.
- [src/config/communication.ts](src/config/communication.ts): REST host, Socket.IO host, and device ID.
- [src/authentication/authService.ts](src/authentication/authService.ts): login, token refresh, logout, and authenticated fetch helper.
- [src/socket/liveCommunication.ts](src/socket/liveCommunication.ts): live state composition, subscriptions, and device command helpers.
- [src/api/historyApi.ts](src/api/historyApi.ts): energy history REST loader and response normalization.
- [mock-server/server.js](mock-server/server.js): local REST and Socket.IO simulator.

## Quality Commands

Typecheck:

```sh
npx tsc --noEmit
```

Lint:

```sh
npm run lint
```

Tests:

```sh
npm test
```

## Known Limitations

- The History custom range control is currently a placeholder and shows a "coming soon" alert.
- The current History UI displays energy records only.
- AC state is inferred from local commands and live sensor current because the backend does not broadcast full AC state over Socket.IO.
- Some dashboard/alert/device socket channels are stubbed until backend events are fully documented.
- Android release signing must be replaced with a production keystore before distribution.
- The default Jest setup may need transform configuration updates for React Navigation ESM packages before tests can run in every environment.

## Handoff Notes

- Keep REST and Socket.IO contracts synchronized with [src/types/communication.ts](src/types/communication.ts).
- Update [src/config/communication.ts](src/config/communication.ts) before testing against a different backend.
- Preserve the Safe Area bottom tab behavior when modifying navigation.
- Do not dispatch stack actions from the tab navigator; reset nested route state from the owning navigator context when needed.
