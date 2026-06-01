#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { extractGeometryFeatures } from "../extract-geometry-features.js";

const raw = process.argv[2] ?? readFileSync(0, "utf8");
const state = JSON.parse(raw);
const result = extractGeometryFeatures(state);
console.log(JSON.stringify(result, null, 2));
