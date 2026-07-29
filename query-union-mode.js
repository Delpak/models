const fs = require("fs");
const path = require("path");

const rootDir = process.argv[2] ? path.resolve(process.argv[2]) : __dirname;
const providersDir = path.join(rootDir, "providers");
const modes = new Set();

function cleanScalar(value) {
  let text = value.trim();

  if (
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith("'") && text.endsWith("'"))
  ) {
    return text.slice(1, -1);
  }

  const commentStart = text.indexOf(" #");
  if (commentStart !== -1) {
    text = text.slice(0, commentStart).trim();
  }

  return text;
}

function parseModeValues(content) {
  const lines = content.split(/\r?\n/);
  const values = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const match = line.match(/^(mode|supportedModes):\s*(.*)$/);

    if (!match) {
      continue;
    }

    const rawValue = match[2].trim();
    if (!rawValue) {
      for (let next = index + 1; next < lines.length; next += 1) {
        const nextLine = lines[next];

        if (/^\S/.test(nextLine)) {
          break;
        }

        const item = nextLine.match(/^\s*-\s*(.+?)\s*$/);
        if (item) {
          values.push(cleanScalar(item[1]));
        }
      }

      continue;
    }

    if (rawValue.startsWith("[") && rawValue.endsWith("]")) {
      values.push(
        ...rawValue
          .slice(1, -1)
          .split(",")
          .map(cleanScalar)
          .filter(Boolean),
      );
      continue;
    }

    values.push(...[cleanScalar(rawValue)].filter(Boolean));
  }

  return values;
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }

    if (!entry.isFile() || !entry.name.endsWith(".yaml")) {
      continue;
    }

    for (const mode of parseModeValues(fs.readFileSync(fullPath, "utf8"))) {
      modes.add(mode);
    }
  }
}

walk(providersDir);

for (const mode of [...modes].sort()) {
  console.log(mode);
}
