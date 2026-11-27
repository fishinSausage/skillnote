// Build a portable copy from the same entry point and modules as the hosted app.
import {readFile, writeFile} from "node:fs/promises";

const source = new URL("./dist/", import.meta.url);
const output = new URL("../스킬노트.html", import.meta.url);
const read = (name, enc) => readFile(new URL(name, source), enc);
async function dataUrl(file, type) {
  return "data:" + type + ";base64," + (await read(file)).toString("base64");
}

let entry = await read("index.html", "utf8");
let script = await read("app.js", "utf8");
const styles = await read("styles.css", "utf8");
const catalogUrl = await dataUrl("catalog.js","text/javascript");
const storageScript = (await read("storage.js","utf8")).replace('"./catalog.js?v=18"', () => JSON.stringify(catalogUrl));
const storageUrl = "data:text/javascript;base64," + Buffer.from(storageScript).toString("base64");
const eclassScript = (await read("eclass.js","utf8")).replace('"./catalog.js?v=18"', () => JSON.stringify(catalogUrl));
const eclassUrl = "data:text/javascript;base64," + Buffer.from(eclassScript).toString("base64");
script = script.replace('"./catalog.js?v=18"', () => JSON.stringify(catalogUrl))
  .replace('"./storage.js?v=18"', () => JSON.stringify(storageUrl))
  .replace('"./eclass.js?v=18"', () => JSON.stringify(eclassUrl))
  .replace('"./icons.js"', JSON.stringify(await dataUrl("icons.js","text/javascript")));
entry = entry.replaceAll("./mark.svg", await dataUrl("mark.svg","image/svg+xml"));
entry = entry.replace('<link rel="stylesheet" href="./styles.css?v=18">', () => "<style>\n" + styles + "\n</style>");
entry = entry.replace('<script type="module" src="./app.js?v=18"></script>', () => '<script type="module">\n' + script.replace(/<\/script/gi, "<\\/script") + "\n</script>");
await writeFile(output,entry);

// presentation.html carries its own copy of the app for the phone demo; keep that copy in step with this build.
const deck = new URL("../presentation.html", import.meta.url);
try {
  const page = await readFile(deck, "utf8");
  const slot = /(const PROTOTYPE_B64 = ")[A-Za-z0-9+/=]*(")/;
  if (!slot.test(page)) throw new Error("presentation.html has no PROTOTYPE_B64 slot");
  await writeFile(deck, page.replace(slot, (_, open, close) => open + Buffer.from(entry).toString("base64") + close));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
