#!/usr/bin/env node
/**
 * Thin launcher for the built CLI.
 *
 * Kept free of logic so `dist/cli.js` stays the single implementation.
 */

import { main } from "../dist/cli.js";

const code = await main(process.argv.slice(2));
process.exitCode = code;
