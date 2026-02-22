import { spawn } from "node:child_process";

const processes = [
  {
    name: "shell",
    color: "\x1b[34m",
    cmd: "pnpm",
    args: ["--dir", "apps/shell", "dev"],
  },
  {
    name: "runner",
    color: "\x1b[36m",
    cmd: "pnpm",
    args: ["--dir", "apps/runner", "dev"],
  },
];

const reset = "\x1b[0m";

const children = processes.map(({ name, color, cmd, args, env }) => {
  const child = spawn(cmd, args, {
    cwd: process.cwd(),
    env: { ...process.env, ...(env ?? {}) },
    stdio: ["inherit", "pipe", "pipe"],
  });

  child.stdout.on("data", (chunk) => {
    process.stdout.write(`${color}[${name}]${reset} ${chunk}`);
  });

  child.stderr.on("data", (chunk) => {
    process.stderr.write(`${color}[${name}]${reset} ${chunk}`);
  });

  child.on("exit", (code) => {
    if (code !== 0) {
      process.stderr.write(`${color}[${name}]${reset} exited with code ${code}\n`);
    }
  });

  return child;
});

const shutdown = () => {
  for (const child of children) {
    child.kill("SIGINT");
  }
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
