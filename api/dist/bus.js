"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KPI_EVENT = exports.bus = void 0;
const events_1 = require("events");
exports.bus = new events_1.EventEmitter();
exports.KPI_EVENT = "kpi_update";
