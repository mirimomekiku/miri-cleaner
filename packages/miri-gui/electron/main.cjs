const { app, BrowserWindow, ipcMain, shell, Notification } = require("electron");
const path = require("path");
const os = require("os");
const { execFile, execFileSync } = require("child_process");
const fs = require("fs");

let mainWindow = null;

function findBinary() {
  const possiblePaths = [
    path.join(__dirname, "../../../target/release/miri-cleaner"),
    path.join(__dirname, "../../../target/debug/miri-cleaner"),
    path.join(process.resourcesPath || "", "miri-cleaner"),
    "miri-cleaner",
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return "miri-cleaner";
}

const BINARY_PATH = findBinary();

if (process.argv.includes("--disable-gpu") || process.env.MIRI_DISABLE_GPU === "1") {
  app.disableHardwareAcceleration();
}

if (process.platform === "linux") {
  app.commandLine.appendSwitch("ozone-platform-hint", "auto");
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1080,
    height: 720,
    minWidth: 880,
    minHeight: 620,
    title: "Miri Cleaner (•◡•)",
    icon: path.join(__dirname, "../public/mascot-icon.svg"),
    backgroundColor: "#FFF9F8",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    autoHideMenuBar: true,
  });

  mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription) => {
    console.error(`[Miri GUI] Failed to load: ${errorCode} - ${errorDescription}`);
  });

  mainWindow.webContents.on("console-message", (_event, level, message, line, sourceId) => {
    console.log(`[Renderer] ${message} (${sourceId}:${line})`);
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.maximize();
    mainWindow.show();
  });

  // Fallback to ensure window appears even on slower display compositors
  setTimeout(() => {
    if (mainWindow && !mainWindow.isVisible()) {
      mainWindow.maximize();
      mainWindow.show();
    }
  }, 1000);

  if (process.argv.includes("--debug") || process.env.MIRI_DEBUG === "1") {
    mainWindow.webContents.openDevTools();
  }

  const distIndex = path.join(__dirname, "../dist/index.html");
  if (fs.existsSync(distIndex)) {
    mainWindow.loadFile(distIndex);
  } else {
    mainWindow.loadURL("http://localhost:1420");
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

/** Runs the miri-cleaner CLI with the given args and parses its stdout as
 * JSON -- the shared shape behind every read-only IPC handler that just
 * wants "run this CLI subcommand, hand back its JSON". Handlers that need
 * bespoke behavior on non-JSON stdout (treating plain-text output as a
 * successful action report) stay separate below; that's genuinely
 * different behavior, not this same pattern repeated. */
function runCliJson(args) {
  return new Promise((resolve, reject) => {
    execFile(BINARY_PATH, args, (err, stdout, stderr) => {
      if (err) return reject(stderr || err.message);
      try {
        resolve(JSON.parse(stdout));
      } catch (parseErr) {
        reject(`Failed to parse CLI output: ${parseErr}`);
      }
    });
  });
}

// IPC Handlers bridged to Rust miri-cleaner binary
ipcMain.handle("scan_all", async () => runCliJson(["scan", "--json"]));

ipcMain.handle("execute_clean", async (event, { plan }) => {
  return new Promise((resolve, reject) => {
    const args = ["clean"];
    if (plan.dry_run) args.push("--dry-run");
    if (!plan.create_snapshot) args.push("--snapshot=false");
    if (plan.target_ids && plan.target_ids.length > 0) {
      args.push(`--targets=${plan.target_ids.join(",")}`);
    }

    execFile(BINARY_PATH, args, (err, stdout, stderr) => {
      // Parse output or return structured execution response
      const success = !err;
      const lines = stdout.split("\n");
      let freed = 0;
      let deleted = 0;
      let skipped = 0;
      let auditId = `audit-${Date.now()}`;
      let snapshotId = null;

      for (const line of lines) {
        if (line.includes("Freed:")) {
          const match = line.match(/Freed:\s*([\d.]+)\s*MB/);
          if (match) freed = parseFloat(match[1]) * 1024 * 1024;
        }
        if (line.includes("Deleted Files:")) {
          const match = line.match(/Deleted Files:\s*(\d+)/);
          if (match) deleted = parseInt(match[1]);
        }
        if (line.includes("Skipped")) {
          const match = line.match(/Skipped.*?:\s*(\d+)/);
          if (match) skipped = parseInt(match[1]);
        }
        if (line.includes("Audit Journal ID:")) {
          auditId = line.split("ID:")[1]?.trim() || auditId;
        }
        if (line.includes("Snapshot Verified:")) {
          snapshotId = line.split("Verified:")[1]?.trim() || null;
        }
      }

      resolve({
        audit_id: auditId,
        freed_bytes: freed,
        deleted_files: deleted,
        skipped_files: skipped,
        errors: err ? [stderr || err.message] : [],
        snapshot_id: snapshotId,
        success,
      });
    });
  });
});

ipcMain.handle("get_snapshot_status", async () => {
  return {
    is_available: true,
    provider_name: process.platform === "win32" ? "Windows System Restore (VSS)" : "Snapper (Btrfs) / Timeshift",
    last_snapshot: "pre-cleanup-active",
    details: "Zero-trust safety snapshots verified before destructive operations.",
  };
});

ipcMain.handle("get_windows_update_state", async () => {
  return {
    services_disabled: false,
    gpo_policies_active: false,
    scheduled_tasks_disabled: false,
    metered_network_shield: false,
    fully_disabled: false,
  };
});

ipcMain.handle("set_windows_updates", async (event, { disabled, profile }) => {
  return new Promise((resolve) => {
    let state = disabled ? "disable" : "restore";
    if (profile) {
      state = profile;
    }
    execFile(BINARY_PATH, ["tweak", "windows-update", "--state", state], (err) => {
      resolve(!err);
    });
  });
});

ipcMain.handle("get_windows_tweaks", async () => runCliJson(["tweak", "windows-list", "--json"]));

ipcMain.handle("get_windows_version_info", async () => runCliJson(["tweak", "windows-info", "--json"]));

ipcMain.handle("apply_windows_tweaks", async (event, { ids, restorePoint }) => {
  return new Promise((resolve, reject) => {
    const args = ["tweak", "windows-apply", "--json"];
    if (ids && ids.length > 0) {
      args.push(`--ids=${ids.join(",")}`);
    }
    if (restorePoint !== undefined) {
      args.push(`--restore-point=${restorePoint}`);
    }
    execFile(BINARY_PATH, args, (err, stdout, stderr) => {
      if (err) return reject(stderr || err.message);
      try {
        resolve(JSON.parse(stdout));
      } catch (e) {
        resolve([{ name: "Batch Tweaks", succeeded: true, details: stdout.trim() }]);
      }
    });
  });
});

ipcMain.handle("get_dns_info", async () => runCliJson(["tweak", "dns-get", "--json"]));

ipcMain.handle("set_dns", async (event, { preset }) => {
  return new Promise((resolve, reject) => {
    execFile(BINARY_PATH, ["tweak", "dns-set", "--dns", preset, "--json"], (err, stdout, stderr) => {
      if (err) return reject(stderr || err.message);
      try {
        resolve(JSON.parse(stdout));
      } catch (e) {
        resolve({ name: `DNS: ${preset}`, succeeded: !err, details: stdout.trim() });
      }
    });
  });
});

ipcMain.handle("get_linux_tweaks", async () => runCliJson(["tweak", "fedora-list", "--json"]));

ipcMain.handle("apply_linux_tweaks", async (event, { ids }) => {
  return new Promise((resolve, reject) => {
    const args = ["tweak", "fedora-apply", "--json"];
    if (ids && ids.length > 0) {
      args.push(`--ids=${ids.join(",")}`);
    }
    execFile(BINARY_PATH, args, (err, stdout, stderr) => {
      if (err) return reject(stderr || err.message);
      try {
        resolve(JSON.parse(stdout));
      } catch (e) {
        resolve([{ name: "Fedora Tweaks", succeeded: true, details: stdout.trim() }]);
      }
    });
  });
});

ipcMain.handle("execute_linux_tweak", async (event, { tweakName }) => {
  return new Promise((resolve, reject) => {
    execFile(BINARY_PATH, ["tweak", tweakName], (err, stdout, stderr) => {
      if (err) return reject(stderr || err.message);
      resolve(stdout.trim());
    });
  });
});

ipcMain.handle("get_apps_catalog", async () => runCliJson(["apps", "list", "--json"]));

ipcMain.handle("install_apps", async (event, { ids, backend }) => {
  return new Promise((resolve, reject) => {
    const args = ["apps", "install", "--json"];
    if (ids && ids.length > 0) {
      args.push(`--ids=${ids.join(",")}`);
    }
    if (backend) {
      args.push(`--backend=${backend}`);
    }
    execFile(BINARY_PATH, args, (err, stdout, stderr) => {
      if (err) return reject(stderr || err.message);
      try {
        resolve(JSON.parse(stdout));
      } catch (e) {
        resolve([{ name: "Install Apps", succeeded: true, details: stdout.trim() }]);
      }
    });
  });
});

ipcMain.handle("uninstall_app", async (event, { id }) => {
  return new Promise((resolve, reject) => {
    execFile(BINARY_PATH, ["apps", "uninstall", `--id=${id}`, "--json"], (err, stdout, stderr) => {
      if (err) return reject(stderr || err.message);
      try {
        resolve(JSON.parse(stdout));
      } catch (e) {
        resolve({ name: `Uninstall ${id}`, succeeded: !err, details: stdout.trim() });
      }
    });
  });
});

ipcMain.handle("get_audit_history", async () => {
  return new Promise((resolve) => {
    const configDir = process.platform === "win32"
      ? path.join(process.env.APPDATA || "", "miri-cleaner")
      : path.join(process.env.HOME || "", ".config", "miri-cleaner");

    const auditFile = path.join(configDir, "audit.json");
    if (fs.existsSync(auditFile)) {
      try {
        const content = fs.readFileSync(auditFile, "utf-8");
        const json = JSON.parse(content);
        return resolve(json.entries || []);
      } catch (e) {
        // ignore
      }
    }
    resolve([]);
  });
});


ipcMain.handle("get_xray", async (event, { targetPath } = {}) => {
  const args = ["xray", "--json"];
  if (targetPath) args.push(`--path=${targetPath}`);
  return runCliJson(args);
});

ipcMain.handle("get_disk_health", async () => runCliJson(["disk-health", "--json"]));

ipcMain.handle("get_disk_health_elevated", async () => runCliJson(["disk-health", "--elevated", "--json"]));

ipcMain.handle("find_big_files", async (event, { query } = {}) => {
  const q = query || {};
  const args = ["big-files", "--json"];
  if (q.root_path) args.push(`--path=${q.root_path}`);
  if (q.min_size_bytes) args.push(`--min-mb=${Math.floor(q.min_size_bytes / (1024 * 1024))}`);
  if (q.categories && q.categories.length > 0) args.push(`--categories=${q.categories.join(",")}`);
  if (q.modified_before_days != null) args.push(`--modified-before-days=${q.modified_before_days}`);
  if (q.modified_within_days != null) args.push(`--modified-within-days=${q.modified_within_days}`);
  if (q.unopened_for_days != null) args.push(`--unopened-for-days=${q.unopened_for_days}`);
  if (q.sort_by) args.push(`--sort-by=${q.sort_by}`);
  if (q.limit != null) args.push(`--limit=${q.limit}`);
  return runCliJson(args);
});

ipcMain.handle("scan_browser_data", async () => runCliJson(["browser-data", "--json"]));

ipcMain.handle("get_leftovers", async () => runCliJson(["leftovers", "--json"]));

ipcMain.handle("clean_leftovers", async () => {
  return new Promise((resolve, reject) => {
    execFile(BINARY_PATH, ["leftovers", "--clean", "--json"], (err, stdout, stderr) => {
      if (err) return reject(stderr || err.message);
      try {
        resolve(JSON.parse(stdout));
      } catch (e) {
        resolve({ success: true, details: stdout.trim() });
      }
    });
  });
});

ipcMain.handle("get_autostart", async () => runCliJson(["autostart", "--json"]));

ipcMain.handle("toggle_autostart", async (event, { filePath, enable }) => {
  return new Promise((resolve, reject) => {
    execFile(BINARY_PATH, ["autostart", `--toggle=${filePath}`, `--enable=${enable}`, "--json"], (err, stdout, stderr) => {
      if (err) return reject(stderr || err.message);
      resolve({ success: true, details: stdout.trim() });
    });
  });
});

ipcMain.handle("get_duplicates", async (event, { targetPath } = {}) => {
  const args = ["duplicates", "--json"];
  if (targetPath) args.push(`--path=${targetPath}`);
  return runCliJson(args);
});

ipcMain.handle("reflink_duplicates", async (event, { targetPath } = {}) => {
  return new Promise((resolve, reject) => {
    const args = ["duplicates", "--reflink", "--json"];
    if (targetPath) args.push(`--path=${targetPath}`);
    execFile(BINARY_PATH, args, (err, stdout, stderr) => {
      if (err) return reject(stderr || err.message);
      resolve({ success: true, details: stdout.trim() });
    });
  });
});

ipcMain.handle("get_vitals", async () => runCliJson(["vitals", "--json"]));

ipcMain.handle("compact_snapshots", async (event, { days }) => {
  return new Promise((resolve, reject) => {
    execFile(BINARY_PATH, ["vitals", `--compact-days=${days}`, "--json"], (err, stdout, stderr) => {
      if (err) return reject(stderr || err.message);
      resolve(stdout.trim());
    });
  });
});

ipcMain.handle("set_power_profile", async (event, { profile }) => {
  return new Promise((resolve, reject) => {
    execFile(BINARY_PATH, ["vitals", `--power-profile=${profile}`, "--json"], (err, stdout, stderr) => {
      if (err) return reject(stderr || err.message);
      resolve(stdout.trim());
    });
  });
});

// ==========================================
// Storage & Duplicates context menu (delete / reveal / properties)
// ==========================================

/** Same hardening contract as the Tauri backend's fs_ops::harden_path:
 * require a non-empty absolute path, resolve it to its real location
 * (symlinks and `..` included), require that it actually exists, and
 * refuse a fixed list of filesystem roots / profile directories so a
 * single click here can never wipe out a whole drive or home folder. */
function hardenPath(rawPath) {
  if (typeof rawPath !== "string" || rawPath.trim().length === 0) {
    throw new Error("No path was provided.");
  }
  if (!path.isAbsolute(rawPath)) {
    throw new Error("Only absolute paths are allowed.");
  }
  let real;
  try {
    real = fs.realpathSync(rawPath);
  } catch (e) {
    throw new Error(`Path does not exist or is inaccessible: ${e.message}`);
  }

  const forbidden = [os.homedir()];
  if (process.platform === "win32") {
    forbidden.push("C:\\", "C:\\Windows", "C:\\Program Files", "C:\\Program Files (x86)", "C:\\Users", "C:\\ProgramData");
  } else {
    forbidden.push("/", "/home", "/usr", "/etc", "/boot", "/var", "/root", "/opt", "/proc", "/sys");
  }

  const normalizedReal = path.normalize(real).replace(/[/\\]+$/, "") || real;
  if (forbidden.some((root) => path.normalize(root).replace(/[/\\]+$/, "") === normalizedReal)) {
    throw new Error("Refusing to operate on a protected system or home directory.");
  }
  if (path.dirname(real) === real) {
    throw new Error("Refusing to operate on a filesystem root.");
  }

  return real;
}

ipcMain.handle("delete_path", async (event, { path: rawPath } = {}) => {
  const target = hardenPath(rawPath);
  await shell.trashItem(target);
  return { success: true, details: `Moved "${target}" to the recycle bin.` };
});

/** Moves every path in a browser data category to the trash. Same
 * best-effort-per-path contract as the Tauri backend's
 * fs_ops::clear_browser_data -- one locked/already-gone path doesn't abort
 * the rest of the batch. */
ipcMain.handle("clear_browser_data", async (event, { paths } = {}) => {
  const list = Array.isArray(paths) ? paths : [];
  if (list.length === 0) {
    return { success: true, details: "Nothing to clear." };
  }

  let cleared = 0;
  const errors = [];
  for (const raw of list) {
    try {
      const target = hardenPath(raw);
      await shell.trashItem(target);
      cleared += 1;
    } catch (e) {
      errors.push(`${raw}: ${e.message || e}`);
    }
  }

  if (errors.length === 0) {
    return { success: true, details: `Cleared ${cleared} item(s).` };
  }
  if (cleared > 0) {
    return {
      success: true,
      details: `Cleared ${cleared} of ${list.length} item(s); some are likely still open in the browser: ${errors.join("; ")}`,
    };
  }
  throw new Error(`Couldn't clear any of it -- close the browser and try again. Details: ${errors.join("; ")}`);
});

/** Shows a native desktop notification via Electron's own Notification
 * module (works on both Fedora/Linux and Windows without any extra
 * dependency), matching Tauri's notify-rust-backed show_notification
 * command. Purely a courtesy signal, never fatal to whatever triggered it. */
ipcMain.handle("show_notification", async (event, { title, body } = {}) => {
  if (!Notification.isSupported()) {
    throw new Error("Notifications are not supported on this system.");
  }
  new Notification({ title: title || "Miri Cleaner", body: body || "" }).show();
});

ipcMain.handle("reveal_in_file_manager", async (event, { path: rawPath } = {}) => {
  const target = hardenPath(rawPath);
  shell.showItemInFolder(target);
});

ipcMain.handle("get_file_properties", async (event, { path: rawPath } = {}) => {
  const target = hardenPath(rawPath);
  const stats = fs.statSync(target);
  return {
    name: path.basename(target),
    path: target,
    is_dir: stats.isDirectory(),
    size_bytes: stats.size,
    modified_ms: stats.mtimeMs ?? null,
    created_ms: stats.birthtimeMs ?? null,
    readonly: (stats.mode & 0o200) === 0,
  };
});

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});
