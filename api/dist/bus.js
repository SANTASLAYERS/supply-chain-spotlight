"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QUAKE_HOURLY_KPI_EVENT = exports.QUAKE_KPI_EVENT = exports.KPI_EVENT = exports.bus = void 0;
const events_1 = require("events");
exports.bus = new events_1.EventEmitter();
exports.KPI_EVENT = "kpi_update";
exports.QUAKE_KPI_EVENT = "quake_kpi";
exports.QUAKE_HOURLY_KPI_EVENT = "quake_hourly_kpi";
