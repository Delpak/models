const fs = require("fs");
const path = require("path");

const rootDir = process.argv[2] ? path.resolve(process.argv[2]) : __dirname;
const providersDir = path.join(rootDir, "providers");
const matches = [];

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

function parseIndentedList(lines, startIndex, itemIndent) {
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

function parseTopLevelScalar(lines, key) {
  for (const line of lines) {
    const match = line.match(new RegExp(`^${key}:\\s*(.*)$`));
    if (match) {
      return cleanScalar(match[1]);
    }
  }

  return "";
}

function parseSupportedModes(content) {
  const lines = content.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^supportedModes:\s*(.*)$/);
    if (!match) {
      continue;
    }

    const parsed = parseValue(match[1]);
    return parsed.length ? parsed : parseIndentedList(lines, index + 1, 4);
  }

  return [];
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

    const content = fs.readFileSync(fullPath, "utf8");
    const supportedModes = parseSupportedModes(content);
    if (supportedModes.length <= 1) {
      continue;
    }

    const lines = content.split(/\r?\n/);
    matches.push({
      file: path.relative(rootDir, fullPath).replaceAll(path.sep, "/"),
      model: parseTopLevelScalar(lines, "model"),
      supportedModes,
    });
  }
}

walk(providersDir);

for (const match of matches.sort((a, b) => a.file.localeCompare(b.file))) {
  const label = match.model ? `${match.file} (${match.model})` : match.file;
  console.log(`${label}: ${match.supportedModes.join(", ")}`);
}
