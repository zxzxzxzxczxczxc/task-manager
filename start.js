const path = require("node:path");
const { spawn } = require("node:child_process");

const targetFile = path.join(__dirname, "index.html");

function openInBrowser(filePath) {
  if (process.platform === "win32") {
    spawn("cmd", ["/c", "start", "", filePath], { stdio: "ignore", detached: true });
    return;
  }

  if (process.platform === "darwin") {
    spawn("open", [filePath], { stdio: "ignore", detached: true });
    return;
  }

  spawn("xdg-open", [filePath], { stdio: "ignore", detached: true });
}

openInBrowser(targetFile);

console.log("Task Manager открыт в браузере.");
