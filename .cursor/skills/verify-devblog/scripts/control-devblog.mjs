#!/usr/bin/env node
import { spawn } from "node:child_process";
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, readlinkSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { chromium } from "playwright";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const HOST_DEFAULT = "127.0.0.1";
const PORT_DEFAULT = 43721;
const CDP_PORT_DEFAULT = 43722;
const SHARED_DEV_PORT = 4321;
const BRAND_NEEDLE = "eirik breen";
const HOME_TITLE = "Home — Eirik Breen";
const LAUNCH_TIMEOUT_MS = 60_000;
const COMMANDS = [
  "launch",
  "stop",
  "doctor",
  "env",
  "http",
  "browser"
];

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  allowPositionals: true,
  strict: false,
  options: {
    path: { type: "string" },
    role: { type: "string" },
    name: { type: "string" },
    selector: { type: "string" },
    value: { type: "string" },
    key: { type: "string" },
    timeout: { type: "string" },
    "scope-role": { type: "string" },
    "scope-name": { type: "string" },
    aria: { type: "boolean" },
    "no-follow": { type: "boolean" },
    out: { type: "string" },
    full: { type: "boolean" }
  }
});

const command = positionals[0];
const subcommand = positionals[1];

function fail(message, code = 1) {
  console.error(`control-devblog: ${message}`);
  process.exit(code);
}

function help() {
  console.log(`control-devblog <command>

Commands:
  launch              Start an isolated astro dev server
  stop                Stop the server and browser this run started
  doctor              Read-only check that this run owns a healthy instance
  env                 Print resolved paths, port, and pid
  http get            Fetch a path (status, final url, title, h1)
  browser goto        Open a site path in the persistent Chrome session
  browser click       Click a role/name or selector
  browser visible     Exit 0 if the target is visible
  browser title       Print document.title
  browser url         Print the current page URL
  browser snapshot    Write an ARIA snapshot (--aria) to --path
  browser screenshot  Write a PNG to --path

Flags:
  --path --role --name --selector --scope-role --scope-name
  --no-follow --out --timeout --full

Env:
  VERIFY_RUN_ID   default "default"
  VERIFY_PORT     default ${PORT_DEFAULT} (never ${SHARED_DEV_PORT} unless we started it)
  VERIFY_HOST     default ${HOST_DEFAULT}
  VERIFY_CDP_PORT default ${CDP_PORT_DEFAULT}
  VERIFY_REPO     repo root override
`);
}

function runId() {
  return process.env.VERIFY_RUN_ID || "default";
}

function requestedPort() {
  const raw = process.env.VERIFY_PORT;
  if (!raw) {
    return PORT_DEFAULT;
  }
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    fail(`VERIFY_PORT is not a valid port: ${raw}`);
  }
  return port;
}

function requestedHost() {
  return process.env.VERIFY_HOST || HOST_DEFAULT;
}

function requestedCdpPort() {
  const raw = process.env.VERIFY_CDP_PORT;
  if (!raw) {
    return CDP_PORT_DEFAULT;
  }
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    fail(`VERIFY_CDP_PORT is not a valid port: ${raw}`);
  }
  return port;
}

function findRepoRoot() {
  if (process.env.VERIFY_REPO) {
    return resolve(process.env.VERIFY_REPO);
  }

  const starts = [process.cwd(), SCRIPT_DIR];
  for (const start of starts) {
    let dir = start;
    for (;;) {
      const pkgPath = join(dir, "package.json");
      if (existsSync(pkgPath)) {
        const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
        if (pkg.name === "portfolio-blog") {
          return dir;
        }
      }
      const parent = dirname(dir);
      if (parent === dir) {
        break;
      }
      dir = parent;
    }
  }

  fail("Could not find the portfolio-blog repo root. Set VERIFY_REPO.");
}

function runDir(id) {
  return join("/tmp/devblog-verify", id);
}

function statePath(id) {
  return join(runDir(id), "state.json");
}

function artifactsDir(repoRoot, id) {
  return join(repoRoot, ".cursor/skills/verify-devblog/artifacts", id);
}

function readState() {
  const path = statePath(runId());
  if (!existsSync(path)) {
    return null;
  }
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeState(state) {
  mkdirSync(runDir(state.runId), { recursive: true });
  writeFileSync(statePath(state.runId), `${JSON.stringify(state, null, 2)}\n`);
}

function pidAlive(pid) {
  if (!pid) {
    return false;
  }
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function readCmdline(pid) {
  try {
    return readFileSync(`/proc/${pid}/cmdline`, "utf8").replaceAll("\0", " ").trim();
  } catch {
    return "";
  }
}

function processCwd(pid) {
  try {
    return readlinkSync(`/proc/${pid}/cwd`);
  } catch {
    return "";
  }
}

function sleep(ms) {
  return new Promise((resolveSleep) => {
    setTimeout(resolveSleep, ms);
  });
}

function stripTags(html) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function parseTitle(html) {
  const match = html.match(/<title>([^<]*)<\/title>/i);
  return match ? match[1].trim() : "";
}

function parseH1(html) {
  const match = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  return match ? stripTags(match[1]) : "";
}

function chromeExecutable() {
  const candidates = [
    "/usr/bin/google-chrome-stable",
    "/usr/bin/google-chrome",
    "/usr/local/bin/google-chrome",
    "/opt/google/chrome/chrome"
  ];
  return candidates.find((path) => existsSync(path)) ?? null;
}

function killPid(pid) {
  if (!pidAlive(pid)) {
    return;
  }
  try {
    process.kill(-pid, "SIGTERM");
  } catch {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      return;
    }
  }
}

async function killPidAndWait(pid) {
  if (!pid) {
    return;
  }
  killPid(pid);
  const deadline = Date.now() + 4000;
  while (Date.now() < deadline && pidAlive(pid)) {
    await sleep(100);
  }
  if (!pidAlive(pid)) {
    return;
  }
  try {
    process.kill(-pid, "SIGKILL");
  } catch {
    try {
      process.kill(pid, "SIGKILL");
    } catch {
      // already gone
    }
  }
}

function spawnLogged(commandName, args, { cwd, logFile }) {
  mkdirSync(dirname(logFile), { recursive: true });
  const fd = openSync(logFile, "a");
  const child = spawn(commandName, args, {
    cwd,
    detached: true,
    stdio: ["ignore", fd, fd],
    env: {
      ...process.env,
      ASTRO_TELEMETRY_DISABLED: "1",
      BROWSER: "none"
    }
  });
  child.unref();
  closeSync(fd);
  return child.pid;
}

async function waitForHttp(url, timeoutMs, predicate) {
  const deadline = Date.now() + timeoutMs;
  let lastError = "no response yet";
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { redirect: "follow" });
      const html = await response.text();
      if (predicate(response, html)) {
        return { response, html };
      }
      lastError = `status ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await sleep(250);
  }
  fail(`Timed out waiting for ${url} (${lastError})`);
}

function resolveOutPath(repoRoot, maybePath) {
  if (!maybePath) {
    fail("Missing --path for the output file");
  }
  const resolved = isAbsolute(maybePath) ? maybePath : join(repoRoot, maybePath);
  mkdirSync(dirname(resolved), { recursive: true });
  return resolved;
}

function requireState() {
  const state = readState();
  if (!state) {
    fail(`No run state at ${statePath(runId())}. Run launch first.`);
  }
  return state;
}

function astroLooksLikeOurs(state) {
  if (!pidAlive(state.astroPid)) {
    return false;
  }
  const cmdline = readCmdline(state.astroPid);
  const cwd = processCwd(state.astroPid);
  const cwdOk = !cwd || cwd === state.repoRoot;
  const cmdOk = cmdline.includes("astro") || cmdline.includes("vite");
  return cwdOk && cmdOk;
}

async function commandLaunch() {
  const repoRoot = findRepoRoot();
  const id = runId();
  const port = requestedPort();
  const host = requestedHost();
  const existing = readState();

  if (port === SHARED_DEV_PORT) {
    const weOwnShared = existing && existing.port === SHARED_DEV_PORT && astroLooksLikeOurs(existing);
    if (!weOwnShared) {
      fail(`Refusing VERIFY_PORT=${SHARED_DEV_PORT}. That is the shared default astro port. Use VERIFY_PORT=${PORT_DEFAULT}.`);
    }
  }

  if (existing && astroLooksLikeOurs(existing) && existing.port === port) {
    console.log(`already_running url=${existing.baseUrl} pid=${existing.astroPid}`);
    return;
  }

  if (existing) {
    await killPidAndWait(existing.chromePid);
    if (existing.astroPid && existing.astroPid !== existing.chromePid) {
      await killPidAndWait(existing.astroPid);
    }
  }

  const astroBin = join(repoRoot, "node_modules/.bin/astro");
  if (!existsSync(astroBin)) {
    fail("node_modules/.bin/astro is missing. Run npm install at the repo root first.");
  }

  const dir = runDir(id);
  mkdirSync(dir, { recursive: true });
  mkdirSync(artifactsDir(repoRoot, id), { recursive: true });
  const logPath = join(dir, "astro.log");
  const pid = spawnLogged(process.execPath, [astroBin, "dev", "--host", host, "--port", String(port)], {
    cwd: repoRoot,
    logFile: logPath
  });

  const state = {
    runId: id,
    repoRoot,
    host,
    port,
    cdpPort: requestedCdpPort(),
    baseUrl: `http://${host}:${port}`,
    astroPid: pid,
    chromePid: null,
    logPath,
    chromeLogPath: join(dir, "chrome.log"),
    artifactsDir: artifactsDir(repoRoot, id),
    startedAt: new Date().toISOString()
  };
  writeState(state);

  await waitForHttp(state.baseUrl, LAUNCH_TIMEOUT_MS, (response, html) => {
    return response.ok && parseTitle(html) === HOME_TITLE && html.toLowerCase().includes(BRAND_NEEDLE);
  });

  console.log(`ready url=${state.baseUrl} pid=${state.astroPid} log=${state.logPath}`);
}

async function commandStop() {
  const state = readState();
  if (!state) {
    console.log("nothing_to_stop");
    return;
  }
  await killPidAndWait(state.chromePid);
  await killPidAndWait(state.astroPid);
  const next = {
    ...state,
    astroPid: null,
    chromePid: null,
    stoppedAt: new Date().toISOString()
  };
  writeState(next);
  console.log(`stopped run=${state.runId} artifacts=${state.artifactsDir}`);
}

async function commandDoctor() {
  const state = requireState();
  const errors = [];

  if (state.port === SHARED_DEV_PORT && !astroLooksLikeOurs(state)) {
    errors.push(`port ${SHARED_DEV_PORT} is the shared env server; this run does not own it`);
  }
  if (!astroLooksLikeOurs(state)) {
    errors.push(`astro pid ${state.astroPid} is missing or is not this repo's astro process`);
  }

  let title = "";
  let status = 0;
  try {
    const response = await fetch(state.baseUrl, { redirect: "follow" });
    const html = await response.text();
    status = response.status;
    title = parseTitle(html);
    if (status !== 200) {
      errors.push(`GET / returned ${status}`);
    }
    if (title !== HOME_TITLE) {
      errors.push(`home title was ${JSON.stringify(title)}, expected ${JSON.stringify(HOME_TITLE)}`);
    }
    if (!html.toLowerCase().includes(BRAND_NEEDLE)) {
      errors.push("home HTML is missing the site brand");
    }
    if (!html.includes('aria-label="Primary"')) {
      errors.push("home HTML is missing the Primary nav");
    }
  } catch (error) {
    errors.push(`GET ${state.baseUrl} failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (errors.length > 0) {
    for (const error of errors) {
      console.log(`fail ${error}`);
    }
    process.exit(1);
  }

  console.log(`ok url=${state.baseUrl}`);
  console.log(`ok astroPid=${state.astroPid}`);
  console.log(`ok title=${title}`);
  console.log(`ok brand`);
  console.log(`ok primary_nav`);
  console.log(`ok artifacts=${state.artifactsDir}`);
}

function commandEnv() {
  const repoRoot = findRepoRoot();
  const id = runId();
  const state = readState();
  console.log(`runId=${id}`);
  console.log(`repoRoot=${repoRoot}`);
  console.log(`port=${state?.port ?? requestedPort()}`);
  console.log(`host=${state?.host ?? requestedHost()}`);
  console.log(`baseUrl=${state?.baseUrl ?? `http://${requestedHost()}:${requestedPort()}`}`);
  console.log(`state=${statePath(id)}`);
  console.log(`artifacts=${state?.artifactsDir ?? artifactsDir(repoRoot, id)}`);
  console.log(`astroPid=${state?.astroPid ?? ""}`);
  console.log(`chromePid=${state?.chromePid ?? ""}`);
}

async function commandHttpGet() {
  const state = requireState();
  const path = values.path;
  if (!path || !path.startsWith("/")) {
    fail("http get requires --path starting with /");
  }
  const url = new URL(path, state.baseUrl);
  const response = await fetch(url, {
    redirect: values["no-follow"] ? "manual" : "follow"
  });
  const location = response.headers.get("location") || "";
  let html = "";
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("html") || contentType.includes("text") || contentType === "") {
    html = await response.text();
  }
  const title = parseTitle(html);
  const h1 = parseH1(html);
  console.log(`status=${response.status}`);
  console.log(`url=${response.url || url.href}`);
  console.log(`location=${location}`);
  console.log(`title=${title}`);
  console.log(`h1=${h1}`);
  if (values.out) {
    const outPath = resolveOutPath(state.repoRoot, values.out);
    writeFileSync(
      outPath,
      [
        `status=${response.status}`,
        `url=${response.url || url.href}`,
        `location=${location}`,
        `title=${title}`,
        `h1=${h1}`,
        "",
        html
      ].join("\n")
    );
    console.log(`out=${outPath}`);
  }
}

async function ensureChrome(state) {
  if (state.chromePid && pidAlive(state.chromePid)) {
    try {
      const response = await fetch(`http://127.0.0.1:${state.cdpPort}/json/version`);
      if (response.ok) {
        return state;
      }
    } catch {
      await killPidAndWait(state.chromePid);
    }
  }

  const chrome = chromeExecutable();
  if (!chrome) {
    fail("Google Chrome is not installed. Install Chrome or Chromium, then retry.");
  }

  const profileDir = join(runDir(state.runId), "chrome-profile");
  mkdirSync(profileDir, { recursive: true });
  const chromePid = spawnLogged(
    chrome,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-extensions",
      `--remote-debugging-port=${state.cdpPort}`,
      `--user-data-dir=${profileDir}`,
      "--window-size=1280,800",
      "about:blank"
    ],
    { cwd: state.repoRoot, logFile: state.chromeLogPath }
  );

  const next = { ...state, chromePid };
  writeState(next);

  const deadline = Date.now() + 20_000;
  let lastError = "cdp not up";
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${state.cdpPort}/json/version`);
      if (response.ok) {
        return next;
      }
      lastError = `cdp status ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await sleep(150);
  }
  fail(`Chrome CDP did not start on ${state.cdpPort} (${lastError})`);
}

async function hideDevToolbar(page) {
  await page.addStyleTag({
    content: "astro-dev-toolbar { display: none !important; }"
  }).catch(() => {
    // toolbar is absent on preview/prod
  });
}

async function withPage(fn) {
  const started = requireState();
  if (!astroLooksLikeOurs(started)) {
    fail("doctor would fail: this run does not own a live astro process");
  }
  const state = await ensureChrome(started);
  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${state.cdpPort}`);
  const context = browser.contexts()[0];
  if (!context) {
    fail("Chrome CDP has no default context");
  }
  const page = context.pages()[0] || await context.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });
  await hideDevToolbar(page);
  return await fn(page, state);
}

function timeoutMs() {
  if (!values.timeout) {
    return 10_000;
  }
  const parsed = Number(values.timeout);
  if (!Number.isFinite(parsed) || parsed < 0) {
    fail(`Bad --timeout: ${values.timeout}`);
  }
  return parsed;
}

function targetLocator(page) {
  let root = page;
  if (values["scope-role"]) {
    const scopeName = values["scope-name"];
    if (!scopeName) {
      fail("--scope-role requires --scope-name");
    }
    root = page.getByRole(values["scope-role"], { name: scopeName, exact: true });
  }
  if (values.selector) {
    return root.locator(values.selector);
  }
  if (!values.role) {
    fail("Need --role and --name, or --selector");
  }
  const options = { exact: true };
  if (values.name) {
    options.name = values.name;
  }
  return root.getByRole(values.role, options);
}

async function commandBrowser() {
  switch (subcommand) {
    case "goto":
      await withPage(async (page, state) => {
        const path = values.path;
        if (!path || !path.startsWith("/")) {
          fail("browser goto requires --path starting with /");
        }
        const url = new URL(path, state.baseUrl);
        await page.goto(url.href, { waitUntil: "domcontentloaded", timeout: timeoutMs() });
        await hideDevToolbar(page);
        console.log(`url=${page.url()}`);
        console.log(`title=${await page.title()}`);
      });
      return;
    case "click":
      await withPage(async (page) => {
        const locator = targetLocator(page);
        await locator.click({ timeout: timeoutMs() });
        console.log(`url=${page.url()}`);
        console.log(`title=${await page.title()}`);
      });
      return;
    case "visible":
      await withPage(async (page) => {
        const locator = targetLocator(page).first();
        try {
          await locator.waitFor({ state: "visible", timeout: timeoutMs() });
          console.log("visible=true");
        } catch {
          console.log("visible=false");
          process.exit(1);
        }
      });
      return;
    case "title":
      await withPage(async (page) => {
        console.log(await page.title());
      });
      return;
    case "url":
      await withPage(async (page) => {
        console.log(page.url());
      });
      return;
    case "snapshot":
      await withPage(async (page, state) => {
        const outPath = resolveOutPath(state.repoRoot, values.path);
        let body = "";
        if (values.aria) {
          try {
            body = await page.locator("body").ariaSnapshot();
          } catch {
            body = await page.locator("html").innerText();
          }
        } else {
          body = await page.content();
        }
        writeFileSync(outPath, body.endsWith("\n") ? body : `${body}\n`);
        console.log(`wrote=${outPath}`);
        console.log(`url=${page.url()}`);
      });
      return;
    case "screenshot":
      await withPage(async (page, state) => {
        const outPath = resolveOutPath(state.repoRoot, values.path);
        await page.screenshot({ path: outPath, fullPage: Boolean(values.full) });
        console.log(`wrote=${outPath}`);
        console.log(`url=${page.url()}`);
      });
      return;
    default:
      fail(`Unknown browser subcommand: ${subcommand ?? "(missing)"}. See control-devblog with no args.`, 2);
  }
}

async function main() {
  if (!command || command === "help" || command === "-h" || command === "--help") {
    help();
    process.exit(0);
  }

  switch (command) {
    case "launch":
      await commandLaunch();
      break;
    case "stop":
      await commandStop();
      break;
    case "doctor":
      await commandDoctor();
      break;
    case "env":
      commandEnv();
      break;
    case "http":
      if (subcommand !== "get") {
        fail('http requires "get"', 2);
      }
      await commandHttpGet();
      break;
    case "browser":
      await commandBrowser();
      break;
    default:
      fail(`Unknown command: ${command}. Known: ${COMMANDS.join(", ")}`, 2);
  }

  // Playwright's CDP socket keeps the event loop alive. Exit so each command is
  // one-shot without Browser.close, which would kill the persistent Chrome.
  process.exit(0);
}

main().catch((error) => {
  fail(error instanceof Error ? error.stack || error.message : String(error));
});
