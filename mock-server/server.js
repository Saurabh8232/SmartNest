const path = require("path");
const { randomUUID } = require("crypto");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const seed = require(path.join(__dirname, "..", "db.json"));

const app = express();
app.use(cors());
app.use(express.json());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const DEVICE_ID = "SmartNest_001";
const bootTime = Date.now();

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function nowIso() {
  return new Date().toISOString();
}

function nowEpochSeconds() {
  return Math.floor(Date.now() / 1000);
}

function createId(prefix) {
  return `${prefix}-${randomUUID()}`;
}

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeRelay(relay, number, fallbackName) {
  return {
    id: relay.id || `r${number}`,
    name: relay.name || fallbackName || `Relay ${number}`,
    number,
    isOn: Boolean(relay.isOn),
    current: toNumber(relay.current, 0),
    status: relay.status || "normal",
    locked: Boolean(relay.locked),
    runtimeSec: toNumber(relay.runtimeSec, 0),
    power: toNumber(relay.power, 0),
    switchState: relay.switchState || "released",
  };
}

function createDefaultMainBoard() {
  return {
    masterLockEnabled: false,
    shutdownEnabled: false,
    mainCurrent: 4.2,
    mainEnergyKwh: 2.345,
    relays: [
      normalizeRelay({ id: "r1", name: "Living Room Fan", isOn: true, current: 1.2, runtimeSec: 4200 }, 1, "Living Room Fan"),
      normalizeRelay({ id: "r2", name: "Bedroom Light", isOn: false, current: 0, runtimeSec: 1800 }, 2, "Bedroom Light"),
      normalizeRelay({ id: "r3", name: "Kitchen Exhaust", isOn: true, current: 0.8, runtimeSec: 2600 }, 3, "Kitchen Exhaust"),
      normalizeRelay({ id: "r4", name: "Outdoor Lights", isOn: false, current: 0, runtimeSec: 900 }, 4, "Outdoor Lights"),
      normalizeRelay({ id: "r5", name: "Water Pump", isOn: true, current: 2.2, runtimeSec: 6200 }, 5, "Water Pump"),
      normalizeRelay({ id: "r6", name: "Garden Lights", isOn: false, current: 0, runtimeSec: 1200 }, 6, "Garden Lights"),
    ],
  };
}

function createDefaultDigitalBoard() {
  return {
    masterLockEnabled: false,
    digitalCurrent: 0.6,
    digitalEnergyKwh: 0.567,
    relays: [
      normalizeRelay({ id: "d7", name: "Smart Plug 1", isOn: true, current: 0.6, power: 132, runtimeSec: 1300 }, 7, "Smart Plug 1"),
    ],
  };
}

function createDefaultAcStatus() {
  return {
    isOn: false,
    temperature: 24,
    fanSpeed: "auto",
    swingOn: false,
    irBlasterAvailable: true,
    acCurrent: 0,
    acPower: 0,
    acEnergyKwh: 0.235,
    pzemCumulativeEnergyKwh: 10.5,
  };
}

function createDefaultAlerts() {
  return [
    {
      id: "a1",
      type: "electrical",
      code: "OV01",
      title: "High Voltage Detected",
      description: "Voltage exceeded 240V threshold.",
      severity: "warning",
      suggestedSolution: "Check main supply.",
      timestamp: new Date(Date.now() - 300000).toISOString(),
      isResolved: false,
      deviceName: "Main Board",
    },
    {
      id: "a2",
      type: "communication",
      code: "CM01",
      title: "Digital Board Reconnected",
      description: "Lost connection for 30s.",
      severity: "info",
      suggestedSolution: "Monitor for recurring disconnections.",
      timestamp: new Date(Date.now() - 900000).toISOString(),
      isResolved: false,
      deviceName: "Digital Board",
    },
  ];
}

function createDefaultDevices() {
  return [
    {
      id: "dev1",
      name: "Main Board",
      deviceId: DEVICE_ID,
      ipAddress: "192.168.1.101",
      macAddress: "AA:BB:CC:DD:EE:01",
      isOnline: true,
      rssi: -55,
      lastConnected: new Date(Date.now() - 60000).toISOString(),
      type: "main-board",
    },
    {
      id: "dev2",
      name: "AC Controller",
      deviceId: DEVICE_ID,
      ipAddress: "192.168.1.102",
      macAddress: "AA:BB:CC:DD:EE:02",
      isOnline: true,
      rssi: -62,
      lastConnected: new Date(Date.now() - 30000).toISOString(),
      type: "ac-controller",
    },
    {
      id: "dev3",
      name: "Digital Board",
      deviceId: DEVICE_ID,
      ipAddress: "192.168.1.103",
      macAddress: "AA:BB:CC:DD:EE:03",
      isOnline: true,
      rssi: -72,
      lastConnected: new Date(Date.now() - 20000).toISOString(),
      type: "digital-board",
    },
  ];
}

function createDefaultHistory() {
  return {
    filter: "today",
    summary: {
      totalEnergyKwh: 15.84,
      recordCount: 4,
    },
    records: [
      { recordId: 1, epoch: 1750093200, date: "2026-06-12T09:00:00Z", mainEnergyKwh: 10.35, digitalEnergyKwh: 1.40, acEnergyKwh: 2.20, totalEnergyKwh: 13.95 },
      { recordId: 2, epoch: 1750096800, date: "2026-06-12T10:00:00Z", mainEnergyKwh: 10.75, digitalEnergyKwh: 1.50, acEnergyKwh: 2.25, totalEnergyKwh: 14.50 },
      { recordId: 3, epoch: 1750100400, date: "2026-06-12T11:00:00Z", mainEnergyKwh: 11.10, digitalEnergyKwh: 1.55, acEnergyKwh: 2.55, totalEnergyKwh: 15.20 },
      { recordId: 4, epoch: 1750104000, date: "2026-06-12T12:00:00Z", mainEnergyKwh: 11.45, digitalEnergyKwh: 1.60, acEnergyKwh: 2.79, totalEnergyKwh: 15.84 },
    ],
  };
}

function createDefaultDashboard() {
  return {
    voltage: 230.4,
    current: 5.18,
    power: 1192,
    energy: 15.84,
    frequency: 50,
    powerFactor: 0.98,
    humidity: 20,
    temperature: 23,
    voltageHistory: [
      { timestamp: "2026-06-12T09:00:00Z", value: 229.1 },
      { timestamp: "2026-06-12T10:00:00Z", value: 228.4 },
      { timestamp: "2026-06-12T11:00:00Z", value: 230.0 },
      { timestamp: "2026-06-12T12:00:00Z", value: 230.8 },
    ],
    powerHistory: [
      { timestamp: "2026-06-12T09:00:00Z", value: 1100 },
      { timestamp: "2026-06-12T10:00:00Z", value: 1117 },
      { timestamp: "2026-06-12T11:00:00Z", value: 1196 },
      { timestamp: "2026-06-12T12:00:00Z", value: 1210 },
    ],
    energyHistory: [
      { timestamp: "2026-06-12T09:00:00Z", value: 13.95 },
      { timestamp: "2026-06-12T10:00:00Z", value: 14.5 },
      { timestamp: "2026-06-12T11:00:00Z", value: 15.2 },
      { timestamp: "2026-06-12T12:00:00Z", value: 15.84 },
    ],
    currentHistory: [
      { timestamp: "2026-06-12T09:00:00Z", value: 4.8 },
      { timestamp: "2026-06-12T10:00:00Z", value: 4.9 },
      { timestamp: "2026-06-12T11:00:00Z", value: 5.2 },
      { timestamp: "2026-06-12T12:00:00Z", value: 5.3 },
    ],
    totalDevices: 3,
    activeRelays: 4,
    totalCurrent: 3.68,
    systemOnline: true,
    lastUpdated: "2026-06-12T14:30:00Z",
  };
}

const mainBoard = deepClone(seed.mainBoard || seed["main-board"] || createDefaultMainBoard());
const digitalBoard = deepClone(seed.digitalBoard || seed["digital-board"] || createDefaultDigitalBoard());
const acStatus = deepClone(seed.ac || createDefaultAcStatus());
const alerts = deepClone(seed.alerts || createDefaultAlerts());
const devices = deepClone(seed.devices || createDefaultDevices());
const history = deepClone(seed.history || createDefaultHistory());
const dashboardSeed = deepClone(seed.dashboard || createDefaultDashboard());
const authUsers = deepClone(seed.auth?.users || [{ username: "admin", password: "password123", name: "Admin" }]);

const sessionsByAccessToken = new Map();
const sessionsByRefreshToken = new Map();

let voltage = dashboardSeed.voltage;
let temperature = dashboardSeed.temperature;
let humidity = dashboardSeed.humidity;
let dashboardCurrent = dashboardSeed.current;
let dashboardPower = dashboardSeed.power;
let dashboardEnergy = dashboardSeed.energy;
let voltageHistory = deepClone(dashboardSeed.voltageHistory || []);
let powerHistory = deepClone(dashboardSeed.powerHistory || []);
let currentHistory = deepClone(dashboardSeed.currentHistory || []);

function currentMainRelayItems() {
  return mainBoard.relays.map(relay => normalizeRelay(relay, relay.number, relay.name));
}

function currentDigitalRelayItem() {
  const relay = digitalBoard.relays[0] || normalizeRelay({ id: "d7", name: "Smart Plug 1" }, 7, "Smart Plug 1");
  return {
    ...normalizeRelay(relay, 7, "Smart Plug 1"),
    power: toNumber(relay.power, +(toNumber(relay.current, 0) * 220).toFixed(0)),
    switchState: relay.switchState || "released",
  };
}

function getDeviceSensors() {
  return {
    voltage,
    current: {
      main: toNumber(mainBoard.mainCurrent, 0),
      digital: toNumber(digitalBoard.digitalCurrent, 0),
      ac: toNumber(acStatus.acCurrent, 0),
    },
    power: {
      ac: toNumber(acStatus.acPower, 0),
    },
    energy: {
      acKwh: toNumber(acStatus.acEnergyKwh, 0),
      mainKwh: toNumber(mainBoard.mainEnergyKwh, 0),
      digitalKwh: toNumber(digitalBoard.digitalEnergyKwh, 0),
    },
    environment: {
      temperatureC: temperature,
      humidityPct: humidity,
    },
    lastUpdated: nowIso(),
  };
}

function getDeviceRelays() {
  return {
    items: [...currentMainRelayItems(), { ...currentDigitalRelayItem(), number: 7, id: "d7" }].map(relay => ({
      relay: relay.number,
      state: relay.isOn,
      locked: relay.locked,
      runtimeSec: toNumber(relay.runtimeSec, 0),
    })),
    masterLock: Boolean(mainBoard.masterLockEnabled || digitalBoard.masterLockEnabled),
    digitalSwitch: currentDigitalRelayItem().switchState === "pressed",
    lastUpdated: nowIso(),
  };
}

function getDeviceStatus() {
  return {
    uptime: Math.floor((Date.now() - bootTime) / 1000),
    wifi: { ssid: "SmartNestLab", rssi: -54 },
    mqttStatus: 1,
    sd: { ok: true, total: 16000000, used: 4500000 },
    digitalOnline: true,
    pzemOnline: true,
    pzemHealth: true,
    dhtOk: true,
    lastUpdated: nowIso(),
  };
}

function getDashboardData() {
  const activeMainRelays = mainBoard.relays.filter(relay => relay.isOn).length;
  const activeDigitalRelays = digitalBoard.relays.filter(relay => relay.isOn).length;
  const totalCurrent = +(toNumber(mainBoard.mainCurrent, 0) + toNumber(digitalBoard.digitalCurrent, 0)).toFixed(2);

  return {
    systemOnline: true,
    totalDevices: devices.length,
    activeRelays: activeMainRelays + activeDigitalRelays,
    totalCurrent,
    voltage,
    current: totalCurrent,
    power: dashboardPower,
    energy: dashboardEnergy,
    frequency: 50.0,
    powerFactor: 0.98,
    lastUpdated: nowIso(),
    voltageHistory,
    powerHistory,
    energyHistory: (history.records || []).map(record => ({ timestamp: record.date, value: record.totalEnergyKwh })),
    currentHistory,
    temperature,
    humidity,
  };
}

function getMainBoardStatus() {
  return {
    masterLockEnabled: Boolean(mainBoard.masterLockEnabled),
    shutdownEnabled: Boolean(mainBoard.shutdownEnabled),
    mainCurrent: toNumber(mainBoard.mainCurrent, 0),
    mainEnergyKwh: toNumber(mainBoard.mainEnergyKwh, 0),
    relays: currentMainRelayItems().map(relay => ({
      id: relay.id,
      name: relay.name,
      number: relay.number,
      isOn: relay.isOn,
      current: relay.current,
      status: relay.status,
      locked: relay.locked,
    })),
  };
}

function getDigitalBoardStatus() {
  const relay = currentDigitalRelayItem();
  return {
    masterLockEnabled: Boolean(digitalBoard.masterLockEnabled),
    digitalCurrent: toNumber(digitalBoard.digitalCurrent, 0),
    digitalEnergyKwh: toNumber(digitalBoard.digitalEnergyKwh, 0),
    relays: [
      {
        id: relay.id,
        name: relay.name,
        isOn: relay.isOn,
        current: relay.current,
        power: relay.power,
        status: relay.status,
        switchState: relay.switchState,
        locked: relay.locked,
      },
    ],
  };
}

function emitCurrentState(target = io) {
  const dashboard = getDashboardData();
  const sensors = getDeviceSensors();
  const relays = getDeviceRelays();
  const status = getDeviceStatus();

  target.emit("dashboard:update", dashboard);
  target.emit("device:sensors", sensors);
  target.emit("device:relays", relays);
  target.emit("device:status", status);
  target.emit("main-board:update", getMainBoardStatus());
  target.emit("digital-board:update", getDigitalBoardStatus());
  target.emit("ac:update", deepClone(acStatus));
  target.emit("devices:update", devices);
  target.emit("alerts:update", alerts);
  target.emit("dashboard-alerts:update", alerts.filter(alert => !alert.isResolved).slice(0, 3));
}

function emitDeviceSnapshots(target = io) {
  emitCurrentState(target);
}

function emitAck(command, cmdId, ok, message) {
  io.emit("command:ack", {
    cmd_id: cmdId,
    command,
    ok,
    message,
    timestamp: nowEpochSeconds(),
  });
}

function queueCommand(command, apply) {
  const cmdId = createId("cmd");
  setTimeout(() => {
    try {
      const result = apply();
      const ok = result?.ok !== false;
      const message = result?.message || `${command} accepted`;
      emitAck(command, cmdId, ok, message);
      emitCurrentState();
    } catch (error) {
      emitAck(command, cmdId, false, error instanceof Error ? error.message : String(error));
    }
  }, 120);
  return cmdId;
}

function setDeviceOnline(type, isOnline) {
  const device = devices.find(entry => entry.type === type);
  if (device) {
    device.isOnline = isOnline;
    device.lastConnected = nowIso();
  }
}

function applyRelayState(relayNo, isOn) {
  if (relayNo >= 1 && relayNo <= 6) {
    const relay = mainBoard.relays.find(entry => entry.number === relayNo);
    if (!relay) return { ok: false, message: `Relay ${relayNo} not found` };
    if (relay.locked || mainBoard.masterLockEnabled) return { ok: false, message: `Relay ${relayNo} is locked` };
    relay.isOn = isOn;
    relay.current = isOn ? +(Math.random() * 2 + 0.3).toFixed(2) : 0;
    relay.runtimeSec = isOn ? relay.runtimeSec + 1 : relay.runtimeSec;
    mainBoard.mainCurrent = +mainBoard.relays.reduce((sum, entry) => sum + toNumber(entry.current, 0), 0).toFixed(2);
    return { ok: true, message: `Relay ${relayNo} set to ${isOn ? "ON" : "OFF"}` };
  }

  if (relayNo === 7) {
    const relay = digitalBoard.relays[0];
    if (!relay) return { ok: false, message: "Digital relay not found" };
    if (relay.locked || digitalBoard.masterLockEnabled) return { ok: false, message: "Digital relay is locked" };
    relay.isOn = isOn;
    relay.current = isOn ? +(Math.random() * 0.8 + 0.1).toFixed(2) : 0;
    relay.power = +(relay.current * 220).toFixed(0);
    relay.runtimeSec = isOn ? relay.runtimeSec + 1 : relay.runtimeSec;
    digitalBoard.digitalCurrent = +digitalBoard.relays.reduce((sum, entry) => sum + toNumber(entry.current, 0), 0).toFixed(2);
    return { ok: true, message: `Digital relay set to ${isOn ? "ON" : "OFF"}` };
  }

  return { ok: false, message: `Relay ${relayNo} not found` };
}

function toggleRelay(relayNo) {
  if (relayNo >= 1 && relayNo <= 6) {
    const relay = mainBoard.relays.find(entry => entry.number === relayNo);
    if (!relay) return { ok: false, message: `Relay ${relayNo} not found` };
    return applyRelayState(relayNo, !relay.isOn);
  }
  if (relayNo === 7) {
    const relay = digitalBoard.relays[0];
    if (!relay) return { ok: false, message: "Digital relay not found" };
    return applyRelayState(relayNo, !relay.isOn);
  }
  return { ok: false, message: `Relay ${relayNo} not found` };
}

function setRelayLock(relayNo, locked) {
  if (relayNo >= 1 && relayNo <= 6) {
    const relay = mainBoard.relays.find(entry => entry.number === relayNo);
    if (!relay) return { ok: false, message: `Relay ${relayNo} not found` };
    relay.locked = Boolean(locked);
    return { ok: true, message: `Relay ${relayNo} ${locked ? "locked" : "unlocked"}` };
  }
  if (relayNo === 7) {
    const relay = digitalBoard.relays[0];
    if (!relay) return { ok: false, message: "Digital relay not found" };
    relay.locked = Boolean(locked);
    return { ok: true, message: `Digital relay ${locked ? "locked" : "unlocked"}` };
  }
  return { ok: false, message: `Relay ${relayNo} not found` };
}

function setMasterLock(enabled) {
  mainBoard.masterLockEnabled = Boolean(enabled);
  digitalBoard.masterLockEnabled = Boolean(enabled);
  return { ok: true, message: `Master lock ${enabled ? "enabled" : "disabled"}` };
}

function setLightingGroupState(isOn) {
  let changed = false;
  mainBoard.relays.forEach(relay => {
    if (relay.number >= 1 && relay.number <= 5 && !relay.locked && !mainBoard.masterLockEnabled) {
      relay.isOn = isOn;
      relay.current = isOn ? +(Math.random() * 2 + 0.3).toFixed(2) : 0;
      relay.runtimeSec = isOn ? relay.runtimeSec + 1 : relay.runtimeSec;
      changed = true;
    }
  });
  mainBoard.mainCurrent = +mainBoard.relays.reduce((sum, entry) => sum + toNumber(entry.current, 0), 0).toFixed(2);
  return { ok: changed, message: changed ? `Lighting group turned ${isOn ? "ON" : "OFF"}` : "No relays changed" };
}

function shutdownAllRelays() {
  mainBoard.shutdownEnabled = true;
  mainBoard.relays.forEach(relay => {
    relay.isOn = false;
    relay.current = 0;
  });
  mainBoard.mainCurrent = 0;
  digitalBoard.relays.forEach(relay => {
    relay.isOn = false;
    relay.current = 0;
    relay.power = 0;
  });
  digitalBoard.digitalCurrent = 0;
  return { ok: true, message: "All relays turned off" };
}

function unlockAllRelays() {
  mainBoard.masterLockEnabled = false;
  digitalBoard.masterLockEnabled = false;
  mainBoard.relays.forEach(relay => { relay.locked = false; });
  digitalBoard.relays.forEach(relay => { relay.locked = false; });
  return { ok: true, message: "All relays unlocked" };
}

function applyAcCommand(body) {
  if (Object.prototype.hasOwnProperty.call(body, "power")) {
    acStatus.isOn = Boolean(body.power);
    if (!acStatus.isOn) {
      acStatus.acCurrent = 0;
      acStatus.acPower = 0;
    } else {
      acStatus.acCurrent = 3.5;
      acStatus.acPower = +(acStatus.acCurrent * voltage).toFixed(1);
    }
    return { ok: true, message: `AC power ${acStatus.isOn ? "on" : "off"}` };
  }

  if (Object.prototype.hasOwnProperty.call(body, "temp")) {
    acStatus.temperature = toNumber(body.temp, acStatus.temperature);
    return { ok: true, message: `AC temperature set to ${acStatus.temperature}` };
  }

  if (body.tempStep === "up") {
    acStatus.temperature = Math.min(30, acStatus.temperature + 1);
    return { ok: true, message: "AC temperature increased" };
  }

  if (body.tempStep === "down") {
    acStatus.temperature = Math.max(16, acStatus.temperature - 1);
    return { ok: true, message: "AC temperature decreased" };
  }

  if (Object.prototype.hasOwnProperty.call(body, "fan")) {
    acStatus.fanSpeed = body.fan;
    return { ok: true, message: `AC fan speed set to ${body.fan}` };
  }

  if (Object.prototype.hasOwnProperty.call(body, "swingOn")) {
    acStatus.swingOn = Boolean(body.swingOn);
    return { ok: true, message: `AC swing ${acStatus.swingOn ? "enabled" : "disabled"}` };
  }

  return { ok: false, message: "Invalid AC payload" };
}

function rebootBoard(board, type) {
  setDeviceOnline(type, false);
  if (board.relays) {
    board.relays.forEach(relay => { relay.status = "offline"; });
  }
  emitCurrentState();
  setTimeout(() => {
    setDeviceOnline(type, true);
    if (board.relays) {
      board.relays.forEach(relay => { relay.status = "normal"; });
    }
    emitCurrentState();
  }, 2500);
  return { ok: true, message: `${type} reboot queued` };
}

function rebootSystem() {
  rebootBoard(mainBoard, "main-board");
  rebootBoard(digitalBoard, "digital-board");
  return { ok: true, message: "System reboot queued" };
}

function resetPzemEnergy() {
  acStatus.acEnergyKwh = 0;
  acStatus.pzemCumulativeEnergyKwh = 0;
  return { ok: true, message: "PZEM energy reset" };
}

function buildEnergyHistory(period) {
  const records = deepClone(history.records || []);
  const normalizedPeriod = period === "weekly" ? "last7days" : period === "monthly" ? "last30days" : period;
  const selectedRecords = normalizedPeriod === "last30days" ? records : normalizedPeriod === "last7days" ? records.slice(0, 7) : records.slice(0, 4);

  return {
    filter: normalizedPeriod === "last7days" ? "7d" : normalizedPeriod === "last30days" ? "30d" : "today",
    summary: {
      totalEnergyKwh: selectedRecords.length ? selectedRecords[selectedRecords.length - 1].totalEnergyKwh : 0,
      recordCount: selectedRecords.length,
    },
    records: selectedRecords,
  };
}

function buildAcHistory() {
  return {
    filter: "today",
    summary: {
      totalEnergyKwh: 0,
      recordCount: 0,
    },
    records: [],
  };
}

function normalizePeriod(period) {
  if (period === "weekly" || period === "last7days" || period === "7d") return "weekly";
  if (period === "monthly" || period === "last30days" || period === "30d") return "monthly";
  return "daily";
}

app.get("/dashboard", (req, res) => {
  res.json(getDashboardData());
});

app.get("/api/device/:deviceId/relays", (req, res) => {
  res.json({
    success: true,
    data: {
      states: currentMainRelayItems().map(relay => relay.isOn).concat(currentDigitalRelayItem().isOn),
      locks: currentMainRelayItems().map(relay => relay.locked).concat(currentDigitalRelayItem().locked),
      masterLock: Boolean(mainBoard.masterLockEnabled || digitalBoard.masterLockEnabled),
      digitalSwitch: currentDigitalRelayItem().switchState === "pressed",
      runtimeSec: currentMainRelayItems().map(relay => relay.runtimeSec).concat(currentDigitalRelayItem().runtimeSec),
    },
  });
});

app.get("/api/history/energy", (req, res) => {
  const period = normalizePeriod(req.query.filter || req.query.period || req.query.range);
  res.json(buildEnergyHistory(period));
});

app.get("/energyHistory", (req, res) => {
  const period = normalizePeriod(req.query.filter || req.query.period || req.query.range);
  res.json(buildEnergyHistory(period));
});

app.get("/api/history/ac", (req, res) => {
  res.json(buildAcHistory());
});

app.get("/acActivityHistory", (req, res) => {
  res.json(buildAcHistory());
});

app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required" });
  }

  const user = authUsers.find(entry => entry.username === username && entry.password === password) || { username };
  const accessToken = `access-${randomUUID()}`;
  const refreshToken = `refresh-${randomUUID()}`;
  sessionsByAccessToken.set(accessToken, { username: user.username, refreshToken });
  sessionsByRefreshToken.set(refreshToken, { username: user.username, accessToken });

  res.json({ accessToken, refreshToken });
});

app.post("/api/auth/refresh", (req, res) => {
  const { refreshToken } = req.body || {};
  const session = sessionsByRefreshToken.get(refreshToken);
  if (!session) {
    return res.status(401).json({ message: "Invalid refresh token" });
  }

  const nextAccessToken = `access-${randomUUID()}`;
  sessionsByAccessToken.delete(session.accessToken);
  session.accessToken = nextAccessToken;
  sessionsByAccessToken.set(nextAccessToken, session);
  sessionsByRefreshToken.set(refreshToken, session);

  res.json({ accessToken: nextAccessToken });
});

app.post("/api/auth/logout", (req, res) => {
  const { refreshToken } = req.body || {};
  const session = sessionsByRefreshToken.get(refreshToken);
  if (session) {
    sessionsByAccessToken.delete(session.accessToken);
    sessionsByRefreshToken.delete(refreshToken);
  }
  res.status(204).send();
});

app.post("/api/device/:deviceId/relays/:relayNo", (req, res) => {
  const relayNo = Number(req.params.relayNo);
  const desired = Boolean(req.body?.state);
  const cmdId = queueCommand("relay_set", () => applyRelayState(relayNo, desired));
  res.status(202).json({ success: true, cmd_id: cmdId, status: "pending" });
});

app.post("/api/device/:deviceId/relays/:relayNo/toggle", (req, res) => {
  const relayNo = Number(req.params.relayNo);
  const cmdId = queueCommand("relay_toggle", () => toggleRelay(relayNo));
  res.status(202).json({ success: true, data: { deviceId: DEVICE_ID, cmd_id: cmdId, status: "pending" } });
});

app.post("/api/device/:deviceId/relays/:relayNo/lock", (req, res) => {
  const relayNo = Number(req.params.relayNo);
  const locked = Boolean(req.body?.locked);
  const cmdId = queueCommand("relay_lock", () => setRelayLock(relayNo, locked));
  res.status(202).json({ success: true, cmd_id: cmdId, status: "pending" });
});

app.post("/api/device/:deviceId/master-lock", (req, res) => {
  const enabled = Boolean(req.body?.state);
  const cmdId = queueCommand("master_lock", () => setMasterLock(enabled));
  res.status(202).json({ success: true, cmd_id: cmdId, status: "pending" });
});

app.post("/api/device/:deviceId/lights", (req, res) => {
  const enabled = Boolean(req.body?.state);
  const cmdId = queueCommand("lighting_group", () => setLightingGroupState(enabled));
  res.status(202).json({ success: true, cmd_id: cmdId, status: "pending" });
});

app.post("/api/device/:deviceId/relays/off", (req, res) => {
  const cmdId = queueCommand("shutdown_all", () => shutdownAllRelays());
  res.status(202).json({ success: true, cmd_id: cmdId, status: "pending" });
});

app.post("/api/device/:deviceId/relays/unlock", (req, res) => {
  const cmdId = queueCommand("unlock_all", () => unlockAllRelays());
  res.status(202).json({ success: true, cmd_id: cmdId, status: "pending" });
});

app.post("/api/device/:deviceId/ac", (req, res) => {
  const cmdId = queueCommand("ac_set", () => applyAcCommand(req.body || {}));
  res.status(202).json({ success: true, cmd_id: cmdId, status: "pending" });
});

app.post("/api/device/:deviceId/slave-reboot", (req, res) => {
  const target = req.body?.target || "digital";
  const cmdId = queueCommand("slave_reboot", () => {
    if (target === "digital") {
      return rebootBoard(digitalBoard, "digital-board");
    }
    return { ok: true, message: `${target} reboot queued` };
  });
  res.status(202).json({ success: true, cmd_id: cmdId, status: "pending" });
});

app.post("/api/device/:deviceId/pzem/reset-energy", (req, res) => {
  const cmdId = queueCommand("pzem_reset", () => resetPzemEnergy());
  res.status(202).json({ success: true, cmd_id: cmdId, status: "pending" });
});

app.post("/api/device/:deviceId/system/reboot", (req, res) => {
  const cmdId = queueCommand("system_reboot", () => rebootSystem());
  res.status(202).json({ success: true, cmd_id: cmdId, status: "pending" });
});

app.get("/api/device/:deviceId/relays/:relayNo", (req, res) => {
  const relayNo = Number(req.params.relayNo);
  const relay = relayNo >= 1 && relayNo <= 6
    ? mainBoard.relays.find(entry => entry.number === relayNo)
    : relayNo === 7
      ? digitalBoard.relays[0]
      : null;

  if (!relay) {
    return res.status(404).json({ success: false, message: "Relay not found" });
  }

  res.json({ success: true, data: relay });
});

io.on("connection", socket => {
  console.log(`✅ Connected: ${socket.id}`);

  socket.on("subscribe", () => {
    emitDeviceSnapshots(socket);
  });

  socket.on("unsubscribe", () => {});
  socket.on("dashboard:request", () => socket.emit("dashboard:update", getDashboardData()));
  socket.on("dashboard-alerts:request", () => socket.emit("dashboard-alerts:update", alerts.filter(alert => !alert.isResolved).slice(0, 3)));
  socket.on("devices:request", () => socket.emit("devices:update", devices));
  socket.on("alerts:request", () => socket.emit("alerts:update", alerts));

  socket.on("main-board:request", () => {
    socket.emit("device:sensors", getDeviceSensors());
    socket.emit("device:relays", getDeviceRelays());
    socket.emit("device:status", getDeviceStatus());
    socket.emit("main-board:update", getMainBoardStatus());
  });

  socket.on("digital-board:request", () => {
    socket.emit("device:sensors", getDeviceSensors());
    socket.emit("device:relays", getDeviceRelays());
    socket.emit("digital-board:update", getDigitalBoardStatus());
  });

  socket.on("ac:request", () => {
    socket.emit("device:sensors", getDeviceSensors());
    socket.emit("ac:update", deepClone(acStatus));
  });

  socket.on("main-board:relay-control", ({ relayId, action }) => {
    const relay = mainBoard.relays.find(entry => entry.id === relayId);
    if (relay && !relay.locked && !mainBoard.masterLockEnabled) {
      relay.isOn = action === "on";
      relay.current = relay.isOn ? +(Math.random() * 2 + 0.3).toFixed(2) : 0;
    }
    mainBoard.mainCurrent = +mainBoard.relays.reduce((sum, entry) => sum + toNumber(entry.current, 0), 0).toFixed(2);
    emitCurrentState();
  });

  socket.on("main-board:lighting-group-control", ({ action }) => {
    setLightingGroupState(action === "on");
    emitCurrentState();
  });

  socket.on("main-board:master-lock", ({ enabled }) => {
    setMasterLock(enabled);
    emitCurrentState();
  });

  socket.on("main-board:relay-lock", ({ relayId, locked }) => {
    const relay = mainBoard.relays.find(entry => entry.id === relayId);
    if (relay) relay.locked = locked;
    emitCurrentState();
  });

  socket.on("main-board:master-shutdown", ({ enabled }) => {
    mainBoard.shutdownEnabled = enabled;
    if (enabled) shutdownAllRelays();
    emitCurrentState();
  });

  socket.on("main-board:reboot", () => {
    rebootBoard(mainBoard, "main-board");
    emitCurrentState();
  });

  socket.on("digital-board:relay-control", ({ relayId, action }) => {
    const relay = digitalBoard.relays.find(entry => entry.id === relayId);
    if (relay && !relay.locked && !digitalBoard.masterLockEnabled) {
      relay.isOn = action === "on";
      relay.current = relay.isOn ? +(Math.random() * 0.8 + 0.1).toFixed(2) : 0;
      relay.power = +(relay.current * 220).toFixed(0);
    }
    digitalBoard.digitalCurrent = +digitalBoard.relays.reduce((sum, entry) => sum + toNumber(entry.current, 0), 0).toFixed(2);
    emitCurrentState();
  });

  socket.on("digital-board:master-lock", ({ enabled }) => {
    digitalBoard.masterLockEnabled = enabled;
    emitCurrentState();
  });

  socket.on("digital-board:relay-lock", ({ relayId, locked }) => {
    const relay = digitalBoard.relays.find(entry => entry.id === relayId);
    if (relay) relay.locked = locked;
    emitCurrentState();
  });

  socket.on("digital-board:reboot", () => {
    rebootBoard(digitalBoard, "digital-board");
    emitCurrentState();
  });

  socket.on("ac:control", ({ action, value }) => {
    applyAcCommand({ [action === "toggle_swing" ? "swingOn" : action]: value });
    if (action === "toggle_swing") {
      acStatus.swingOn = !acStatus.swingOn;
    }
    if (action === "temperature_up") acStatus.temperature = Math.min(30, acStatus.temperature + 1);
    if (action === "temperature_down") acStatus.temperature = Math.max(16, acStatus.temperature - 1);
    if (action === "power_on") acStatus.isOn = true;
    if (action === "power_off") acStatus.isOn = false;
    if (action === "set_temperature") acStatus.temperature = value;
    if (action === "set_fan_speed") acStatus.fanSpeed = value;
    if (acStatus.isOn) {
      acStatus.acCurrent = 3.5;
      acStatus.acPower = +(acStatus.acCurrent * voltage).toFixed(1);
    } else {
      acStatus.acCurrent = 0;
      acStatus.acPower = 0;
    }
    emitCurrentState();
  });

  socket.on("alerts:request", () => socket.emit("alerts:update", alerts));
  socket.on("alerts:resolve", ({ alertId }) => {
    const alert = alerts.find(entry => entry.id === alertId);
    if (alert) alert.isResolved = true;
    emitCurrentState();
  });

  socket.on("disconnect", () => console.log(`❌ Disconnected: ${socket.id}`));
});

setInterval(() => {
  voltage = +(230 + (Math.random() - 0.5) * 2).toFixed(1);
  temperature = +(23 + (Math.random() - 0.5) * 2).toFixed(1);
  humidity = +(20 + (Math.random() - 0.5) * 5).toFixed(1);

  mainBoard.mainCurrent = +mainBoard.relays.reduce((sum, entry) => sum + toNumber(entry.current, 0), 0).toFixed(2);
  mainBoard.mainEnergyKwh = +(toNumber(mainBoard.mainEnergyKwh, 0) + (mainBoard.mainCurrent * voltage) / 3600000).toFixed(4);

  digitalBoard.digitalCurrent = +digitalBoard.relays.reduce((sum, entry) => sum + toNumber(entry.current, 0), 0).toFixed(2);
  digitalBoard.digitalEnergyKwh = +(toNumber(digitalBoard.digitalEnergyKwh, 0) + (digitalBoard.digitalCurrent * voltage) / 3600000).toFixed(4);

  if (acStatus.isOn) {
    acStatus.acCurrent = +(3.5 + (Math.random() - 0.5) * 0.3).toFixed(2);
    acStatus.acPower = +(acStatus.acCurrent * voltage).toFixed(1);
    acStatus.acEnergyKwh = +(toNumber(acStatus.acEnergyKwh, 0) + acStatus.acPower / 3600000).toFixed(4);
    acStatus.pzemCumulativeEnergyKwh = +(toNumber(acStatus.pzemCumulativeEnergyKwh, 0) + acStatus.acPower / 3600000).toFixed(4);
  }

  const ts = nowIso();
  voltageHistory.push({ timestamp: ts, value: voltage });
  powerHistory.push({ timestamp: ts, value: +(voltage * toNumber(mainBoard.mainCurrent, 0) + voltage * toNumber(digitalBoard.digitalCurrent, 0)).toFixed(1) });
  currentHistory.push({ timestamp: ts, value: +(toNumber(mainBoard.mainCurrent, 0) + toNumber(digitalBoard.digitalCurrent, 0) + toNumber(acStatus.acCurrent, 0)).toFixed(2) });
  if (voltageHistory.length > 20) voltageHistory.shift();
  if (powerHistory.length > 20) powerHistory.shift();
  if (currentHistory.length > 20) currentHistory.shift();

  dashboardCurrent = +(toNumber(mainBoard.mainCurrent, 0) + toNumber(digitalBoard.digitalCurrent, 0) + toNumber(acStatus.acCurrent, 0)).toFixed(2);
  dashboardPower = +(voltage * dashboardCurrent).toFixed(1);
  dashboardEnergy = +(toNumber(dashboardEnergy, 0) + dashboardPower / 3600000).toFixed(4);

  emitCurrentState();
}, 3000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`\n🚀 SmartNest Mock Server`);
  console.log(`   Port: ${PORT}`);
  console.log(`   Run: ipconfig to find your PC IP\n`);
});