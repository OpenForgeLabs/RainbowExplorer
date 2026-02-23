import fs from "fs";
import path from "path";

const roots = process.argv.slice(2);
const targets = roots.length
  ? roots
  : [path.join(process.cwd(), "apps", "shell", "src")];

const exts = new Set([".ts", ".tsx", ".js", ".jsx"]);
const disallowed = [
  /\btext-(zinc|slate|neutral|gray|stone|blue|emerald|amber|pink|violet)-/g,
  /\bbg-(zinc|slate|neutral|gray|stone|blue|emerald|amber|pink|violet)-/g,
  /\bborder-(zinc|slate|neutral|gray|stone|blue|emerald|amber|pink|violet)-/g,
  /\bring-ring(\/[0-9.]+)?/g,
  /#(?:[0-9a-fA-F]{3,8})/g,
];

const stringLiteral = /(["'`])((?:\\.|(?!\\1).)*)\\1/g;

const walk = (dir, files = []) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const next = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
      walk(next, files);
    } else if (exts.has(path.extname(entry.name))) {
      files.push(next);
    }
  }
  return files;
};

let violations = 0;

for (const target of targets) {
  if (!fs.existsSync(target)) continue;
  const files = walk(target);
  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    let idx = content.indexOf("className");
    while (idx !== -1) {
      const snippet = content.slice(idx, idx + 500);
      let match;
      while ((match = stringLiteral.exec(snippet))) {
        const literal = match[2];
        for (const rule of disallowed) {
          rule.lastIndex = 0;
          const found = rule.exec(literal);
          if (found) {
            violations += 1;
            console.error(
              `Disallowed class token in ${file}: ${found[0]} (near className)`,
            );
            break;
          }
        }
      }
      idx = content.indexOf("className", idx + 9);
    }
  }
}

if (violations > 0) {
  console.error(`Found ${violations} disallowed class token(s).`);
  process.exit(1);
}

console.log("No disallowed class tokens found.");
