import { rmSync, mkdirSync, cpSync, existsSync, chmodSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = 'C:/Users/admin/Desktop/demo/markApp';
const src = join(root, 'h5/dist');
const dest = join(root, 'native/android/app/src/main/assets/offline');

// 递归清空（先清只读位，避免 EPERM），再整体复制
function forceRemove(p) {
  if (!existsSync(p)) return;
  for (const name of readdirSync(p)) {
    const full = join(p, name);
    try { chmodSync(full, 0o755); } catch {}
    const st = statSync(full);
    if (st.isDirectory()) forceRemove(full);
    else { try { rmSync(full, { force: true }); } catch {} }
  }
  try { rmSync(p, { recursive: true, force: true }); } catch {}
}

if (existsSync(dest)) forceRemove(dest);
mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });

const count = (function walk(d){let n=0;for(const e of readdirSync(d)){const f=join(d,e);if(statSync(f).isDirectory())n+=walk(f);else n++;}return n;})(dest);
console.log(`synced ${src} -> ${dest} (${count} files)`);
