// Probe the quota panel on a DSH instance: open sidebar, click 💰 额度,
// dump the panel text.
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import puppeteer from "puppeteer-core";

const DSH_URL = "http://127.0.0.1:3742";
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const CDP_PORT = 9348;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const profile = mkdtempSync(join(tmpdir(), "dshqh-probe-"));
const edge = spawn(EDGE, [
  `--remote-debugging-port=${CDP_PORT}`,
  `--user-data-dir=${profile}`,
  "--headless=new",
  "about:blank",
], { stdio: "ignore" });

async function connect() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`);
      await response.json();
      return puppeteer.connect({ browserURL: `http://127.0.0.1:${CDP_PORT}` });
    } catch {
      await sleep(500);
    }
  }
  throw new Error("CDP did not come up");
}

try {
  const browser = await connect();
  const page = await browser.newPage();
  await page.goto(DSH_URL, { waitUntil: "domcontentloaded", timeout: 90000 });
  await sleep(8000);

  await page.evaluate(() => {
    const button = [...document.querySelectorAll("button")].find((b) => b.getAttribute("aria-label") === "打开侧边栏");
    button?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
  });
  await sleep(5000);

  const toggleFound = await page.evaluate(() => {
    const button = [...document.querySelectorAll("button")].find((b) => b.textContent.includes("额度"));
    if (!button) return false;
    button.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
    return true;
  });
  console.log("toggle found:", toggleFound);
  await sleep(6000);

  const panel = await page.evaluate(() => {
    const veil = document.querySelector(".dqh_veil");
    if (!veil) return null;
    return veil.textContent.replace(/\s+/g, " ").slice(0, 800);
  });
  console.log("panel:", JSON.stringify(panel));
  const pass = panel !== null && panel.includes("OpenCodeGo") && panel.includes("已用");
  console.log(pass ? "QUOTA PANEL PASS" : "QUOTA PANEL FAIL");
  await browser.close();
} finally {
  edge.kill();
}
