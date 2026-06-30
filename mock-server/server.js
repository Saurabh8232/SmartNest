const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// ── Mock State ────────────────────────────────────────────────────
let mainBoard = {
  masterLockEnabled: false,
  shutdownEnabled: false,
  totalCurrent: 4.2,
  relays: [
    { id: "r1", name: "Living Room Fan",  number: 1, isOn: true,  current: 1.2, status: "normal", locked: false },
    { id: "r2", name: "Bedroom Light",    number: 2, isOn: false, current: 0.0, status: "normal", locked: false },
    { id: "r3", name: "Kitchen Exhaust",  number: 3, isOn: true,  current: 0.8, status: "normal", locked: false },
    { id: "r4", name: "Outdoor Lights",   number: 4, isOn: false, current: 0.0, status: "normal", locked: false },
    { id: "r5", name: "Water Pump",       number: 5, isOn: true,  current: 2.2, status: "normal", locked: false },
    { id: "r6", name: "Garden Lights",    number: 6, isOn: false, current: 0.0, status: "normal", locked: false },
  ],
};

let digitalBoard = {
  masterLockEnabled: false,
  totalCurrent: 0.6,
  relays: [
    { id: "d1", name: "Smart Plug 1", isOn: true, current: 0.6, power: 132, status: "normal", switchState: "released", locked: false },
    // { id: "d2", name: "Smart Plug 2", isOn: false, current: 0.0, power: 0,   status: "normal", switchState: "released", locked: false },
    // { id: "d3", name: "LED Strip",    isOn: true,  current: 0.5, power: 110, status: "normal", switchState: "released", locked: false },
  ],
};

let acStatus = {
  isOn: false, temperature: 24, mode: "cool", fanSpeed: "auto",
  swingOn: false, irBlasterAvailable: true,
  voltage: 220.4, current: 0.0, power: 0.0, energy: 1.84,
};

let alerts = [
  { id: "a1", type: "electrical",    code: "OV01", title: "High Voltage Detected",      description: "Voltage exceeded 240V threshold.", severity: "warning", suggestedSolution: "Check main supply.",                        timestamp: new Date(Date.now() - 300000).toISOString(), isResolved: false, deviceName: "Main Board"    },
  { id: "a2", type: "communication", code: "CM01", title: "Digital Board Reconnected",  description: "Lost connection for 30s.",          severity: "info",    suggestedSolution: "Monitor for recurring disconnections.",  timestamp: new Date(Date.now() - 900000).toISOString(), isResolved: false, deviceName: "Digital Board" },
];

let devices = [
  { id: "dev1", name: "Main Board",    deviceId: "SN-MB-001", ipAddress: "192.168.1.101", macAddress: "AA:BB:CC:DD:EE:01", isOnline: true, rssi: -55, lastConnected: new Date(Date.now() - 60000).toISOString(),  type: "main-board"    },
  { id: "dev2", name: "AC Controller", deviceId: "SN-AC-001", ipAddress: "192.168.1.102", macAddress: "AA:BB:CC:DD:EE:02", isOnline: true, rssi: -62, lastConnected: new Date(Date.now() - 30000).toISOString(),  type: "ac-controller" },
  { id: "dev3", name: "Digital Board", deviceId: "SN-DB-001", ipAddress: "192.168.1.103", macAddress: "AA:BB:CC:DD:EE:03", isOnline: true, rssi: -72, lastConnected: new Date(Date.now() - 20000).toISOString(),  type: "digital-board" },
];

// ── Live fluctuation ──────────────────────────────────────────────
let voltage = 220.4, current = 2.1, power = 462.0,
    energy = 1.84, temperature = 24.0, humidity = 45.0;
let voltageHistory = [], powerHistory = [], currentHistory = [];

function tick() {
  voltage     = +(220 + (Math.random() - 0.5) * 4).toFixed(1);
  current     = +(2.1 + (Math.random() - 0.5) * 0.5).toFixed(2);
  power       = +(voltage * current).toFixed(1);
  energy      = +(energy + power / 3600000).toFixed(4);
  temperature = +(24 + (Math.random() - 0.5) * 3).toFixed(1);
  humidity    = +(45 + (Math.random() - 0.5) * 6).toFixed(1);

  const ts = new Date().toISOString();
  voltageHistory.push({ timestamp: ts, value: voltage });
  powerHistory.push({ timestamp: ts, value: power });
  currentHistory.push({ timestamp: ts, value: current });
  if (voltageHistory.length > 20) voltageHistory.shift();
  if (powerHistory.length > 20)   powerHistory.shift();
  if (currentHistory.length > 20) currentHistory.shift();

  mainBoard.totalCurrent = +mainBoard.relays.reduce((s, r) => s + r.current, 0).toFixed(2);

  // Simulate random switchState toggles on digital board
  digitalBoard.relays.forEach(r => {
    if (Math.random() < 0.05) {
      r.switchState = r.switchState === "pressed" ? "released" : "pressed";
    }
  });
  digitalBoard.totalCurrent = +digitalBoard.relays.reduce((s, r) => s + r.current, 0).toFixed(2);

  if (acStatus.isOn) {
    acStatus.current = +(3.5 + (Math.random() - 0.5) * 0.3).toFixed(2);
    acStatus.power   = +(acStatus.current * voltage).toFixed(1);
    acStatus.energy  = +(acStatus.energy + acStatus.power / 3600000).toFixed(4);
  }

  io.emit("dashboard:update", getDashboardData());
  io.emit("digital-board:update", digitalBoard);
}
setInterval(tick, 3000);

function getDashboardData() {
  const activeMainRelays = mainBoard.relays.filter(r => r.isOn).length;
  const activeDigitalRelays = digitalBoard.relays.filter(r => r.isOn).length;
  const totalRelayCurrent = +(mainBoard.totalCurrent + digitalBoard.totalCurrent).toFixed(2);

  return {
    systemOnline: true,
    totalDevices: devices.length,
    activeRelays: activeMainRelays + activeDigitalRelays,
    totalCurrent: totalRelayCurrent,
    voltage, current, power, energy,
    frequency: 50.0, powerFactor: 0.92,
    lastUpdated: new Date().toISOString(),
    voltageHistory, powerHistory, currentHistory, energyHistory: [],
    temperature, humidity,
  };
}

// ── Socket Events ─────────────────────────────────────────────────
io.on("connection", (socket) => {
  console.log(`✅ Connected: ${socket.id}`);

  socket.on("dashboard:request",        () => socket.emit("dashboard:update",        getDashboardData()));
  socket.on("dashboard-alerts:request", () => socket.emit("dashboard-alerts:update", alerts.filter(a => !a.isResolved).slice(0, 3)));
  socket.on("devices:request",          () => socket.emit("devices:update",          devices));

  // ── Main Board ──────────────────────────────────────────────────
  socket.on("main-board:request", () => socket.emit("main-board:update", mainBoard));

  socket.on("main-board:relay-control", ({ relayId, action }) => {
    const relay = mainBoard.relays.find(r => r.id === relayId);
    if (relay && !relay.locked && !mainBoard.masterLockEnabled) {
      relay.isOn    = action === "on";
      relay.current = relay.isOn ? +(Math.random() * 2 + 0.3).toFixed(2) : 0;
    }
    mainBoard.totalCurrent = +mainBoard.relays.reduce((s, r) => s + r.current, 0).toFixed(2);
    io.emit("main-board:update", mainBoard);
    io.emit("dashboard:update", getDashboardData());
    console.log(`Main relay ${relayId} → ${action}`);
  });

  socket.on("main-board:master-lock", ({ enabled }) => {
    mainBoard.masterLockEnabled = enabled;
    io.emit("main-board:update", mainBoard);
    console.log(`Main master lock → ${enabled}`);
  });

  // Individual relay lock (Main Board)
  socket.on("main-board:relay-lock", ({ relayId, locked }) => {
    const relay = mainBoard.relays.find(r => r.id === relayId);
    if (relay) relay.locked = locked;
    io.emit("main-board:update", mainBoard);
    console.log(`Main relay ${relayId} lock → ${locked}`);
  });

  // Shutdown: affects ONLY Main Board relays
  socket.on("main-board:master-shutdown", ({ enabled }) => {
    mainBoard.shutdownEnabled = enabled;
    if (enabled) mainBoard.relays.forEach(r => { r.isOn = false; r.current = 0; });
    mainBoard.totalCurrent = +mainBoard.relays.reduce((s, r) => s + r.current, 0).toFixed(2);
    io.emit("main-board:update", mainBoard);
    io.emit("dashboard:update", getDashboardData());
    console.log(`Main shutdown → ${enabled}`);
  });

  // ── Global system controls ──────────────────────────────────────
  socket.on("system:master-unlock-all", () => {
    mainBoard.masterLockEnabled = false;
    mainBoard.relays.forEach(r => { r.locked = false; });
    digitalBoard.masterLockEnabled = false;
    digitalBoard.relays.forEach(r => { r.locked = false; });
    io.emit("main-board:update", mainBoard);
    io.emit("digital-board:update", digitalBoard);
    console.log(`System: master unlock all`);
  });

  socket.on("system:master-shutdown", ({ enabled }) => {
    mainBoard.shutdownEnabled = enabled;
    if (enabled) mainBoard.relays.forEach(r => { r.isOn = false; r.current = 0; });
    mainBoard.totalCurrent = +mainBoard.relays.reduce((s, r) => s + r.current, 0).toFixed(2);
    io.emit("main-board:update", mainBoard);
    io.emit("dashboard:update", getDashboardData());
    console.log(`System shutdown → ${enabled}`);
  });

  // ── One-shot shutdown: turns ALL relays OFF on BOTH boards, no persistent state ──
  socket.on("system:shutdown-all", () => {
    mainBoard.relays.forEach(r => { r.isOn = false; r.current = 0; });
    mainBoard.totalCurrent = 0;
    digitalBoard.relays.forEach(r => { r.isOn = false; r.current = 0; r.power = 0; });
    digitalBoard.totalCurrent = 0;
    io.emit("main-board:update", mainBoard);
    io.emit("digital-board:update", digitalBoard);
    io.emit("dashboard:update", getDashboardData());
    console.log(`System: shutdown-all (one-shot — relays OFF, no lock, controls still work)`);
  });

  // ── Digital Board ───────────────────────────────────────────────
  socket.on("digital-board:request", () => socket.emit("digital-board:update", digitalBoard));

  socket.on("digital-board:relay-control", ({ relayId, action }) => {
    const relay = digitalBoard.relays.find(r => r.id === relayId);
    if (relay && !relay.locked && !digitalBoard.masterLockEnabled) {
      relay.isOn    = action === "on";
      relay.current = relay.isOn ? +(Math.random() * 0.8 + 0.1).toFixed(2) : 0;
      relay.power   = +(relay.current * 220).toFixed(0);
    }
    digitalBoard.totalCurrent = +digitalBoard.relays.reduce((s, r) => s + r.current, 0).toFixed(2);
    io.emit("digital-board:update", digitalBoard);
    io.emit("dashboard:update", getDashboardData());
    console.log(`Digital relay ${relayId} → ${action}`);
  });

  socket.on("digital-board:master-lock", ({ enabled }) => {
    digitalBoard.masterLockEnabled = enabled;
    io.emit("digital-board:update", digitalBoard);
    console.log(`Digital master lock → ${enabled}`);
  });

  // Individual relay lock (Digital Board)
  socket.on("digital-board:relay-lock", ({ relayId, locked }) => {
    const relay = digitalBoard.relays.find(r => r.id === relayId);
    if (relay) relay.locked = locked;
    io.emit("digital-board:update", digitalBoard);
    console.log(`Digital relay ${relayId} lock → ${locked}`);
  });

  // ── AC ──────────────────────────────────────────────────────────
  socket.on("ac:request", () => socket.emit("ac:update", acStatus));

  socket.on("ac:control", ({ action, value }) => {
    if (action === "power_on")          { acStatus.isOn = true; acStatus.current = 3.5; acStatus.power = 770; }
    if (action === "power_off")         { acStatus.isOn = false; acStatus.current = 0; acStatus.power = 0; }
    if (action === "set_temperature")     acStatus.temperature = value;
    if (action === "temperature_up")      acStatus.temperature = Math.min(30, acStatus.temperature + 1);
    if (action === "temperature_down")    acStatus.temperature = Math.max(16, acStatus.temperature - 1);
    if (action === "set_mode")            acStatus.mode = value;
    if (action === "set_fan_speed")       acStatus.fanSpeed = value;
    if (action === "toggle_swing")        acStatus.swingOn = !acStatus.swingOn;
    io.emit("ac:update", acStatus);
    console.log(`AC ${action}`, value ?? "");
  });

  // ── Alerts ──────────────────────────────────────────────────────
  socket.on("alerts:request", () => socket.emit("alerts:update", alerts));
  socket.on("alerts:resolve", ({ alertId }) => {
    const alert = alerts.find(a => a.id === alertId);
    if (alert) alert.isResolved = true;
    io.emit("alerts:update", alerts);
    console.log(`Alert ${alertId} resolved`);
  });

  socket.on("disconnect", () => console.log(`❌ Disconnected: ${socket.id}`));
});

const PORT = 5000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`\n🚀 SmartNest Mock Server`);
  console.log(`   Port: ${PORT}`);
  console.log(`   Run: ipconfig to find your PC IP\n`);
});
