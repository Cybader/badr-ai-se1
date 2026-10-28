/* =========================================================
   Badr AI — Terminal Unix simulé + 16 missions
   ========================================================= */
window.TERM = (function () {
  "use strict";

  const HOME = "/home/etudiant";
  const USER = "etudiant";
  const HOST = "badrai-se1";
  const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

  let state = null;
  let els = null;
  let mounted = false;

  /* ============================ Nodes ============================ */
  function d(children, owner, mode) {
    return { t: "d", owner: owner || USER, group: owner || USER, mode: mode || "755", children: children || {}, mtime: Date.now() };
  }
  function f(content, owner, mode) {
    return { t: "f", owner: owner || USER, group: owner || USER, mode: mode || "644", content: content || "", mtime: Date.now() };
  }
  function l(target) {
    return { t: "l", owner: USER, group: USER, mode: "777", target: target, mtime: Date.now() };
  }

  function buildFS() {
    return d({
      bin: d({
        bash: f("", "root", "755"), sh: f("", "root", "755"), ls: f("", "root", "755"),
        cat: f("", "root", "755"), cp: f("", "root", "755"), mv: f("", "root", "755"),
        rm: f("", "root", "755"), grep: f("", "root", "755"), find: f("", "root", "755"),
        chmod: f("", "root", "755"), echo: f("", "root", "755")
      }, "root"),
      etc: d({
        passwd: f(
          "root:x:0:0:root:/root:/bin/bash\n" +
          "daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin\n" +
          "etudiant:x:1000:1000:Etudiant SE1:/home/etudiant:/bin/bash\n" +
          "badr:x:1001:1001:Badr AI:/home/badr:/bin/bash\n", "root"),
        group: f("root:x:0:\nsudo:x:27:etudiant\netudiant:x:1000:\nbadr:x:1001:\n", "root"),
        shadow: f("root:*:19000:0:99999:7:::\netudiant:$6$demo$hash:19000:0:99999:7:::\n", "root"),
        hostname: f("badrai-se1\n", "root"),
        "os-release": f('NAME="Badr AI Linux"\nVERSION="1.0 (SE1)"\nID=badrai\nPRETTY_NAME="Badr AI Linux 1.0"\n', "root"),
        hosts: f("127.0.0.1\tlocalhost\n127.0.1.1\tbadrai-se1\n", "root")
      }, "root"),
      home: d({
        etudiant: d({
          Documents: d({}, USER),
          Images: d({}, USER),
          ".bashrc": f("# ~/.bashrc — configuration de Badr AI\nPS1='\\u@\\h:\\w$ '\nalias ll='ls -l'\n", USER, "644"),
          ".profile": f("# ~/.profile\nPATH=$HOME/bin:$PATH\nexport PATH\n", USER, "644"),
          "script.sh": f("#!/bin/bash\n# Script d'exemple SE1\necho \"Bienvenue dans le shell\"\n", USER, "644"),
          "bonjour.sh": f("#!/bin/bash\necho \"Bonjour Badr AI\"\n", USER, "755")
        }, USER),
        badr: d({}, "badr")
      }, "root"),
      tmp: d({}, "root", "1777"),
      var: d({
        log: d({
          messages: f(
            "Oct 28 08:00:01 badrai-se1 kernel: [0.000] Linux version 6.8.0-badrai\n" +
            "Oct 28 08:00:02 badrai-se1 systemd[1]: Démarrage de Badr AI Linux\n" +
            "Oct 28 08:00:05 badrai-se1 login[421]: session ouverte pour etudiant\n" +
            "Oct 28 08:03:11 badrai-se1 bash[820]: cd /home/etudiant\n" +
            "Oct 28 08:09:40 badrai-se1 sudo[915]: etudiant : commande autorisée\n", "root"),
          syslog: f("Oct 28 08:00:01 badrai-se1 systemd[1]: Reached target Multi-User System.\n", "root")
        }, "root")
      }, "root"),
      usr: d({
        bin: d({
          vim: f("", "root", "755"), nano: f("", "root", "755"), gedit: f("", "root", "755"),
          tar: f("", "root", "755"), ps: f("", "root", "755"), kill: f("", "root", "755"),
          man: f("", "root", "755"), grep: f("", "root", "755")
        }, "root"),
        share: d({ doc: d({ "se1.txt": f("Cours Système d'Exploitation 1 — Badr AI\n", "root") }, "root") }, "root")
      }, "root"),
      dev: d({
        null: f("", "root", "666"), zero: f("", "root", "666"), tty: f("", "root", "666")
      }, "root"),
      proc: d({
        cpuinfo: f("processor\t: 0\nmodel name\t: Badr AI Virtual CPU\ncpu MHz\t\t: 3200.000\n", "root"),
        version: f("Linux version 6.8.0-badrai (build@badrai) #1 SMP\n", "root")
      }, "root"),
      root: d({}, "root", "700")
    }, "root", "755");
  }

  /* ============================ State ============================ */
  function freshState() {
    return {
      fs: buildFS(),
      cwd: HOME,
      user: USER,
      host: HOST,
      env: {
        HOME: HOME, USER: USER, LOGNAME: USER,
        PATH: "/usr/local/bin:/usr/bin:/bin:/usr/games",
        PWD: HOME, OLDPWD: HOME, SHELL: "/bin/bash",
        TERM: "xterm-256color", LANG: "fr_FR.UTF-8", UID: "1000",
        PS1: "\\u@\\h:\\w$ ", IFS: " \t\n"
      },
      vars: {},
      aliases: { ll: "ls -l", la: "ls -la", l: "ls -CF" },
      history: [],
      procs: [
        { pid: 1, user: "root", cmd: "/sbin/init", stat: "S", tty: "?" },
        { pid: 421, user: "root", cmd: "/usr/sbin/sshd -D", stat: "S", tty: "?" },
        { pid: 820, user: "etudiant", cmd: "-bash", stat: "S", tty: "pts/0" },
        { pid: 915, user: "root", cmd: "ps -f", stat: "R", tty: "pts/0" },
        { pid: 1102, user: "etudiant", cmd: "sleep 200", stat: "S", tty: "pts/0" }
      ],
      lastCode: 0,
      scriptArgs: [],
      completed: [],
      recent: [],
      depth: 0
    };
  }

  /* ============================ FS utilities ============================ */
  function normalize(p) {
    const parts = [];
    String(p).split("/").forEach(function (s) {
      if (!s || s === ".") return;
      if (s === "..") { parts.pop(); return; }
      parts.push(s);
    });
    return "/" + parts.join("/");
  }
  function resolve(p, base) {
    p = String(p == null ? "" : p);
    if (!p) return base || state.cwd;
    if (p === "~") return HOME;
    if (p.indexOf("~/") === 0) p = HOME + p.slice(1);
    if (p.charAt(0) === "/") return normalize(p);
    return normalize((base || state.cwd) + "/" + p);
  }
  function getNode(p) {
    const parts = normalize(p).split("/").filter(Boolean);
    let n = state.fs;
    for (let i = 0; i < parts.length; i++) {
      if (!n || n.t !== "d") return null;
      n = n.children[parts[i]];
      if (!n) return null;
    }
    return n;
  }
  function parentDir(p) {
    const n = normalize(p);
    const i = n.lastIndexOf("/");
    return i <= 0 ? state.fs : getNode(n.slice(0, i));
  }
  function baseName(p) {
    const n = normalize(p);
    return n.slice(n.lastIndexOf("/") + 1) || "/";
  }
  function dirName(p) {
    const n = normalize(p);
    return n.slice(0, n.lastIndexOf("/")) || "/";
  }
  function ensureFile(p) {
    const node = getNode(p);
    if (node) return node;
    const par = parentDir(p);
    if (!par || par.t !== "d") return null;
    const nf = f("");
    par.children[baseName(p)] = nf;
    return nf;
  }
  function writeFile(p, content, append) {
    const node = getNode(p);
    if (node && node.t === "d") return false;
    if (node && node.t === "l") return false;
    if (!node) {
      const nf = ensureFile(p);
      if (!nf) return false;
      nf.content = content;
    } else {
      node.content = append ? (node.content || "") + content : content;
      node.mtime = Date.now();
    }
    return true;
  }
  function readText(p) {
    const node = getNode(p);
    if (!node) return null;
    if (node.t === "f") return node.content || "";
    if (node.t === "l") {
      const t = getNode(resolve(node.target, dirName(p)));
      return t && t.t === "f" ? (t.content || "") : null;
    }
    return null;
  }
  function eachNode(base, cb, rel) {
    const node = getNode(base);
    if (!node) return;
    const prefix = rel == null ? "" : rel;
    cb(base, node);
    if (node.t === "d") {
      Object.keys(node.children).sort().forEach(function (name) {
        eachNode((base === "/" ? "" : base) + "/" + name, cb, false);
      });
    }
  }
  function nodeSize(node) {
    if (!node) return 0;
    if (node.t === "f") return (node.content || "").length;
    if (node.t === "d") return 4096;
    return (node.target || "").length;
  }
  function human(n) {
    if (n < 1024) return n + " o";
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " Ko";
    return (n / 1024 / 1024).toFixed(1) + " Mo";
  }
  const PERM = ["---", "--x", "-w-", "-wx", "r--", "r-x", "rw-", "rwx"];
  function permString(mode) {
    const m = String(mode || "644").padStart(3, "0");
    return PERM[+m[0]] + PERM[+m[1]] + PERM[+m[2]];
  }
  function typeChar(node) {
    return node.t === "d" ? "d" : node.t === "l" ? "l" : "-";
  }
  function pad(s, n) {
    s = String(s);
    return s.length >= n ? s : s + " ".repeat(n - s.length);
  }
  function padStart(s, n) {
    s = String(s);
    return s.length >= n ? s : " ".repeat(n - s.length) + s;
  }
  function fmtDate(ts) {
    const dt = new Date(ts || Date.now());
    const d2 = String(dt.getDate()).padStart(2, "0");
    const h2 = String(dt.getHours()).padStart(2, "0");
    const m2 = String(dt.getMinutes()).padStart(2, "0");
    return MONTHS[dt.getMonth()] + " " + d2 + " " + h2 + ":" + m2;
  }
  function longLine(node, name) {
    const links = node.t === "d" ? 2 : 1;
    let line = typeChar(node) + permString(node.mode) + " " + pad(links, 2) + " " +
      pad(node.owner || USER, 8) + " " + pad(node.group || USER, 8) + " " +
      padStart(nodeSize(node), 6) + " " + fmtDate(node.mtime) + " " + name;
    if (node.t === "l") line += " -> " + node.target;
    return line;
  }

  /* ============================ Tokenizer ============================ */
  function tokenize(s) {
    const out = [];
    let cur = "", has = false, q = null;
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (q) {
        if (ch === q) q = null;
        else if (ch === "\\" && q === '"') {
          const nx = s[i + 1];
          if (nx === '"' || nx === "\\" || nx === "$" || nx === "`") { cur += nx; i++; }
          else { cur += "\\" + (nx == null ? "" : nx); i++; }
        }
        else cur += ch;
        has = true;
        continue;
      }
      if (ch === "'" || ch === '"') { q = ch; has = true; continue; }
      if (ch === "\\") {
        const nx = s[i + 1];
        if (nx == null) { cur += "\\"; has = true; continue; }
        if ("\\\"'$`".indexOf(nx) > -1 || /\s/.test(nx)) { cur += nx; i++; }
        else { cur += "\\" + nx; i++; }
        has = true;
        continue;
      }
      if (/\s/.test(ch)) {
        if (has) { out.push(cur); cur = ""; has = false; }
        continue;
      }
      cur += ch; has = true;
    }
    if (has) out.push(cur);
    return out;
  }

  function parseSeq(line) {
    const items = [];
    let buf = "", q = null;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (q) { buf += ch; if (ch === q) q = null; continue; }
      if (ch === "'" || ch === '"') { q = ch; buf += ch; continue; }
      if (ch === "\\") { buf += line.slice(i, i + 2); i++; continue; }
      if (line.startsWith("&&", i) || line.startsWith("||", i)) {
        if (buf.trim()) items.push({ cmd: buf.trim(), sep: line.substr(i, 2) });
        buf = ""; i++; continue;
      }
      if (ch === ";") {
        if (buf.trim()) items.push({ cmd: buf.trim(), sep: ";" });
        buf = ""; continue;
      }
      if (ch === "&" && line[i + 1] !== "&" && line[i + 1] !== ">") {
        if (buf.trim()) items.push({ cmd: buf.trim(), sep: ";" });
        buf = ""; continue;
      }
      buf += ch;
    }
    if (buf.trim()) items.push({ cmd: buf.trim(), sep: "END" });
    return items;
  }

  function splitPipe(line) {
    const parts = [];
    let buf = "", q = null;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (q) { buf += ch; if (ch === q) q = null; continue; }
      if (ch === "'" || ch === '"') { q = ch; buf += ch; continue; }
      if (ch === "\\") { buf += line.slice(i, i + 2); i++; continue; }
      if (ch === "|" && line[i + 1] !== "|") { parts.push(buf); buf = ""; continue; }
      buf += ch;
    }
    parts.push(buf);
    return parts.filter(function (p) { return p.trim() !== ""; });
  }

  /* ============================ Globbing ============================ */
  function globToRe(g) {
    let re = "^";
    for (let i = 0; i < g.length; i++) {
      const ch = g[i];
      if (ch === "*") re += "[^/]*";
      else if (ch === "?") re += "[^/]";
      else if (ch === "[") {
        const end = g.indexOf("]", i);
        if (end > i) { re += "[" + g.slice(i + 1, end).replace(/\\/g, "\\\\") + "]"; i = end; }
        else re += "\\[";
      } else re += ch.replace(/[.+^${}()|\\]/g, "\\$&");
    }
    return new RegExp(re + "$");
  }
  function globOne(arg) {
    if (!/[*?[]/.test(arg)) return [arg];
    const abs = arg.charAt(0) === "/";
    const dirArg = dirName(arg);
    const base = baseName(arg);
    const dirPath = abs ? dirArg : resolve(dirArg || ".");
    const dir = getNode(dirPath);
    if (!dir || dir.t !== "d") return [arg];
    const re = globToRe(base);
    const hits = Object.keys(dir.children).filter(function (n) {
      return n.charAt(0) !== "." && re.test(n);
    }).sort().map(function (n) {
      return (abs ? dirPath : (dirArg === "/" ? "" : dirArg === "." ? "" : dirArg + "/")) + n;
    });
    return hits.length ? hits : [arg];
  }

  /* ============================ Expansion ============================ */
  function expand(s, depth) {
    depth = depth || 0;
    if (depth > 3) return s;
    let out = s;
    out = out.replace(/\$\(([^()]*)\)/g, function (m, cmd) {
      const r = execLine(cmd, { silent: true, depth: state.depth + 1 });
      return r.out.join(" ");
    });
    out = out.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, function (m, name) {
      return lookupVar(name);
    });
    out = out.replace(/\$([A-Za-z_][A-Za-z0-9_]*)/g, function (m, name) {
      return lookupVar(name);
    });
    out = out.replace(/\$\?/g, String(state.lastCode));
    out = out.replace(/\$\$/g, "4242");
    out = out.replace(/\$([0-9])/g, function (m, n) {
      const i = +n;
      if (!state.scriptArgs || !state.scriptArgs.length) return m;
      return state.scriptArgs[i] != null ? state.scriptArgs[i] : "";
    });
    return out;
  }
  function lookupVar(name) {
    if (Object.prototype.hasOwnProperty.call(state.env, name)) return state.env[name];
    if (Object.prototype.hasOwnProperty.call(state.vars, name)) return state.vars[name];
    return "";
  }

  /* ============================ Execution core ============================ */
  const CMD = Object.create(null);

  function res(out, err, code) {
    return {
      out: out ? (Array.isArray(out) ? out : [out]) : [],
      err: err ? (Array.isArray(err) ? err : [err]) : [],
      code: code || 0
    };
  }
  function fail(msg, code) { return res([], msg, code == null ? 1 : code); }
  function okOut(msg) { return res(msg, [], 0); }

  function extractRedirs(tokens) {
    const redirs = [], args = [];
    for (let i = 0; i < tokens.length; i++) {
      const tk = tokens[i];
      if (tk === ">" || tk === ">>" || tk === "2>" || tk === "2>>" || tk === "&>" || tk === "<") {
        if (i + 1 < tokens.length) redirs.push({ op: tk, target: tokens[++i] });
        continue;
      }
      const m = tk.match(/^(2>>|2>|&>>|&>|>>|>|<)(.+)$/);
      if (m) { redirs.push({ op: m[1], target: m[2] }); continue; }
      args.push(tk);
    }
    return { redirs: redirs, args: args };
  }

  function expandAll(args) {
    const out = [];
    args.forEach(function (a) {
      globOne(expand(a)).forEach(function (x) { out.push(x); });
    });
    return out;
  }

  function runSimple(part, stdinStr) {
    let tokens = tokenize(part);
    if (!tokens.length) return res([], [], 0);

    let guard = 0;
    while (state.aliases[tokens[0]] && guard++ < 10) {
      const rep = tokenize(state.aliases[tokens[0]]);
      tokens = rep.concat(tokens.slice(1));
    }

    const ex = extractRedirs(tokens);
    const noGlob = /^(expr|let)$/.test(ex.args[0] || "");
    const args = [];
    ex.args.forEach(function (a) {
      const e = expand(a);
      (noGlob ? [e] : globOne(e)).forEach(function (x) { args.push(x); });
    });
    const redirs = ex.redirs.map(function (r) { return { op: r.op, target: expand(r.target) }; });
    if (!args.length) return res([], [], 0);

    let stdin = stdinStr;
    for (let i = 0; i < redirs.length; i++) {
      if (redirs[i].op === "<") {
        const t = readText(resolve(redirs[i].target));
        if (t == null) return fail("bash: " + redirs[i].target + ": Aucun fichier ou dossier de ce type", 1);
        stdin = t;
      }
    }

    const name = args[0];
    const rest = args.slice(1);
    let r;

    if (/^(\.{1,2}\/|\/)/.test(name)) {
      r = runScriptPath(name, rest);
    } else if (CMD[name]) {
      r = CMD[name](rest, { stdin: stdin, line: part, clear: false });
    } else if (name === "exit") {
      r = okOut("exit: utilisez le bouton « Réinitialiser » pour redémarrer la session.");
    } else {
      r = fail("bash: " + name + ": commande introuvable", 127);
    }

    if (!r || typeof r !== "object") r = res(r || [], [], 0);
    r.out = r.out || []; r.err = r.err || []; r.code = r.code || 0;

    redirs.forEach(function (rd) {
      const path = resolve(rd.target);
      const node = getNode(path);
      if (node && node.t === "d") { r.err.push("bash: " + rd.target + ": Est un dossier"); r.code = 1; return; }
      if (rd.op === ">" || rd.op === ">>") {
        if (!writeFile(path, r.out.join("\n") + (r.out.length ? "\n" : ""), rd.op === ">>")) {
          r.err.push("bash: " + rd.target + ": Impossible d'écrire"); r.code = 1;
        }
        r.out = [];
      } else if (rd.op === "2>" || rd.op === "2>>") {
        if (!writeFile(path, r.err.join("\n") + (r.err.length ? "\n" : ""), rd.op === "2>>")) {
          r.err.push("bash: " + rd.target + ": Impossible d'écrire"); r.code = 1;
        }
        r.err = [];
      } else if (rd.op === "&>" || rd.op === "&>>") {
        const all = r.out.concat(r.err);
        if (!writeFile(path, all.join("\n") + (all.length ? "\n" : ""), rd.op === "&>>")) {
          r.err.push("bash: " + rd.target + ": Impossible d'écrire"); r.code = 1;
        }
        r.out = []; r.err = [];
      }
    });

    return r;
  }

  function runPipeline(segment, stdinStr, opts) {
    const parts = splitPipe(segment);
    if (!parts.length) return res([], [], 0);
    let input = stdinStr == null ? null : stdinStr;
    let finalOut = [], allErr = [], code = 0, clear = false;
    for (let i = 0; i < parts.length; i++) {
      const r = runSimple(parts[i], input);
      allErr = allErr.concat(r.err || []);
      code = r.code;
      if (r.clear) clear = true;
      finalOut = r.out || [];
      input = finalOut.join("\n");
    }
    return { out: finalOut, err: allErr, code: code, clear: clear };
  }

  function execLine(line, opts) {
    opts = opts || {};
    const items = parseSeq(line);
    let out = [], err = [], code = 0, clear = false;
    for (let i = 0; i < items.length; i++) {
      if (i > 0) {
        const sep = items[i - 1].sep;
        if (sep === "&&" && code !== 0) continue;
        if (sep === "||" && code === 0) continue;
      }
      const r = runPipeline(items[i].cmd, null, opts);
      out = out.concat(r.out || []);
      err = err.concat(r.err || []);
      code = r.code;
      if (r.clear) clear = true;
    }
    state.lastCode = code;
    if (!opts.silent) {
      state.recent.push(line.trim());
      if (state.recent.length > 120) state.recent.shift();
      state.lastRun = { line: line.trim(), out: out.slice(), err: err.slice(), code: code };
    }
    return { out: out, err: err, code: code, clear: clear };
  }

  /* ============================ Option parser ============================ */
  function opts(args) {
    const flags = {}, rest = [];
    args.forEach(function (a) {
      if (a === "--") { rest.push("--"); return; }
      if (a.length > 1 && a.charAt(0) === "-" && !/^-\d+$/.test(a) && a !== "--") {
        a.slice(1).split("").forEach(function (c) { flags[c] = true; });
      } else rest.push(a);
    });
    return { flags: flags, rest: rest };
  }

  function nodeCopy(n) {
    if (!n) return null;
    if (n.t === "d") {
      const copy = d({}, n.owner, n.mode);
      Object.keys(n.children).forEach(function (k) { copy.children[k] = nodeCopy(n.children[k]); });
      return copy;
    }
    if (n.t === "l") {
      const copy = l(n.target);
      copy.owner = n.owner; copy.group = n.group; copy.mode = n.mode;
      return copy;
    }
    const copy = f(n.content, n.owner, n.mode);
    copy.group = n.group;
    return copy;
  }

  function insertNode(path, node) {
    const par = parentDir(path);
    if (!par || par.t !== "d") return false;
    par.children[baseName(path)] = node;
    return true;
  }

  function removeNode(path) {
    if (normalize(path) === "/") return false;
    const par = parentDir(path);
    if (!par || par.t !== "d") return false;
    delete par.children[baseName(path)];
    return true;
  }

  function linesOf(text) {
    if (text == null) return [];
    const arr = String(text).replace(/\r/g, "").split("\n");
    if (arr.length && arr[arr.length - 1] === "") arr.pop();
    return arr;
  }

  /* ============================ Filesystem commands ============================ */
  CMD.pwd = function () {
    return okOut(state.cwd);
  };

  CMD.cd = function (args) {
    let target = args[0];
    if (target == null || target === "~") target = HOME;
    else if (target === "-") target = state.env.OLDPWD || HOME;
    const p = resolve(target);
    const node = getNode(p);
    if (!node) return fail("bash: cd: " + target + ": Aucun fichier ou dossier de ce type");
    if (node.t !== "d") return fail("bash: cd: " + target + ": N'est pas un dossier");
    const old = state.cwd;
    state.cwd = p;
    state.env.OLDPWD = old;
    state.env.PWD = p;
    if (args[0] === "-") return okOut(p);
    return res([], [], 0);
  };

  CMD.ls = function (args) {
    const o = opts(args);
    const paths = o.rest.length ? o.rest : ["."];
    const out = [], errs = [];
    let code = 0;
    const multi = paths.length > 1;
    paths.forEach(function (p) {
      const node = getNode(resolve(p));
      if (!node) {
        errs.push("ls: impossible d'accéder à '" + p + "': Aucun fichier ou dossier de ce type");
        code = 2;
        return;
      }
      if (multi) out.push(p + ":");
      if (node.t === "d") {
        let names = Object.keys(node.children).sort();
        if (!o.flags.a) names = names.filter(function (n) { return n.charAt(0) !== "."; });
        if (o.flags.l) {
          out.push("total " + names.length);
          names.forEach(function (n) { out.push(longLine(node.children[n], n)); });
        } else if (names.length) {
          out.push(names.join("  "));
        }
      } else {
        out.push(o.flags.l ? longLine(node, p) : p);
      }
      if (multi) out.push("");
    });
    if (out.length && out[out.length - 1] === "") out.pop();
    return { out: out, err: errs, code: code };
  };

  CMD.mkdir = function (args) {
    const o = opts(args);
    if (!o.rest.length) return fail("mkdir: opérande manquant");
    const errs = [];
    let code = 0;
    o.rest.forEach(function (p) {
      const full = resolve(p);
      if (getNode(full)) {
        if (o.flags.p) return;
        errs.push("mkdir: impossible de créer le dossier '" + p + "': Le fichier existe");
        code = 1;
        return;
      }
      const par = parentDir(full);
      if (!par || par.t !== "d") {
        if (o.flags.p) {
          const created = mkdirParents(full);
          if (!created) { errs.push("mkdir: impossible de créer le dossier '" + p + "'"); code = 1; }
        } else {
          errs.push("mkdir: impossible de créer le dossier '" + p + "': Aucun fichier ou dossier de ce type");
          code = 1;
        }
        return;
      }
      par.children[baseName(full)] = d({}, state.user);
    });
    return { out: [], err: errs, code: code };
  };

  function mkdirParents(path) {
    const parts = normalize(path).split("/").filter(Boolean);
    let node = state.fs;
    for (let i = 0; i < parts.length; i++) {
      if (!node.children[parts[i]]) node.children[parts[i]] = d({}, state.user);
      node = node.children[parts[i]];
      if (!node || node.t !== "d") return false;
    }
    return true;
  }

  CMD.rmdir = function (args) {
    if (!args.length) return fail("rmdir: opérande manquant");
    const errs = [];
    let code = 0;
    args.forEach(function (p) {
      const full = resolve(p);
      const node = getNode(full);
      if (!node) { errs.push("rmdir: échec de suppression de '" + p + "': Aucun fichier ou dossier de ce type"); code = 1; return; }
      if (node.t !== "d") { errs.push("rmdir: échec de suppression de '" + p + "': N'est pas un dossier"); code = 1; return; }
      if (Object.keys(node.children).length) { errs.push("rmdir: échec de suppression de '" + p + "': Le dossier n'est pas vide"); code = 1; return; }
      removeNode(full);
    });
    return { out: [], err: errs, code: code };
  };

  CMD.touch = function (args) {
    if (!args.length) return fail("touch: opérande manquant");
    const errs = [];
    let code = 0;
    args.forEach(function (p) {
      const full = resolve(p);
      const node = getNode(full);
      if (node) { node.mtime = Date.now(); return; }
      const par = parentDir(full);
      if (!par || par.t !== "d") { errs.push("touch: impossible de créer '" + p + "': Aucun fichier ou dossier de ce type"); code = 1; return; }
      par.children[baseName(full)] = f("", state.user);
    });
    return { out: [], err: errs, code: code };
  };

  CMD.cat = function (args, ctx) {
    const o = opts(args);
    const files = o.rest;
    if (!files.length) {
      if (ctx.stdin == null) return res([], [], 0);
      return res(linesOf(ctx.stdin), [], 0);
    }
    const out = [], errs = [];
    let code = 0;
    files.forEach(function (p) {
      const node = getNode(resolve(p));
      if (!node) { errs.push("cat: " + p + ": Aucun fichier ou dossier de ce type"); code = 1; return; }
      if (node.t === "d") { errs.push("cat: " + p + ": Est un dossier"); code = 1; return; }
      let text = node.t === "l" ? readText(resolve(p)) : node.content;
      if (text == null) { errs.push("cat: " + p + ": Aucun fichier ou dossier de ce type"); code = 1; return; }
      linesOf(text).forEach(function (ln) { out.push(ln); });
    });
    return { out: out, err: errs, code: code };
  };

  CMD.echo = function (args) {
    let noNewline = false, interpret = false;
    let i = 0;
    while (i < args.length && /^-[neE]+$/.test(args[i])) {
      if (args[i].indexOf("n") > -1) noNewline = true;
      if (args[i].indexOf("e") > -1) interpret = true;
      i++;
    }
    let text = args.slice(i).join(" ");
    if (interpret) {
      text = text.replace(/\\n/g, "\n").replace(/\\t/g, "\t").replace(/\\\\/g, "\\");
    }
    const out = text.split("\n");
    return { out: out, err: [], code: 0 };
  };

  CMD.cp = function (args) {
    const o = opts(args);
    if (o.rest.length < 2) return fail("cp: opérande manquant après '" + (o.rest[0] || "") + "'");
    const srcs = o.rest.slice(0, -1);
    const dstRaw = o.rest[o.rest.length - 1];
    const dstFull = resolve(dstRaw);
    const dstNode = getNode(dstFull);
    const errs = [];
    let code = 0;

    srcs.forEach(function (srcRaw) {
      const src = resolve(srcRaw);
      const sn = getNode(src);
      if (!sn) { errs.push("cp: impossible d'évaluer '" + srcRaw + "': Aucun fichier ou dossier de ce type"); code = 1; return; }
      if (sn.t === "d" && !o.flags.r && !o.flags.R) { errs.push("cp: -r non spécifié; omission du répertoire '" + srcRaw + "'"); code = 1; return; }
      let target = dstFull;
      if (dstNode && dstNode.t === "d") target = (dstFull === "/" ? "" : dstFull) + "/" + baseName(src);
      if (sn.t === "d" && (target === src || target.indexOf(src + "/") === 0)) {
        errs.push("cp: impossible de copier '" + srcRaw + "' dans lui-même"); code = 1; return;
      }
      const par = parentDir(target);
      if (!par || par.t !== "d") { errs.push("cp: impossible de créer '" + dstRaw + "': Aucun fichier ou dossier de ce type"); code = 1; return; }
      par.children[baseName(target)] = nodeCopy(sn);
    });
    return { out: [], err: errs, code: code };
  };

  CMD.mv = function (args) {
    const o = opts(args);
    if (o.rest.length < 2) return fail("mv: opérande manquant après '" + (o.rest[0] || "") + "'");
    const srcs = o.rest.slice(0, -1);
    const dstRaw = o.rest[o.rest.length - 1];
    const dstFull = resolve(dstRaw);
    const dstNode = getNode(dstFull);
    const errs = [];
    let code = 0;

    srcs.forEach(function (srcRaw) {
      const src = resolve(srcRaw);
      const sn = getNode(src);
      if (!sn) { errs.push("mv: impossible d'évaluer '" + srcRaw + "': Aucun fichier ou dossier de ce type"); code = 1; return; }
      let target = dstFull;
      if (dstNode && dstNode.t === "d" && src !== dstFull) target = (dstFull === "/" ? "" : dstFull) + "/" + baseName(src);
      if (sn.t === "d" && (target === src || target.indexOf(src + "/") === 0)) {
        errs.push("mv: impossible de déplacer '" + srcRaw + "' dans lui-même"); code = 1; return;
      }
      const par = parentDir(target);
      if (!par || par.t !== "d") { errs.push("mv: impossible de créer '" + dstRaw + "': Aucun fichier ou dossier de ce type"); code = 1; return; }
      if (src === target) return;
      par.children[baseName(target)] = sn;
      removeNode(src);
    });
    return { out: [], err: errs, code: code };
  };

  CMD.rm = function (args) {
    const o = opts(args);
    if (!o.rest.length) return fail("rm: opérande manquant");
    const errs = [];
    let code = 0;
    o.rest.forEach(function (p) {
      const full = resolve(p);
      if (full === "/") {
        errs.push("rm: opération refusée: protection de la démo (imaginez le désastre…)");
        code = 1; return;
      }
      const node = getNode(full);
      if (!node) {
        if (!o.flags.f) { errs.push("rm: impossible de supprimer '" + p + "': Aucun fichier ou dossier de ce type"); code = 1; }
        return;
      }
      if (node.t === "d" && !o.flags.r && !o.flags.R) {
        errs.push("rm: impossible de supprimer '" + p + "': Est un dossier"); code = 1; return;
      }
      removeNode(full);
    });
    return { out: [], err: errs, code: code };
  };

  function numberArg(args, def) {
    let n = def;
    let rest = args.slice();
    if (rest[0] === "-n" && rest[1] != null) { n = parseInt(rest[1], 10); rest = rest.slice(2); }
    else if (rest[0] && /^-\d+$/.test(rest[0])) { n = parseInt(rest[0].slice(1), 10); rest = rest.slice(1); }
    return { n: isNaN(n) ? def : n, rest: rest };
  }

  CMD.head = function (args, ctx) {
    const a = numberArg(args, 10);
    const files = a.rest;
    if (!files.length) return res(linesOf(ctx.stdin).slice(0, a.n), [], 0);
    const out = [], errs = [];
    let code = 0;
    files.forEach(function (p, idx) {
      const text = readText(resolve(p));
      if (text == null) { errs.push("head: impossible d'ouvrir '" + p + "' pour lecture: Aucun fichier ou dossier de ce type"); code = 1; return; }
      if (files.length > 1) { if (idx) out.push(""); out.push("==> " + p + " <=="); }
      linesOf(text).slice(0, a.n).forEach(function (ln) { out.push(ln); });
    });
    return { out: out, err: errs, code: code };
  };

  CMD.tail = function (args, ctx) {
    const a = numberArg(args, 10);
    const files = a.rest;
    if (!files.length) {
      const l = linesOf(ctx.stdin);
      return res(l.slice(Math.max(0, l.length - a.n)), [], 0);
    }
    const out = [], errs = [];
    let code = 0;
    files.forEach(function (p, idx) {
      const text = readText(resolve(p));
      if (text == null) { errs.push("tail: impossible d'ouvrir '" + p + "' pour lecture: Aucun fichier ou dossier de ce type"); code = 1; return; }
      if (files.length > 1) { if (idx) out.push(""); out.push("==> " + p + " <=="); }
      const l = linesOf(text);
      l.slice(Math.max(0, l.length - a.n)).forEach(function (ln) { out.push(ln); });
    });
    return { out: out, err: errs, code: code };
  };

  CMD.wc = function (args, ctx) {
    const o = opts(args);
    const files = o.rest;
    const wantAll = !o.flags.l && !o.flags.w && !o.flags.c;
    function counts(text) {
      const lines = linesOf(text).length;
      const words = String(text || "").trim() ? String(text).trim().split(/\s+/).length : 0;
      return { l: lines, w: words, c: String(text || "").length };
    }
    const out = [], errs = [];
    let code = 0;
    const totals = { l: 0, w: 0, c: 0 };
    function fmt(c, name) {
      let s = "";
      if (wantAll || o.flags.l) s += padStart(c.l, 7);
      if (wantAll || o.flags.w) s += padStart(c.w, 7);
      if (wantAll || o.flags.c) s += padStart(c.c, 7);
      return s + " " + name;
    }
    if (!files.length) return res([fmt(counts(ctx.stdin), "").trim()], [], 0);
    files.forEach(function (p) {
      const text = readText(resolve(p));
      if (text == null) { errs.push("wc: " + p + ": Aucun fichier ou dossier de ce type"); code = 1; return; }
      const c = counts(text);
      totals.l += c.l; totals.w += c.w; totals.c += c.c;
      out.push(fmt(c, p));
    });
    if (files.length > 1) out.push(fmt(totals, "total"));
    return { out: out, err: errs, code: code };
  };

  CMD.ln = function (args) {
    const o = opts(args);
    if (o.rest.length < 2) return fail("ln: opérande manquant");
    const target = o.rest[0], linkRaw = o.rest[1];
    const full = resolve(linkRaw);
    if (getNode(full)) return fail("ln: impossible de créer le lien '" + linkRaw + "': Le fichier existe");
    if (!getNode(resolve(target))) return fail("ln: impossible de créer le lien '" + linkRaw + "': Aucun fichier ou dossier de ce type");
    if (!insertNode(full, o.flags.s ? l(target) : nodeCopy(getNode(resolve(target))))) {
      return fail("ln: impossible de créer le lien '" + linkRaw + "'");
    }
    return res([], [], 0);
  };

  CMD.file = function (args) {
    if (!args.length) return fail("file: opérande manquant");
    const out = [];
    args.forEach(function (p) {
      const node = getNode(resolve(p));
      if (!node) { out.push(p + ": cannot open '" + p + "' (No such file or directory)"); return; }
      let desc = "ASCII text";
      if (node.t === "d") desc = "directory";
      else if (node.t === "l") desc = "symbolic link to " + node.target;
      else if (!node.content) desc = "empty";
      else if (node.content.indexOf("#!") === 0) desc = "Bourne-Again shell script, ASCII text executable";
      else if (/^[\x00-\x7F\s]*$/.test(node.content)) desc = "ASCII text";
      out.push(p + ": " + desc);
    });
    return res(out, [], 0);
  };

  CMD.du = function (args) {
    const o = opts(args);
    const paths = o.rest.length ? o.rest : ["."];
    const out = [];
    function total(p) {
      const node = getNode(p);
      if (!node) return 0;
      if (node.t !== "d") return nodeSize(node);
      let s = 4096;
      Object.keys(node.children).forEach(function (k) {
        const child = (p === "/" ? "" : p) + "/" + k;
        s += total(child);
      });
      return s;
    }
    paths.forEach(function (p) {
      const full = resolve(p);
      const node = getNode(full);
      if (!node) { out.push("du: impossible d'accéder à '" + p + "': Aucun fichier ou dossier de ce type"); return; }
      if (o.flags.s) {
        const s = total(full);
        out.push((o.flags.h ? human(s) : Math.ceil(s / 1024)) + "\t" + p);
      } else {
        const s = total(full);
        out.push((o.flags.h ? human(s) : Math.ceil(s / 1024)) + "\t" + p);
        if (node.t === "d") {
          Object.keys(node.children).sort().forEach(function (k) {
            const child = node.children[k];
            if (child.t === "d") {
              const cs = total((full === "/" ? "" : full) + "/" + k);
              out.push((o.flags.h ? human(cs) : Math.ceil(cs / 1024)) + "\t" + p.replace(/\/$/, "") + "/" + k);
            }
          });
        }
      }
    });
    return res(out, [], 0);
  };

  CMD.df = function () {
    return res([
      "Sys. de fichiers  Taille Utilisé Dispo Uti% Monté sur",
      "/dev/sda1           50G     12G   35G  26% /",
      "tmpfs              2,0G       0  2,0G   0% /dev/shm",
      "/dev/sdb1          100G     48G   47G  51% /home"
    ], [], 0);
  };

  /* ============================ Filters ============================ */
  CMD.grep = function (args, ctx) {
    const o = opts(args);
    if (!o.rest.length) return fail("grep: motif manquant");
    const pattern = o.rest[0];
    const targets = o.rest.slice(1);
    let re;
    try { re = new RegExp(pattern, o.flags.i ? "i" : ""); }
    catch (e) { return fail("grep: expression régulière invalide"); }
    const out = [], errs = [];
    let code = 1;

    function scan(text, label, showLabel) {
      const lines = linesOf(text);
      let count = 0;
      lines.forEach(function (ln, idx) {
        const match = re.test(ln);
        if (o.flags.v ? match : !match) return;
        count++;
        if (o.flags.c) return;
        const pre = (showLabel ? label + ":" : "") + (o.flags.n ? (idx + 1) + ":" : "");
        out.push(pre + ln);
      });
      if (o.flags.c) out.push((showLabel ? label + ":" : "") + count);
      if (count > 0) code = 0;
      if (o.flags.l && count > 0) out.push(label);
    }

    if (!targets.length) {
      if (ctx.stdin == null) return fail("grep: aucun fichier spécifié", 2);
      scan(ctx.stdin, "(standard input)", false);
    } else {
      targets.forEach(function (p) {
        const full = resolve(p);
        const node = getNode(full);
        if (!node) { errs.push("grep: " + p + ": Aucun fichier ou dossier de ce type"); return; }
        if (node.t === "d") {
          if (!o.flags.r) { errs.push("grep: " + p + ": Est un dossier"); return; }
          eachNode(full, function (path, n) {
            if (n.t === "f") scan(n.content, path, true);
          });
        } else {
          const text = node.t === "l" ? readText(full) : node.content;
          scan(text || "", p, targets.length > 1);
        }
      });
    }
    return { out: out, err: errs, code: code };
  };

  CMD.find = function (args) {
    let start = ".";
    let i = 0;
    if (args.length && args[0].charAt(0) !== "-") { start = args[0]; i = 1; }
    let namePat = null, type = null, iname = false, maxdepth = null;
    for (; i < args.length; i++) {
      const a = args[i];
      if (a === "-name" && args[i + 1] != null) { namePat = args[++i]; iname = false; }
      else if (a === "-iname" && args[i + 1] != null) { namePat = args[++i]; iname = true; }
      else if (a === "-type" && args[i + 1] != null) { type = args[++i]; }
      else if (a === "-maxdepth" && args[i + 1] != null) { maxdepth = parseInt(args[++i], 10); }
    }
    const full = resolve(start);
    const root = getNode(full);
    if (!root) return fail("find: '" + start + "': Aucun fichier ou dossier de ce type");
    const out = [];
    const re = namePat ? globToRe(namePat) : null;
    if (iname && namePat) {
      // case-insensitive simple match
    }
    const prefix = start === "/" ? "" : (start.replace(/\/+$/, "") === "." ? "." : start);
    function joinPath(base, name) {
      if (base === "/") return "/" + name;
      return base + "/" + name;
    }
    function walk(path, name, node, depth) {
      const okName = !re || re.test(name) || (iname && new RegExp(re.source, "i").test(name));
      const okType = !type || (type === "f" && node.t === "f") || (type === "d" && node.t === "d") || (type === "l" && node.t === "l");
      if (path !== start && okName && okType) out.push(path);
      if (node.t === "d" && (maxdepth == null || depth < maxdepth)) {
        Object.keys(node.children).sort().forEach(function (k) {
          walk(joinPath(path, k), k, node.children[k], depth + 1);
        });
      }
    }
    if (start === ".") {
      walk(".", ".", root, 0);
    } else {
      if ((!re || re.test(baseName(full))) && (!type || root.t === type)) out.push(start);
      if (root.t === "d") {
        Object.keys(root.children).sort().forEach(function (k) {
          walk(joinPath(prefix, k), k, root.children[k], 1);
        });
      }
    }
    return res(out, [], 0);
  };

  function inputLines(o, ctx) {
    if (o.rest.length) {
      let text = "";
      o.rest.forEach(function (p) {
        const t = readText(resolve(p)) || "";
        text += t;
        if (t && t.charAt(t.length - 1) !== "\n") text += "\n";
      });
      return linesOf(text);
    }
    return linesOf(ctx.stdin);
  }

  CMD.sort = function (args, ctx) {
    const o = opts(args);
    let lines = inputLines(o, ctx);
    if (o.flags.u) lines = Array.from(new Set(lines));
    lines.sort(function (a, b) {
      if (o.flags.n) return parseFloat(a) - parseFloat(b);
      return a.localeCompare(b, "fr");
    });
    if (o.flags.r) lines.reverse();
    return res(lines, [], 0);
  };

  CMD.uniq = function (args, ctx) {
    const o = opts(args);
    const lines = inputLines(o, ctx);
    const out = [];
    let i = 0;
    while (i < lines.length) {
      let j = i + 1;
      while (j < lines.length && lines[j] === lines[i]) j++;
      const n = j - i;
      out.push(o.flags.c ? padStart(n, 7) + " " + lines[i] : lines[i]);
      i = j;
    }
    return res(out, [], 0);
  };

  CMD.cut = function (args, ctx) {
    let delim = "\t";
    let fields = null, chars = null;
    const files = [];
    let i = 0;
    while (i < args.length) {
      const a = args[i], m = a.match(/^-(d|f|c)(.*)$/);
      if (m) {
        let val = m[2];
        if (val === "" && args[i + 1] != null) { val = args[i + 1]; i++; }
        if (m[1] === "d") delim = val;
        else if (m[1] === "f") fields = val;
        else chars = val;
      } else if (a.charAt(0) !== "-") files.push(a);
      i++;
    }
    let lines = [];
    if (files.length) {
      files.forEach(function (p) {
        const t = readText(resolve(p));
        if (t != null) lines = lines.concat(linesOf(t));
      });
    } else {
      lines = linesOf(ctx.stdin);
    }
    function idxList(spec) {
      const list = [];
      String(spec).split(",").forEach(function (p) {
        const m = p.match(/^(\d+)-(\d+)$/);
        if (m) { for (let k = +m[1]; k <= +m[2]; k++) list.push(k); }
        else if (p) list.push(+p);
      });
      return list;
    }
    const fl = fields ? idxList(fields) : [];
    const cl = chars ? idxList(chars) : [];
    const out = lines.map(function (ln) {
      if (cl.length) return cl.map(function (k) { return ln.charAt(k - 1); }).join("");
      const parts = delim === "\t" ? ln.split(/\t/) : ln.split(delim);
      return fl.map(function (k) { return parts[k - 1] != null ? parts[k - 1] : ""; }).join(delim);
    });
    return res(out, [], 0);
  };

  function expandSet(s) {
    const out = [];
    for (let i = 0; i < s.length; i++) {
      if (s[i + 1] === "-" && s[i + 2] != null) {
        const a = s.charCodeAt(i), b = s.charCodeAt(i + 2);
        for (let c = a; c <= b; c++) out.push(String.fromCharCode(c));
        i += 2;
      } else out.push(s[i]);
    }
    return out;
  }

  CMD.tr = function (args, ctx) {
    const o = opts(args);
    if (!o.rest.length) return fail("tr: opérande manquant");
    const set1 = expandSet(o.rest[0]);
    const set2 = o.rest[1] ? expandSet(o.rest[1]) : [];
    let text = ctx.stdin != null ? ctx.stdin : "";
    if (o.flags.d) {
      const del = new Set(set1);
      text = text.split("").filter(function (c) { return !del.has(c); }).join("");
    } else {
      text = text.split("").map(function (c) {
        const i = set1.indexOf(c);
        if (i === -1) return c;
        return set2.length ? set2[Math.min(i, set2.length - 1)] : c;
      }).join("");
    }
    return res(linesOf(text), [], 0);
  };

  CMD.diff = function (args) {
    if (args.length < 2) return fail("diff: opérande manquant");
    const a = readText(resolve(args[0])), b = readText(resolve(args[1]));
    if (a == null) return fail("diff: " + args[0] + ": Aucun fichier ou dossier de ce type", 2);
    if (b == null) return fail("diff: " + args[1] + ": Aucun fichier ou dossier de ce type", 2);
    const la = linesOf(a), lb = linesOf(b);
    if (a === b) return res([], [], 0);
    const out = ["--- " + args[0], "+++ " + args[1]];
    const max = Math.max(la.length, lb.length);
    for (let i = 0; i < max; i++) {
      if (la[i] !== lb[i]) {
        if (la[i] != null) out.push("< " + la[i]);
        if (lb[i] != null) out.push("> " + lb[i]);
      }
    }
    return { out: out, err: [], code: 1 };
  };

  CMD.paste = function (args) {
    if (args.length < 2) return fail("paste: opérande manquant");
    const a = linesOf(readText(resolve(args[0])) || "");
    const b = linesOf(readText(resolve(args[1])) || "");
    const out = [];
    const max = Math.max(a.length, b.length);
    for (let i = 0; i < max; i++) out.push((a[i] || "") + "\t" + (b[i] || ""));
    return res(out, [], 0);
  };

  CMD.which = function (args) {
    if (!args.length) return fail("which: opérande manquant");
    const out = [];
    let code = 0;
    args.forEach(function (name) {
      if (CMD[name]) out.push("/usr/bin/" + name);
      else { out.push("which: aucune " + name + " dans (" + state.env.PATH + ")"); code = 1; }
    });
    return { out: out, err: [], code: code };
  };

  CMD.locate = function (args) {
    if (!args.length) return fail("locate: motif manquant");
    const re = globToRe(args[0]);
    const out = [];
    eachNode("/", function (path, node) {
      if (path === "/") return;
      if (re.test(baseName(path)) || path.indexOf(args[0]) > -1) out.push(path);
    });
    return res(out, [], 0);
  };

  /* ============================ Permissions & système ============================ */
  function applySymbolic(mode, expr) {
    const digits = String(mode || "644").padStart(3, "0").split("").map(Number);
    const clauses = String(expr).split(",");
    let valid = true;
    clauses.forEach(function (clause) {
      const m = clause.match(/^([ugoa]*)([+\-=])([rwx]*)$/);
      if (!m) { valid = false; return; }
      let who = m[1] || "a";
      const op = m[2], perms = m[3];
      let idx = [];
      if (who.indexOf("a") > -1) idx = [0, 1, 2];
      else {
        if (who.indexOf("u") > -1) idx.push(0);
        if (who.indexOf("g") > -1) idx.push(1);
        if (who.indexOf("o") > -1) idx.push(2);
      }
      let bits = 0;
      if (perms.indexOf("r") > -1) bits |= 4;
      if (perms.indexOf("w") > -1) bits |= 2;
      if (perms.indexOf("x") > -1) bits |= 1;
      idx.forEach(function (k) {
        if (op === "+") digits[k] = digits[k] | bits;
        else if (op === "-") digits[k] = digits[k] & ~bits;
        else digits[k] = bits;
      });
    });
    return valid ? digits.join("") : null;
  }

  CMD.chmod = function (args) {
    const o = opts(args);
    if (o.rest.length < 2) return fail("chmod: opérande manquant");
    const spec = o.rest[0];
    const targets = o.rest.slice(1);
    const errs = [];
    let code = 0;
    function apply(node, path) {
      if (node.t === "l") return;
      if (/^[0-7]{3,4}$/.test(spec)) {
        node.mode = spec.slice(-3);
      } else {
        const nm = applySymbolic(node.mode, spec);
        if (!nm) { errs.push("chmod: mode invalide: '" + spec + "'"); code = 1; return; }
        node.mode = nm;
      }
      if (o.flags.R && node.t === "d") {
        Object.keys(node.children).forEach(function (k) {
          apply(node.children[k], path + "/" + k);
        });
      }
    }
    targets.forEach(function (p) {
      const full = resolve(p);
      const node = getNode(full);
      if (!node) { errs.push("chmod: impossible d'accéder à '" + p + "': Aucun fichier ou dossier de ce type"); code = 1; return; }
      apply(node, full);
    });
    return { out: [], err: errs, code: code };
  };

  function ownerChange(args, cmdName) {
    if (args.length < 2) return fail(cmdName + ": opérande manquant");
    const spec = args[0];
    const targets = args.slice(1);
    const errs = [];
    let code = 0;
    const parts = spec.split(":");
    targets.forEach(function (p) {
      const node = getNode(resolve(p));
      if (!node) { errs.push(cmdName + ": impossible d'accéder à '" + p + "': Aucun fichier ou dossier de ce type"); code = 1; return; }
      if (cmdName === "chown") {
        if (parts[0]) { node.owner = parts[0]; node.group = parts[0]; }
        if (parts[1]) node.group = parts[1];
      } else {
        node.group = parts[1] || parts[0];
      }
    });
    return { out: [], err: errs, code: code };
  }
  CMD.chown = function (args) { return ownerChange(args, "chown"); };
  CMD.chgrp = function (args) { return ownerChange(args, "chgrp"); };

  CMD.umask = function (args) {
    if (!args.length) return okOut("0022");
    if (!/^[0-7]{3,4}$/.test(args[0])) return fail("bash: umask: " + args[0] + ": masque octal invalide");
    return res([], [], 0);
  };

  CMD.whoami = function () { return okOut(state.user); };

  CMD.id = function () {
    if (state.user === "root") return okOut("uid=0(root) gid=0(root) groupes=0(root)");
    return okOut("uid=1000(etudiant) gid=1000(etudiant) groupes=1000(etudiant),27(sudo)");
  };

  CMD.groups = function () {
    return okOut(state.user === "root" ? "root" : "etudiant sudo");
  };

  CMD.date = function (args) {
    const now = new Date();
    if (args[0] && /^\+/.test(args[0])) {
      const fmt = args[0].slice(1)
        .replace(/%Y/g, now.getFullYear())
        .replace(/%m/g, padStart(now.getMonth() + 1, 2))
        .replace(/%d/g, padStart(now.getDate(), 2))
        .replace(/%H/g, padStart(now.getHours(), 2))
        .replace(/%M/g, padStart(now.getMinutes(), 2))
        .replace(/%S/g, padStart(now.getSeconds(), 2));
      return okOut(fmt);
    }
    const s = now.toLocaleString("fr-FR", {
      weekday: "short", day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit"
    });
    return okOut(s + " UTC");
  };

  CMD.hostname = function () { return okOut(state.host); };

  CMD.uname = function (args) {
    const o = opts(args);
    const all = "Linux " + state.host + " 6.8.0-badrai #1 SMP PREEMPT_DYNAMIC x86_64 GNU/Linux";
    if (o.flags.a) return okOut(all);
    let parts = [];
    if (o.flags.s || !Object.keys(o.flags).length) parts.push("Linux");
    if (o.flags.n) parts.push(state.host);
    if (o.flags.r) parts.push("6.8.0-badrai");
    if (o.flags.m) parts.push("x86_64");
    if (o.flags.v) parts.push("#1 SMP PREEMPT_DYNAMIC");
    if (o.flags.o) parts.push("GNU/Linux");
    return okOut(parts.join(" "));
  };

  CMD.ps = function (args) {
    const o = opts(args);
    const out = [];
    if (o.flags.f || o.flags.e) {
      out.push("UID        PID  PPID  C STIME TTY          TIME CMD");
      state.procs.forEach(function (p) {
        out.push(pad(p.user, 8) + " " + padStart(p.pid, 6) + " " + padStart(p.pid === 1 ? 0 : 1, 5) +
          "  0 08:00 " + pad(p.tty, 8) + " 00:00:0" + (p.pid % 9) + " " + p.cmd);
      });
    } else {
      out.push("  PID TTY          TIME CMD");
      state.procs.forEach(function (p) {
        out.push(padStart(p.pid, 5) + " " + pad(p.tty, 8) + " 00:00:0" + (p.pid % 9) + " " + p.cmd);
      });
    }
    return res(out, [], 0);
  };

  CMD.kill = function (args) {
    const o = opts(args);
    if (!o.rest.length) return fail("kill: usage: kill [-s sigspec | -n signum] pid…");
    const errs = [];
    let code = 0;
    o.rest.forEach(function (pidRaw) {
      const pid = parseInt(pidRaw, 10);
      const idx = state.procs.findIndex(function (p) { return p.pid === pid; });
      if (idx === -1) { errs.push("bash: kill: (" + pidRaw + ") - Aucun processus de ce type"); code = 1; return; }
      state.procs.splice(idx, 1);
    });
    return { out: [], err: errs, code: code };
  };

  /* ============================ tar ============================ */
  function tarEntries(targets) {
    const entries = [];
    let bad = null;
    targets.forEach(function (t) {
      const full = resolve(t);
      const node = getNode(full);
      if (!node) { bad = t; return; }
      entries.push({ name: baseName(full), node: nodeCopy(node) });
    });
    return { entries: entries, bad: bad };
  }

  function writeArchive(path, entries) {
    return writeFile(path, "TARJSON:" + JSON.stringify(entries), false);
  }

  function readArchive(path) {
    const text = readText(resolve(path));
    if (text == null) return null;
    if (text.indexOf("TARJSON:") !== 0) return null;
    try { return JSON.parse(text.slice(8)); } catch (e) { return null; }
  }

  function archiveNames(entries) {
    const out = [];
    function walk(prefix, node) {
      out.push(prefix);
      if (node.t === "d") {
        Object.keys(node.children).sort().forEach(function (k) { walk(prefix + "/" + k, node.children[k]); });
      }
    }
    entries.forEach(function (e) { walk(e.name, e.node); });
    return out;
  }

  CMD.tar = function (args) {
    const o = opts(args);
    if (!o.rest.length) return fail("tar: Vous devez spécifier l'option -f");
    const archive = o.rest[0];
    const rest = o.rest.slice(1);
    if (o.flags.c) {
      if (!rest.length) return fail("tar: Veuillez spécifier les fichiers à archiver");
      const built = tarEntries(rest);
      if (built.bad) return fail("tar: " + built.bad + ": Aucun fichier ou dossier de ce type", 2);
      if (!writeArchive(resolve(archive), built.entries)) return fail("tar: impossible de créer l'archive");
      return res(o.flags.v ? archiveNames(built.entries) : [], [], 0);
    }
    const entries = readArchive(archive);
    if (!entries) return fail("tar: " + archive + ": Ceci ne ressemble pas à une archive tar");
    if (o.flags.t) return res(archiveNames(entries), [], 0);
    if (o.flags.x) {
      const dest = o.flags.C && rest.length ? resolve(rest[0]) : state.cwd;
      const destNode = getNode(dest);
      if (!destNode || destNode.t !== "d") return fail("tar: " + dest + ": Aucun fichier ou dossier de ce type", 2);
      entries.forEach(function (e) {
        destNode.children[e.name] = e.node;
      });
      return res(o.flags.v ? archiveNames(entries) : [], [], 0);
    }
    return fail("tar: Vous devez spécifier l'une des options -c, -x ou -t");
  };

  /* ============================ Manuels ============================ */
  const MAN = {
    ls: "LS(1)\n\nNOM\n    ls - affiche le contenu des répertoires\n\nSYNOPSIS\n    ls [-la] [fichier…]\n\nOPTIONS\n    -l  format long (droits, propriétaire, taille, date)\n    -a  affiche aussi les fichiers cachés (commençant par .)\n    -h  tailles lisibles (Ko, Mo)\n\nEXEMPLES\n    ls -l /home/etudiant\n    ls -la",
    cd: "CD(1)\n\nNOM\n    cd - change de répertoire\n\nSYNOPSIS\n    cd [répertoire]\n\n    cd        retourne au répertoire personnel (~)\n    cd ..     remonte au répertoire parent\n    cd -      revient au répertoire précédent\n    cd /etc   va dans /etc",
    pwd: "PWD(1)\n\nNOM\n    pwd - affiche le chemin du répertoire courant\n\nSYNOPSIS\n    pwd",
    cp: "CP(1)\n\nNOM\n    cp - copie des fichiers et répertoires\n\nSYNOPSIS\n    cp [-r] source destination\n\nOPTIONS\n    -r  copie récursive (obligatoire pour un répertoire)\n\nEXEMPLE\n    cp -r Documents /tmp/sauvegarde",
    mv: "MV(1)\n\nNOM\n    mv - déplace ou renomme\n\nSYNOPSIS\n    mv source destination\n\nEXEMPLES\n    mv notes.txt notes.old\n    mv notes.txt Documents/",
    rm: "RM(1)\n\nNOM\n    rm - supprime des fichiers ou répertoires\n\nSYNOPSIS\n    rm [-r] [-f] fichier…\n\nOPTIONS\n    -r  récursif (répertoires)\n    -f  force, sans confirmation\n\nATTENTION\n    rm -rf / est refusé dans cette démo. Sur un vrai système, c'est irréversible.",
    cat: "CAT(1)\n\nNOM\n    cat - concatène et affiche des fichiers\n\nSYNOPSIS\n    cat [-n] [fichier…]\n\nEXEMPLE\n    cat /etc/passwd",
    echo: "ECHO(1)\n\nNOM\n    echo - affiche une ligne de texte\n\nSYNOPSIS\n    echo [-n] [-e] [texte…]\n\nEXEMPLES\n    echo Bonjour\n    echo $HOME\n    echo \"Badr AI\" > fichier.txt",
    head: "HEAD(1)\n\nNOM\n    head - affiche le début d'un fichier\n\nSYNOPSIS\n    head [-n N] [fichier]\n\nEXEMPLE\n    head -n 3 /etc/passwd",
    tail: "TAIL(1)\n\nNOM\n    tail - affiche la fin d'un fichier\n\nSYNOPSIS\n    tail [-n N] [fichier]\n\nEXEMPLE\n    tail -n 5 /var/log/messages",
    wc: "WC(1)\n\nNOM\n    wc - compte lignes, mots et caractères\n\nSYNOPSIS\n    wc [-l] [-w] [-c] [fichier]\n\nEXEMPLE\n    wc -l /etc/passwd",
    grep: "GREP(1)\n\nNOM\n    grep - recherche un motif dans le contenu des fichiers\n\nSYNOPSIS\n    grep [-ivncr] motif [fichier…]\n\nOPTIONS\n    -i  ignore la casse\n    -v  inverse (lignes sans le motif)\n    -n  numéros de ligne\n    -c  compte les lignes\n    -r  récursif\n\nEXEMPLES\n    grep root /etc/passwd\n    grep -i bash /etc/passwd",
    find: "FIND(1)\n\nNOM\n    find - cherche dans l'arborescence\n\nSYNOPSIS\n    find répertoire [-name motif] [-type f|d]\n\nEXEMPLES\n    find /home -name \"*.c\"\n    find . -type d",
    chmod: "CHMOD(1)\n\nNOM\n    chmod - modifie les droits d'accès\n\nSYNOPSIS\n    chmod [-R] mode fichier…\n\nMODES\n    Octal   : 755 = rwxr-xr-x, 644 = rw-r--r--\n    Symbolique : u+x, g-w, o=r, a=rw\n\nEXEMPLES\n    chmod 755 script.sh\n    chmod u+x script.sh\n    chmod -R 644 Documents",
    chown: "CHOWN(1)\n\nNOM\n    chown - change le propriétaire (et le groupe)\n\nSYNOPSIS\n    chown [-R] utilisateur[:groupe] fichier…\n\nEXEMPLE\n    chown etudiant:etudiant notes.txt",
    ln: "LN(1)\n\nNOM\n    ln - crée des liens physiques ou symboliques\n\nSYNOPSIS\n    ln [-s] cible lien\n\n    ln -s crée un lien symbolique (raccourci vers un chemin)\n    ln    crée un lien physique (même inode)",
    tar: "TAR(1)\n\nNOM\n    tar - crée, liste ou extrait des archives\n\nSYNOPSIS\n    tar -czf archive.tar.gz dossier\n    tar -tzf archive.tar.gz\n    tar -xzf archive.tar.gz [-C destination]\n\nOPTIONS\n    c  créer    x  extraire    t  lister\n    z  gzip     f  fichier     v  verbeux",
    ps: "PS(1)\n\nNOM\n    ps - affiche les processus en cours\n\nSYNOPSIS\n    ps [-f]\n\nSTAT\n    R en exécution, S en attente, T suspendu, Z zombie",
    kill: "KILL(1)\n\nNOM\n    kill - envoie un signal à un processus\n\nSYNOPSIS\n    kill [-9] PID\n\n    -9  SIGKILL (arrêt forcé)\n    -15 SIGTERM (arrêt propre, par défaut)",
    man: "MAN(1)\n\nNOM\n    man - affiche le manuel d'une commande\n\nSYNOPSIS\n    man commande\n\nEXEMPLE\n    man chmod",
    mkdir: "MKDIR(1)\n\nNOM\n    mkdir - crée des répertoires\n\nSYNOPSIS\n    mkdir [-p] répertoire…\n\n    -p crée aussi les parents manquants",
    sort: "SORT(1)\n\nNOM\n    sort - trie les lignes d'un fichier\n\nOPTIONS\n    -n numérique   -r inverse   -u unique",
    cut: "CUT(1)\n\nNOM\n    cut - extrait des colonnes\n\nSYNOPSIS\n    cut -d séparateur -f champs fichier\n\nEXEMPLE\n    cut -d: -f1 /etc/passwd",
    history: "HISTORY(1)\n\nNOM\n    history - affiche l'historique des commandes\n\n    Utilisez ↑ / ↓ dans le terminal pour naviguer."
  };

  CMD.man = function (args) {
    if (!args.length) return fail("Quel est le manuel que vous voulez ?");
    if (MAN[args[0]]) return res(MAN[args[0]].split("\n"), [], 0);
    return fail("man: aucune entrée de manuel pour " + args[0]);
  };

  CMD.history = function () {
    return res(state.history.map(function (h, i) { return padStart(i + 1, 5) + "  " + h; }), [], 0);
  };

  CMD.clear = function () {
    return { out: [], err: [], code: 0, clear: true };
  };

  CMD.help = function () {
    return res([
      "Badr AI — Terminal Unix (démo pédagogique)",
      "",
      "Fichiers     ls  cd  pwd  mkdir  rmdir  touch  cat  cp  mv  rm",
      "Liens        ln -s      Archives : tar -czf / -xzf / -tf",
      "Filtres      head  tail  wc  grep  find  sort  uniq  cut  tr  diff  paste",
      "Droits       chmod  chown  chgrp  umask",
      "Système      whoami  id  groups  date  hostname  uname  ps  kill  du  df  file",
      "Shell        echo  alias  export  unset  source  expr  let  printf",
      "Aide         man cmd     clear     history",
      "Opérateurs   |   >   >>   2>   <   ;   &&   ||",
      "",
      "Astuce : Tab complète, ↑/↓ parcourt l'historique.",
      "Les 16 missions à droite vous guident pas à pas (indices en arabe)."
    ], [], 0);
  };

  CMD.reset = function () {
    const keep = state.completed;
    state.fs = buildFS();
    state.cwd = HOME;
    state.env.PWD = HOME;
    state.env.OLDPWD = HOME;
    state.lastCode = 0;
    state.completed = keep;
    return okOut("Session réinitialisée : système de fichiers et répertoire personnel restaurés.");
  };

  CMD.alias = function (args) {
    if (!args.length) {
      return res(Object.keys(state.aliases).sort().map(function (k) {
        return "alias " + k + "='" + state.aliases[k] + "'";
      }), [], 0);
    }
    const joined = args.join(" ");
    const eq = joined.indexOf("=");
    if (eq === -1) {
      const name = joined.trim();
      if (state.aliases[name]) return okOut("alias " + name + "='" + state.aliases[name] + "'");
      return fail("bash: alias: " + name + ": non trouvé");
    }
    const name = joined.slice(0, eq).trim();
    let value = joined.slice(eq + 1).trim();
    if ((value.charAt(0) === "'" && value.charAt(value.length - 1) === "'") ||
        (value.charAt(0) === '"' && value.charAt(value.length - 1) === '"')) {
      value = value.slice(1, -1);
    }
    state.aliases[name] = value;
    return res([], [], 0);
  };

  CMD.export = function (args) {
    if (!args.length) {
      return res(Object.keys(state.env).sort().map(function (k) {
        return "declare -x " + k + "=\"" + state.env[k] + "\"";
      }), [], 0);
    }
    args.forEach(function (a) {
      const eq = a.indexOf("=");
      if (eq > -1) {
        const k = a.slice(0, eq), v = a.slice(eq + 1);
        state.env[k] = v; state.vars[k] = v;
      } else {
        state.env[a] = lookupVar(a);
      }
    });
    return res([], [], 0);
  };

  CMD.unset = function (args) {
    args.forEach(function (a) { delete state.env[a]; delete state.vars[a]; });
    return res([], [], 0);
  };

  CMD.set = function (args) {
    if (!args.length) {
      const all = Object.assign({}, state.vars, state.env);
      return res(Object.keys(all).sort().map(function (k) { return k + "='" + all[k] + "'"; }), [], 0);
    }
    return res([], [], 0);
  };

  CMD.declare = function (args) {
    const o = opts(args);
    if (o.flags.F) return res([], [], 0);
    if (o.flags.p && o.rest.length) {
      return res(o.rest.map(function (n) { return "declare -- " + n + "=\"" + lookupVar(n) + "\""; }), [], 0);
    }
    if (o.flags.p) {
      return res(Object.keys(state.vars).sort().map(function (k) {
        return "declare -- " + k + "=\"" + state.vars[k] + "\"";
      }), [], 0);
    }
    o.rest.forEach(function (a) {
      const eq = a.indexOf("=");
      if (eq > -1) state.vars[a.slice(0, eq)] = a.slice(eq + 1);
      else if (o.flags.i) state.vars[a] = "0";
      else state.vars[a] = "";
      if (o.flags.x) state.env[a.split("=")[0]] = lookupVar(a.split("=")[0]);
    });
    return res([], [], 0);
  };

  CMD.read = function () {
    return fail("read: saisie interactive non disponible dans la démo (utilisez un script ou le cours).", 1);
  };

  CMD.sleep = function (args) {
    if (!args.length) return fail("sleep: opérande manquant");
    if (!/^\d+(\.\d+)?$/.test(args[0])) return fail("sleep: durée invalide: '" + args[0] + "'");
    return res([], [], 0);
  };

  function evalArith(expr) {
    let s = String(expr).replace(/\\/g, "").replace(/\$([A-Za-z_][A-Za-z0-9_]*)/g, function (m, n) {
      const v = lookupVar(n);
      return /^-?\d+$/.test(v) ? v : "0";
    });
    s = s.replace(/([A-Za-z_][A-Za-z0-9_]*)/g, function (m) {
      const v = lookupVar(m);
      return /^-?\d+$/.test(v) ? v : "0";
    });
    s = s.replace(/([^=!<>])=([^=])/g, "$1==$2");
    if (!/^[\d\s+\-*/%()<>=!.&|]+$/.test(s)) return null;
    try {
      const v = Function('"use strict"; return (' + s + ");")();
      if (typeof v === "boolean") return v ? 1 : 0;
      if (typeof v !== "number" || !isFinite(v)) return null;
      return Math.trunc(v);
    } catch (e) { return null; }
  }

  CMD.expr = function (args) {
    if (!args.length) return fail("expr: opérande manquant");
    const v = evalArith(args.join(" "));
    if (v == null) return fail("expr: syntax error");
    return { out: [String(v)], err: [], code: v === 0 ? 1 : 0 };
  };

  CMD.let = function (args) {
    if (!args.length) return fail("let: opérande manquant");
    const v = evalArith(args.join(" "));
    if (v == null) return fail("bash: let: syntax error");
    return res([], [], v === 0 ? 1 : 0);
  };

  CMD.printf = function (args) {
    if (!args.length) return fail("printf: usage: printf format [arguments]");
    let fmt = args[0];
    const params = args.slice(1);
    fmt = fmt.replace(/\\n/g, "\n").replace(/\\t/g, "\t").replace(/\\\\/g, "\\");
    let i = 0;
    const text = fmt.replace(/%[sd]/g, function (m) {
      const v = params[i++];
      if (v == null) return m === "%d" ? "0" : "";
      return m === "%d" ? String(parseInt(v, 10) || 0) : v;
    });
    return res(linesOf(text), [], 0);
  };

  CMD.jobs = function () { return res([], [], 0); };
  CMD.bg = function () { return fail("bash: bg: aucune tâche en cours", 1); };
  CMD.fg = function () { return fail("bash: fg: aucune tâche en cours", 1); };
  CMD.wait = function () { return res([], [], 0); };

  CMD.su = function () {
    return fail("su: mot de passe requis — l'authentification est désactivée dans cette démo. Essayez sudo.", 1);
  };

  CMD.sudo = function (args) {
    if (!args.length) return fail("usage: sudo commande [arguments]");
    const prev = state.user;
    state.user = "root";
    const r = execLine(args.join(" "), { silent: true, depth: state.depth + 1 });
    state.user = prev;
    return r;
  };

  CMD.passwd = function (args) {
    if (args.length) return okOut("passwd: mot de passe mis à jour avec succès (démo).");
    return okOut("passwd: modification du mot de passe (démo) — utilisez passwd utilisateur.");
  };

  CMD.adduser = CMD.useradd = function (args) {
    if (!args.length) return fail("adduser: nom d'utilisateur manquant");
    const name = args[0];
    if (!/^[a-z][a-z0-9_-]*$/.test(name)) return fail("adduser: nom d'utilisateur invalide: '" + name + "'");
    const passwd = getNode("/etc/passwd");
    if (passwd && passwd.content.indexOf(name + ":") === -1) {
      passwd.content += name + ":x:1002:1002:" + name + ":/home/" + name + ":/bin/bash\n";
    }
    if (!getNode("/home/" + name)) getNode("/home").children[name] = d({}, name);
    return okOut("Ajout de l'utilisateur « " + name + " »…\nAjout du nouvel utilisateur « " + name + " » avec le groupe « " + name + " »…\nAjout du nouvel utilisateur au groupe « sudo »…\nTerminé.");
  };

  CMD.deluser = CMD.userdel = function (args) {
    if (!args.length) return fail("deluser: nom d'utilisateur manquant");
    const name = args[0];
    const passwd = getNode("/etc/passwd");
    if (passwd && passwd.content.indexOf(name + ":") === -1) return fail("deluser: l'utilisateur « " + name + " » n'existe pas");
    if (passwd) passwd.content = passwd.content.split("\n").filter(function (l) { return l.indexOf(name + ":") !== 0; }).join("\n");
    if (getNode("/home/" + name)) delete getNode("/home").children[name];
    return okOut("Suppression de l'utilisateur « " + name + " »…\nTerminé.");
  };

  CMD.usermod = function (args) {
    if (args.length < 2) return fail("usermod: arguments manquants");
    return okOut("usermod: utilisateur « " + args[0] + " » modifié (démo).");
  };

  CMD.addgroup = CMD.groupadd = function (args) {
    if (!args.length) return fail("addgroup: nom de groupe manquant");
    return okOut("Ajout du groupe « " + args[0] + " »…\nTerminé.");
  };

  CMD.top = function () {
    const out = [
      "top - 08:42:13 up 42 min,  1 user,  load average: 0,08, 0,12, 0,09",
      "Tâches: 5 total,   1 en cours,   4 en veille,   0 arrêté,   0 zombie",
      "%Cpu(s):  2,0 us,  0,7 sy,  0,0 ni, 96,8 id",
      "MiB Mem :   3936,2 total,   2140,5 libre,    980,3 utilisé",
      "",
      "  PID UTILISATEUR  PR  NI    VIRT    RES  %CPU  %MEM     TEMPS+ COMMANDE"
    ];
    state.procs.forEach(function (p) {
      out.push(padStart(p.pid, 5) + " " + pad(p.user, 11) + " 20   0  120000  18000   0,3   0,5   0:00.02 " + p.cmd);
    });
    out.push("(démo statique — appuyez sur q pour quitter)");
    return res(out, [], 0);
  };

  CMD.w = function () {
    return res([
      " 08:42:13 up 42 min,  1 user,  load average: 0,08, 0,12, 0,09",
      "USER     TTY      FROM             LOGIN@   IDLE   JCPU   PCPU  WHAT",
      "etudiant pts/0    192.168.1.10     08:00    0.00s  0.12s  0.01s -bash"
    ], [], 0);
  };

  CMD.who = function () {
    return res(["etudiant pts/0        2026-10-28 08:00 (192.168.1.10)"], [], 0);
  };

  CMD.reboot = function () {
    return okOut("reboot: redémarrage simulé — utilisez « Réinitialiser » pour restaurer la démo.");
  };
  CMD.shutdown = function () {
    return okOut("shutdown: extinction simulée — utilisez « Réinitialiser » pour restaurer la démo.");
  };

  CMD.nice = function (args) {
    if (!args.length) return okOut("0");
    return execLine(args.join(" "), { silent: true });
  };

  /* ============================ Scripts ============================ */
  function runScriptContent(text, args, depth) {
    depth = depth || 0;
    if (depth > 6) return fail("bash: trop de niveaux d'imbrication de scripts", 1);
    const prevArgs = state.scriptArgs;
    state.scriptArgs = args.slice();
    state.depth = depth;
    const out = [], errs = [];
    let code = 0;
    const lines = String(text || "").split("\n");
    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      if (/^\s*$/.test(raw) || /^\s*#/.test(raw)) continue;
      const r = execLine(raw, { silent: true, depth: depth + 1 });
      out.push.apply(out, r.out);
      errs.push.apply(errs, r.err);
      code = r.code;
      if (/^\s*exit(\s|$)/.test(raw)) break;
    }
    state.scriptArgs = prevArgs;
    state.depth = Math.max(0, depth - 1);
    return { out: out, err: errs, code: code };
  }

  function runScriptPath(tok, args) {
    const full = resolve(tok);
    const node = getNode(full);
    if (!node) return fail("bash: " + tok + ": Aucun fichier ou dossier de ce type", 127);
    if (node.t === "d") return fail("bash: " + tok + ": Est un dossier", 126);
    const mode = String(node.mode || "644").padStart(3, "0");
    const xbit = +mode.charAt(0) & 1;
    if (!xbit) return fail("bash: " + tok + ": Permission denied", 126);
    let text = node.content;
    if (node.t === "l") {
      const t = getNode(resolve(node.target, dirName(full)));
      if (!t || t.t !== "f") return fail("bash: " + tok + ": Aucun fichier ou dossier de ce type", 127);
      text = t.content;
    }
    return runScriptContent(text, [tok].concat(args), 0);
  }

  CMD.source = function (args) {
    const o = opts(args);
    if (!o.rest.length) return fail("bash: source: nom de fichier manquant");
    const node = getNode(resolve(o.rest[0]));
    if (!node || node.t !== "f") return fail("bash: source: " + o.rest[0] + ": Aucun fichier ou dossier de ce type", 1);
    return runScriptContent(node.content, [o.rest[0]].concat(o.rest.slice(1)), 0);
  };

  /* ============================ Missions ============================ */
  function recentMatch(re) {
    return state.recent.some(function (l) { return re.test(l); });
  }
  function lastCmd() {
    return state.recent.length ? state.recent[state.recent.length - 1] : "";
  }

  const MISSIONS = [
    {
      id: "m1", xp: 15, title: "Afficher le répertoire courant",
      desc: "Utilisez la commande qui affiche le chemin du dossier où vous êtes.",
      hint: "استعمل الأمر pwd لعرض مسار المجلد الحالي.",
      test: function () { return recentMatch(/^pwd\s*$/); }
    },
    {
      id: "m2", xp: 15, title: "Lister votre dossier personnel",
      desc: "Affichez le contenu de /home/etudiant (vous y êtes déjà).",
      hint: "اكتب ls وأنت داخل المجلد الشخصي لعرض محتواه.",
      test: function () { return state.cwd === HOME && /^ls(\s|$)/.test(lastCmd()); }
    },
    {
      id: "m3", xp: 15, title: "Créer le dossier « projets »",
      desc: "Créez un répertoire nommé projets dans votre dossier personnel.",
      hint: "استعمل mkdir projets لإنشاء المجلد.",
      test: function () { var n = getNode(HOME + "/projets"); return !!(n && n.t === "d"); }
    },
    {
      id: "m4", xp: 15, title: "Créer notes.txt avec « Bonjour »",
      desc: "Écrivez le mot Bonjour dans un fichier notes.txt (redirection).",
      hint: "echo Bonjour > notes.txt — إعادة التوجيه تكتب النتيجة في الملف.",
      test: function () { var n = getNode(HOME + "/notes.txt"); return !!(n && n.t === "f" && /bonjour/i.test(n.content)); }
    },
    {
      id: "m5", xp: 15, title: "Copier notes.txt vers notes.bak",
      desc: "Faites une copie de sauvegarde du fichier.",
      hint: "cp notes.txt notes.bak",
      test: function () {
        var a = getNode(HOME + "/notes.txt"), b = getNode(HOME + "/notes.bak");
        return !!(a && b && b.t === "f" && b.content === a.content && b.content.length > 0);
      }
    },
    {
      id: "m6", xp: 15, title: "Renommer notes.bak en notes.old",
      desc: "Utilisez la commande de déplacement pour renommer.",
      hint: "mv notes.bak notes.old — mv تنقل أو تعيد التسمية.",
      test: function () { return !!getNode(HOME + "/notes.old") && !getNode(HOME + "/notes.bak"); }
    },
    {
      id: "m7", xp: 15, title: "Afficher 3 lignes de /etc/passwd",
      desc: "Affichez uniquement les trois premières lignes du fichier.",
      hint: "head -n 3 /etc/passwd",
      test: function () { return recentMatch(/^head\s+(-n\s*3|-3)\s+\/etc\/passwd/); }
    },
    {
      id: "m8", xp: 15, title: "Chercher « root » dans /etc/passwd",
      desc: "Filtrez le contenu du fichier pour n'afficher que les lignes contenant root.",
      hint: "grep root /etc/passwd",
      test: function () { return recentMatch(/^grep\s+.*root.*\/etc\/passwd/); }
    },
    {
      id: "m9", xp: 15, title: "Compter les lignes de /etc/passwd",
      desc: "Utilisez l'option de comptage des lignes.",
      hint: "wc -l /etc/passwd",
      test: function () { return recentMatch(/^wc\s+-l\s+\/etc\/passwd/); }
    },
    {
      id: "m10", xp: 15, title: "Rendre script.sh exécutable",
      desc: "Ajoutez le droit d'exécution au propriétaire de script.sh.",
      hint: "chmod u+x script.sh — u للمالك و+ لإضافة الحق.",
      test: function () {
        var n = getNode(HOME + "/script.sh");
        if (!n) return false;
        const mode = String(n.mode).padStart(3, "0");
        return (parseInt(mode.charAt(0), 10) & 1) === 1;
      }
    },
    {
      id: "m11", xp: 15, title: "Créer un lien symbolique notes.lien",
      desc: "Créez un raccourci nommé notes.lien qui pointe vers notes.txt.",
      hint: "ln -s notes.txt notes.lien — -s تعني رابط رمزي.",
      test: function () {
        var n = getNode(HOME + "/notes.lien");
        return !!(n && n.t === "l" && /notes\.txt/.test(n.target));
      }
    },
    {
      id: "m12", xp: 15, title: "Archiver le dossier projets",
      desc: "Créez une archive nommée projets.tar contenant le dossier projets.",
      hint: "tar -cf projets.tar projets",
      test: function () {
        var n = getNode(HOME + "/projets.tar");
        return !!(n && n.t === "f" && n.content.indexOf("TARJSON:") === 0);
      }
    },
    {
      id: "m13", xp: 15, title: "Lister les processus",
      desc: "Affichez les processus en cours d'exécution.",
      hint: "ps — ويمكن ps -f لتفاصيل أكثر.",
      test: function () { return /^ps(\s|$)/.test(lastCmd()); }
    },
    {
      id: "m14", xp: 15, title: "Écrire dans fichier.txt par redirection",
      desc: "Écrivez exactement : Bonjour Badr AI dans fichier.txt.",
      hint: "echo \"Bonjour Badr AI\" > fichier.txt",
      test: function () {
        var n = getNode(HOME + "/fichier.txt");
        return !!(n && n.t === "f" && /bonjour badr ai/i.test(n.content));
      }
    },
    {
      id: "m15", xp: 15, title: "Compter les entrées de /etc avec un pipe",
      desc: "Combinez ls et wc -l avec le symbole |.",
      hint: "ls /etc | wc -l — الأنبوب يمرر الخرج للأمر التالي.",
      test: function () { return recentMatch(/\|/) && recentMatch(/\bwc\s+-l\b/) && recentMatch(/\bls\b/); }
    },
    {
      id: "m16", xp: 15, title: "Exécuter bonjour.sh",
      desc: "Le script est déjà prêt et exécutable. Lancez-le avec ./",
      hint: "./bonjour.sh — يجب أن يكون الملف قابلًا للتنفيذ.",
      test: function () {
        return /^\.\/bonjour\.sh/.test(lastCmd()) && state.lastRun &&
          /bonjour/i.test((state.lastRun.out || []).join(" "));
      }
    }
  ];

  function loadDoneLocal() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return [];
      const data = JSON.parse(raw);
      return Array.isArray(data.missions) ? data.missions : [];
    } catch (e) { return []; }
  }
  function persistDone() {
    try { localStorage.setItem(KEY, JSON.stringify({ missions: state.completed })); } catch (e) { /* ignore */ }
  }

  function checkMissions() {
    let changed = false;
    MISSIONS.forEach(function (m) {
      if (state.completed.indexOf(m.id) > -1) return;
      let done = false;
      try { done = !!m.test(); } catch (e) { done = false; }
      if (!done) return;
      state.completed.push(m.id);
      changed = true;
      persistDone();
      if (window.SFX) window.SFX.play("success");
      if (window.APP) {
        if (typeof APP.missionDone === "function") APP.missionDone(m.id, m.xp);
        if (typeof APP.confetti === "function") APP.confetti(18);
        if (typeof APP.toast === "function") APP.toast("✔ Mission " + m.id.slice(1) + " terminée · +" + m.xp + " XP", "good");
      }
      printLine("✔ Mission accomplie : " + m.title + "  (+" + m.xp + " XP)", "ok");
    });
    if (changed) {
      renderMissions();
      if (window.SFX) window.SFX.play("fanfare");
    }
  }

  /* ============================ UI ============================ */
  function printLine(text, cls) {
    if (!els) return;
    const div = document.createElement("div");
    div.className = "term-line " + (cls || "out");
    div.textContent = text;
    els.body.appendChild(div);
  }

  function promptPath() {
    if (!state) return "~";
    if (state.cwd === HOME) return "~";
    if (state.cwd.indexOf(HOME + "/") === 0) return "~" + state.cwd.slice(HOME.length);
    return state.cwd;
  }

  function updatePrompt() {
    if (!els) return;
    const sym = state.user === "root" ? "#" : "$";
    els.prompt.textContent = state.user + "@" + state.host;
    els.path.textContent = ":" + promptPath() + sym + " ";
    if (els.title) els.title.textContent = state.user + "@" + state.host + ":" + promptPath();
  }

  function printCommand(line) {
    if (!els) return;
    const div = document.createElement("div");
    div.className = "term-line cmd";
    const p1 = document.createElement("span");
    p1.className = "t-prompt";
    p1.textContent = state.user + "@" + state.host;
    const p2 = document.createElement("span");
    p2.className = "t-path";
    p2.textContent = ":" + promptPath() + (state.user === "root" ? "# " : "$ ");
    div.appendChild(p1);
    div.appendChild(p2);
    div.appendChild(document.createTextNode(line));
    els.body.appendChild(div);
  }

  function scrollBottom() {
    if (els) els.body.scrollTop = els.body.scrollHeight;
  }

  function missionCard(m, idx) {
    const done = state.completed.indexOf(m.id) > -1;
    return '<article class="mission' + (done ? " done" : "") + '" data-mid="' + m.id + '">' +
      '<div class="mission-top">' +
      '<span class="mission-num">' + String(idx + 1).padStart(2, "0") + "</span>" +
      "<h4>" + m.title + "</h4>" +
      '<span class="m-state">' + (done ? "Terminée ✓" : "À faire") + "</span>" +
      "</div>" +
      "<p>" + m.desc + "</p>" +
      '<button class="m-hint-btn" type="button">💡 Indice (AR)</button>' +
      '<div class="m-hint">' + m.hint + "</div>" +
      "</article>";
  }

  function renderMissions() {
    if (!els) return;
    els.missions.innerHTML = MISSIONS.map(missionCard).join("");
    const done = state.completed.filter(function (id) {
      return MISSIONS.some(function (m) { return m.id === id; });
    }).length;
    els.count.textContent = done + "/" + MISSIONS.length;
  }

  function bindMissions() {
    els.missions.addEventListener("click", function (e) {
      const btn = e.target.closest(".m-hint-btn");
      if (!btn) return;
      const card = btn.closest(".mission");
      const hint = card.querySelector(".m-hint");
      hint.classList.toggle("show");
      btn.textContent = hint.classList.contains("show") ? "▴ Masquer l'indice" : "💡 Indice (AR)";
      if (window.SFX) window.SFX.play("click");
    });
  }

  function welcome() {
    printLine("Badr AI — Terminal Unix simulé (Système d'Exploitation 1)", "sys");
    printLine("Tapez « help » pour la liste des commandes, « ls » pour commencer, ou « man chmod ».", "out");
    printLine("16 missions vous attendent à droite — indices en arabe.  ↑/↓ historique · Tab complétion.", "out");
    printLine("", "out");
    if (state.completed.length) {
      printLine("Missions déjà validées : " + state.completed.length + "/" + MISSIONS.length, "ok");
    }
  }

  function focusInput() {
    if (els && els.input) els.input.focus({ preventScroll: true });
  }

  function complete() {
    const value = els.input.value;
    const parts = value.split(/\s+/);
    const isFirst = parts.length <= 1;
    const token = isFirst ? value : parts[parts.length - 1];

    if (isFirst) {
      const names = Object.keys(CMD).concat(Object.keys(state.aliases)).sort();
      const hits = names.filter(function (n) { return n.indexOf(value) === 0; });
      if (hits.length === 1) { els.input.value = hits[0] + " "; }
      else if (hits.length > 1) {
        printCommand(value);
        printLine(hits.join("  "), "out");
        scrollBottom();
      }
      return;
    }

    const dirPart = token.indexOf("/") > -1 ? token.slice(0, token.lastIndexOf("/") + 1) : "";
    const prefix = token.slice(token.lastIndexOf("/") + 1);
    const searchDir = resolve(dirPart || ".");
    const node = getNode(searchDir);
    if (!node || node.t !== "d") return;
    const hits = Object.keys(node.children).filter(function (n) { return n.indexOf(prefix) === 0; }).sort();
    if (hits.length === 1) {
      const child = node.children[hits[0]];
      const add = hits[0] + (child.t === "d" ? "/" : "");
      parts[parts.length - 1] = dirPart + add;
      els.input.value = parts.join(" ");
    } else if (hits.length > 1) {
      printCommand(value);
      printLine(hits.join("  "), "out");
    }
  }

  function submit(line) {
    line = String(line || "");
    if (!line.trim()) { printCommand(""); updatePrompt(); return; }
    state.history.push(line);
    state.histIndex = state.history.length;
    printCommand(line);
    const r = execLine(line);
    if (r.clear) {
      els.body.innerHTML = "";
    } else {
      r.out.forEach(function (l) { printLine(l, "out"); });
      r.err.forEach(function (l) { printLine(l, "err"); });
    }
    if (window.SFX) window.SFX.play(r.err.length && !r.out.length ? "error" : "page");
    updatePrompt();
    checkMissions();
    scrollBottom();
  }

  function resetDemo(silent) {
    const done = state.completed.slice();
    state = freshState();
    state.completed = done;
    if (els) {
      els.body.innerHTML = "";
      welcome();
      updatePrompt();
      renderMissions();
      scrollBottom();
    }
    if (!silent) printLine("Session réinitialisée : fichiers et répertoire personnel restaurés.", "ok");
  }

  function mount(root) {
    if (!root) return;
    if (mounted && root.contains(els.body)) return;
    root.innerHTML = "";
    state = freshState();
    state.completed = (window.APP && Array.isArray(APP.state.missions)) ? APP.state.missions.slice() : loadDoneLocal().slice();
    state.history = [];
    state.histIndex = 0;
    state.lastRun = null;

    const wrap = document.createElement("div");
    wrap.className = "terminal-root";
    wrap.innerHTML =
      '<div class="term-window">' +
        '<div class="term-title">' +
          '<div class="term-dots"><i></i><i></i><i></i></div>' +
          '<span class="term-title-text">etudiant@badrai-se1:~</span>' +
          '<div class="t-actions">' +
            '<button class="icon-btn" type="button" data-act="help" title="Aide (help)" aria-label="Aide">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.6 2.3c-.7.4-1.1 1-1.1 1.8v.4"/><circle cx="12" cy="17.2" r=".8" fill="currentColor" stroke="none"/></svg>' +
            '</button>' +
            '<button class="icon-btn" type="button" data-act="clear" title="Effacer l\'écran" aria-label="Effacer">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13"/><path d="M10 11v5M14 11v5"/></svg>' +
            '</button>' +
            '<button class="icon-btn" type="button" data-act="reset" title="Réinitialiser la session" aria-label="Réinitialiser">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>' +
            '</button>' +
          '</div>' +
        '</div>' +
        '<div class="term-body" tabindex="0"></div>' +
        '<form class="term-form" autocomplete="off">' +
          '<span class="t-prompt">etudiant@badrai-se1</span>' +
          '<span class="t-path">:~$ </span>' +
          '<input type="text" spellcheck="false" autocapitalize="off" autocorrect="off" aria-label="Commande">' +
        '</form>' +
      '</div>' +
      '<aside class="missions">' +
        '<div class="missions-head"><h3>Missions</h3><span></span></div>' +
        '<div class="term-help">16 exercices guidés en français, avec indices en arabe. Les commandes sont exécutées sur un système de fichiers virtuel (aucun risque réel).</div>' +
        '<div class="missions-list"></div>' +
      '</aside>';

    root.appendChild(wrap);
    els = {
      body: wrap.querySelector(".term-body"),
      form: wrap.querySelector(".term-form"),
      input: wrap.querySelector(".term-form input"),
      prompt: wrap.querySelector(".term-form .t-prompt"),
      path: wrap.querySelector(".term-form .t-path"),
      title: wrap.querySelector(".term-title-text"),
      missions: wrap.querySelector(".missions-list"),
      count: wrap.querySelector(".missions-head span")
    };
    mounted = true;
    renderMissions();
    bindMissions();

    els.form.addEventListener("submit", function (e) {
      e.preventDefault();
      const val = els.input.value;
      els.input.value = "";
      submit(val);
      focusInput();
    });

    els.body.addEventListener("click", focusInput);
    els.input.addEventListener("keydown", function (e) {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (!state.history.length) return;
        state.histIndex = Math.max(0, state.histIndex - 1);
        els.input.value = state.history[state.histIndex] || "";
        setTimeout(function () { els.input.setSelectionRange(999, 999); }, 0);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        state.histIndex = Math.min(state.history.length, state.histIndex + 1);
        els.input.value = state.history[state.histIndex] || "";
      } else if (e.key === "Tab") {
        e.preventDefault();
        complete();
      } else if (e.key === "l" && e.ctrlKey) {
        e.preventDefault();
        els.body.innerHTML = "";
      } else if (e.key.length === 1 && window.SFX && Math.random() < 0.35) {
        window.SFX.play("type");
      }
    });

    wrap.querySelectorAll("[data-act]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const act = btn.getAttribute("data-act");
        if (window.SFX) window.SFX.play("click");
        if (act === "help") submit("help");
        else if (act === "clear") { els.body.innerHTML = ""; }
        else if (act === "reset") resetDemo(false);
        focusInput();
      });
    });

    welcome();
    updatePrompt();
    focusInput();
  }

  /* ============================ Public API ============================ */
  return {
    mount: function (root) {
      try { mount(root); }
      catch (err) { if (window.console) console.error("TERM.mount", err); }
    },
    _init: function () { if (!state) state = freshState(); return state; },
    reset: resetDemo,
    exec: function (line) { return state ? execLine(line) : null; },
    missions: MISSIONS,
    check: checkMissions,
    completed: function () { return state ? state.completed.slice() : []; },
    state: function () { return state; }
  };
})();
