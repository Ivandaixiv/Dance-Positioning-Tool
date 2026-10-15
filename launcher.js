const { spawn } = require("child_process");
const electronPath = require("electron");
const path = require("path");

const environment = { ...process.env };
delete environment.ELECTRON_RUN_AS_NODE;

const child = spawn(electronPath, [path.join(__dirname, "main.js")], {
  env: environment,
  stdio: "inherit"
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});

child.on("error", (error) => {
  console.error(error);
  process.exit(1);
});
