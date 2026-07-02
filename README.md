# SmartNest

SmartNest is a React Native control app for a hybrid IoT backend that serves REST commands and Socket.IO telemetry for the main board, digital board, AC controller, alerts, dashboard, devices, and history views.

## Stack

- React Native 0.85
- TypeScript
- Socket.IO client
- AsyncStorage for local session and screen cache
- Express mock server for local testing

## Setup

Update the backend host in [src/config/communication.ts](src/config/communication.ts) before running the app.

For local development you can point the app at the mock server in [mock-server/server.js](mock-server/server.js) and seed data in [db.json](db.json).

### Start the app

```sh
npm install
npm start
```

## Local Mock Backend

The mock backend is useful when the device firmware or real API is unavailable.

Start the mock data API and socket server from the project root:

```sh
npm install
npm run serve:db
npm run serve:socket
```

If you want to run only the socket mock on its own, you can also use the `mock-server/` package directly:

```sh
cd mock-server
npm install
npm start
```

The mock server reads [db.json](db.json) as its seed data and emits live updates for the dashboard, relays, AC status, alerts, devices, and command acknowledgements.

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
- History REST endpoint `GET /api/history/energy?deviceId=...&filter=today|7d|30d`
- Socket.IO events such as `subscribe`, `device:sensors`, `device:relays`, `device:status`, `device:slaves`, `command:ack`, `dashboard:update`, `dashboard-alerts:update`, `devices:update`, `alerts:update`, `main-board:update`, `digital-board:update`, and `ac:update`

### Authentication

The auth layer stores the current session locally and keeps the Socket.IO token in sync.

- Real backend auth is used when the auth endpoints are available.
- If the auth endpoints are unavailable in a local/mock environment, the app falls back to a demo session so the UI can still run.
- Access token refresh is handled automatically when a request returns `401` and a refresh token is available.

### Realtime behavior

- The socket manager reconnects automatically.
- The app re-subscribes after reconnect.
- Commands that return `cmd_id` should be tracked until `command:ack` arrives.
- The mock socket server emits the current device snapshot immediately after a client subscribes.
- Dashboard trend data is composed from the latest live history and sensor snapshots.

## Mock Data Contract

The current mock history contract is:

- `filter`: the active period key returned by the API
- `summary`: `{ totalEnergyKwh, recordCount }`
- `records`: an array of energy rows with `recordId`, `epoch`, `date`, `mainEnergyKwh`, `digitalEnergyKwh`, `acEnergyKwh`, and `totalEnergyKwh`

The AC activity history shape from the older UI is no longer used by the current history screen.

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

## History Page

The history page is implemented in [src/screens/HistoryScreen.tsx](src/screens/HistoryScreen.tsx) and loads data through [src/api/historyApi.ts](src/api/historyApi.ts).

- The current UI shows the Energy tab and keeps the AC tab code commented out for future use.
- Supported periods are Today, 7 Days, 30 Days, plus a custom-range placeholder.
- The current backend response shape is `filter`, `summary`, and `records`.
- If you change the mock history shape, update [src/api/historyApi.ts](src/api/historyApi.ts), [mock-server/server.js](mock-server/server.js), and [db.json](db.json) together.

## Scripts

- `npm start` - start Metro
- `npm run android` - launch Android
- `npm run ios` - launch iOS
- `npm run serve:db` - start the JSON server
- `npm run serve:socket` - start the mock Socket.IO server
- `npm test` - run Jest
- `npx tsc --noEmit` - typecheck

## Useful Files

- [src/config/communication.ts](src/config/communication.ts) controls the backend URL and device ID.
- [src/socket/liveCommunication.ts](src/socket/liveCommunication.ts) owns subscriptions, command helpers, and composed dashboard state.
- [mock-server/server.js](mock-server/server.js) serves the local REST and Socket.IO mock backend.
- [db.json](db.json) provides the seed data used by the mock server.

## Notes

- If you change the backend host or port, update `REST_BASE_URL` and `SOCKET_URL` together.
- The app can fall back to a demo session when the auth backend is unavailable, which is useful for local UI testing.
- The history backend is intentionally kept simple in the mock data so the screens stay aligned with the current app contract.
