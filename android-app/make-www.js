// Copies the web app (repo root) into www/ for the Android build. Service workers are left out: the app files are already inside the APK.
const fs = require("fs"), path = require("path");
const root = path.join(__dirname, ".."), out = path.join(__dirname, "www");
fs.rmSync(out, {recursive: true, force: true});
fs.mkdirSync(out);
for (const f of ["index.html", "watch.js", "manifest.webmanifest", "icon-192.png", "icon-512.png", "apple-touch-icon.png"]) fs.copyFileSync(path.join(root, f), path.join(out, f));
for (const d of ["food", "gym"]) fs.cpSync(path.join(root, d), path.join(out, d), {recursive: true, filter: src => !src.endsWith("sw.js")});
fs.writeFileSync(path.join(out, "privacypolicy.html"), `<!doctype html><html lang="uk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Конфіденційність</title></head><body style="font:16px/1.5 sans-serif;padding:16px;max-width:600px;margin:auto">
<h1>Конфіденційність</h1><p>«Щоденник» читає з Health Connect кроки, пульс, спалені калорії, сон і тренування, щоб показати їх у застосунку поруч із калоріями і тренуваннями.</p>
<p>Дані зберігаються тільки на цьому телефоні. Застосунок нічого не записує в Health Connect і нікуди не відправляє дані про здоров'я.</p>
<p>Доступ можна вимкнути будь-коли: Налаштування → Health Connect → Дозволи застосунків → «Щоденник».</p></body></html>`);
console.log("www ready");
