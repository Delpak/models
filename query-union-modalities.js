const fs = require("fs");
const path = require("path");

const rootDir = process.argv[2] ? path.resolve(process.argv[2]) : __dirname;
const providersDir = path.join(rootDir, "providers");
const modalities = {
  input: new Set(),
  output: new Set(),
};

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

function parseList(lines, startIndex, itemIndent) {
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

function parseModalities(content) {
  const lines = content.split(/\r?\n/);
  const found = {
    input: [],
    output: [],
  };

  for (let index = 0; index < lines.length; index += 1) {
    if (!/^modalities:\s*$/.test(lines[index])) {
      continue;
    }

    for (let next = index + 1; next < lines.length; next += 1) {
      const line = lines[next];

      if (!line.trim()) {
        continue;
      }

      if (/^\S/.test(line)) {
        break;
      }

      const property = line.match(/^ {4}(input|output):\s*(.*)$/);
      if (!property) {
        continue;
      }

      const name = property[1];
      const rawValue = property[2];
      const parsed = parseValue(rawValue);
      found[name].push(
        ...(parsed.length ? parsed : parseList(lines, next + 1, 8)),
      );
    }

    break;
  }

  return found;
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

    const parsed = parseModalities(fs.readFileSync(fullPath, "utf8"));
    for (const value of parsed.input) {
      modalities.input.add(value);
    }
    for (const value of parsed.output) {
      modalities.output.add(value);
    }
  }
}

walk(providersDir);

console.log("input:");
for (const value of [...modalities.input].sort()) {
  console.log(`  ${value}`);
}

console.log("output:");
for (const value of [...modalities.output].sort()) {
  console.log(`  ${value}`);
}
