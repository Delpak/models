const fs = require("fs");
const path = require("path");

const rootDir = process.argv[2] ? path.resolve(process.argv[2]) : __dirname;
const providersDir = path.join(rootDir, "providers");
const capabilities = new Set();

function cleanScalar(value) {
  let text = value.trim();

  const commentStart = text.indexOf(" #");
  if (commentStart !== -1) {
    text = text.slice(0, commentStart).trim();
  }

  if (
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith("'") && text.endsWith("'"))
  ) {
    return text.slice(1, -1);
  }

  return text;
}

function parseValue(rawValue) {
  const value = rawValue.trim();

  if (!value) {
    return [];
  }

  if (value.startsWith("[") && value.endsWith("]")) {
    return value
      .slice(1, -1)
      .split(",")
      .map(cleanScalar)
      .filter(Boolean);
  }

  return [cleanScalar(value)].filter(Boolean);
}

function parseTopLevelList(lines, startIndex, itemIndent) {
  const values = [];

  for (let index = startIndex; index < lines.length; index += 1) {
    const line = lines[index];

    if (!line.trim()) {
      continue;
    }

    const leadingSpaces = line.match(/^ */)[0].length;
    if (leadingSpaces < itemIndent) {
      break;
    }

    const item = line.match(/^\s*-\s*(.+?)\s*$/);
    if (item) {
      values.push(cleanScalar(item[1]));
    }
  }

  return values;
}

function parseCapabilities(content) {
  const lines = content.split(/\r?\n/);
  const values = [];

  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^(capabilities|features):\s*(.*)$/);
    if (!match) {
      continue;
    }

    const parsed = parseValue(match[2]);
    values.push(
      ...(parsed.length ? parsed : parseTopLevelList(lines, index + 1, 4)),
    );
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

    for (const capability of parseCapabilities(fs.readFileSync(fullPath, "utf8"))) {
      capabilities.add(capability);
    }
  }
}

walk(providersDir);

for (const capability of [...capabilities].sort()) {
  console.log(capability);
}
