import fs from "node:fs";
const t = fs.readFileSync("tools/pipeline.py", "utf8");
const words = ["المادة تشرح", "في الصفحات", "الأمثلة المرفقة", "قسم Terminal", "راجع"];
for (const w of words) console.log(w, "->", t.includes(w));
