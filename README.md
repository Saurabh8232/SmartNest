# SmartNest

SmartNest is a React Native control app for a hybrid IoT backend that serves REST commands and Socket.IO telemetry for the main board, digital board, AC controller, alerts, and dashboard views.

## Stack

- React Native 0.85
- TypeScript
- Socket.IO client
- AsyncStorage for local session and screen cache

## Setup

Update the backend host in [src/config/communication.ts](src/config/communication.ts) before running the app.

### Start the app

```sh
npm install
npm start
```

### Android

```sh
npm run android
```

### iOS

```sh
bundle install
bundle exec pod install
npm run ios
```

## Backend Integration

The app expects a backend that exposes:

- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- Device REST endpoints under `/api/device/:deviceId/...`
- Socket.IO events such as `subscribe`, `device:sensors`, `device:relays`, `device:status`, `command:ack`, and the dashboard/device update events used by the screens

### Authentication

The auth layer stores the current session locally and keeps the Socket.IO token in sync.

- Real backend auth is used when the auth endpoints are available.
- If the auth endpoints are unavailable in a local/mock environment, the app falls back to a demo session so the UI can still run.
- Access token refresh is handled automatically when a request returns `401` and a refresh token is available.

### Realtime behavior

- The socket manager reconnects automatically.
- The app re-subscribes after reconnect.
- Commands that return `cmd_id` should be tracked until `command:ack` arrives.

## Project Structure

```text
SmartNest/
├── App.tsx
├── index.js
├── package.json
├── README.md
├── app.json
├── babel.config.js
├── metro.config.js
├── tsconfig.json
├── android/
├── ios/
├── mock-server/
│   ├── package.json
│   └── server.js
├── src/
│   ├── api/
│   │   └── historyApi.ts
│   ├── authentication/
│   │   ├── AuthContext.tsx
│   │   └── authService.ts
│   ├── components/
│   │   ├── MetricCard.tsx
│   │   ├── MiniChart.tsx
│   │   └── RelayToggle.tsx
│   ├── config/
│   │   └── communication.ts
│   ├── constants/
│   │   └── colors.ts
│   ├── screens/
│   │   ├── AccountScreen.tsx
│   │   ├── AcScreen.tsx
│   │   ├── AlertsScreen.tsx
│   │   ├── DashboardScreen.tsx
│   │   ├── DevicesScreen.tsx
│   │   ├── DigitalBoardScreen.tsx
│   │   ├── HistoryScreen.tsx
│   │   ├── LoginScreen.tsx
│   │   └── MainBoardScreen.tsx
│   ├── socket/
│   │   ├── events.ts
│   │   ├── liveCommunication.ts
│   │   └── SocketManager.ts
│   └── types/
│       └── communication.ts
└── __tests__/
```

## What Each Area Does

- `src/authentication/` keeps the active session, login state, token persistence, and logout flow.
- `src/api/` contains REST-only data loaders, including the history page requests.
- `src/socket/` owns Socket.IO connection setup, subscriptions, and command/event helpers.
- `src/screens/` contains the user-facing pages for dashboard, devices, board controls, AC, alerts, history, login, and account.
- `src/components/` contains shared UI pieces used by multiple screens.
- `mock-server/` is the local backend simulator for testing without the real server.

## Screens

- `LoginScreen` handles authentication entry.
- `DashboardScreen` shows live system summary, alerts, and trend cards.
- `DevicesScreen` lists available devices and routes into the device-specific control screens.
- `MainBoardScreen` manages the main relay board, relay lock state, lighting group, shutdown, and reboot actions.
- `DigitalBoardScreen` manages the digital relay, electrical metrics, and reboot actions.
- `AcScreen` manages AC power, temperature, fan speed, and live telemetry.
- `AlertsScreen` shows unresolved alerts and lets you mark them resolved.
- `AccountScreen` shows the current session and sign-out controls.
- `HistoryScreen` is the analytics/history view and is handled separately because its backend area is still being developed.

## History Page Status

The history page is currently under processing on the backend side.

- The UI is present in [src/screens/HistoryScreen.tsx](src/screens/HistoryScreen.tsx).
- The REST loader lives in [src/api/historyApi.ts](src/api/historyApi.ts).
- The screen currently supports Energy and AC tabs, with Today, 7 Days, 30 Days, and a custom-range placeholder.
- Do not change the history backend contract without permission while processing is still in progress.

## Scripts

- `npm start` - start Metro
- `npm run android` - launch Android
- `npm run ios` - launch iOS
- `npm run serve:db` - start the JSON server
- `npm run serve:socket` - start the mock Socket.IO server
- `npm test` - run Jest
- `npx tsc --noEmit` - typecheck

## Notes

- If you change the backend host or port, update `REST_BASE_URL` and `SOCKET_URL` together.
- The app can fall back to a demo session when the auth backend is unavailable, which is useful for local UI testing.
