/**
 * 离线包打包工具
 *
 * 流程（对应方案 6.2）：
 * 1. 读取 H5 构建产物（默认 ../h5/dist）
 * 2. 生成 manifest.json（版本号、文件列表、hash）
 * 3. 打成 zip（含 manifest + 全部资源）
 * 4. 输出到 output/ 目录，供 CDN 上传
 *
 * 用法：
 *   pnpm pack:offline                    # 默认版本 1.0.0，源 ../h5/dist
 *   pnpm start -- --version 1.0.1 --src ../h5/dist --output ./output
 */
import { createWriteStream, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve, basename, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import archiver from 'archiver';

interface ManifestFile {
  path: string;
  size: number;
  hash: string;
}

interface Manifest {
  version: string;
  createdAt: string;
  entry: string;
  files: ManifestFile[];
  packageUrl: string;
  totalSize: number;
}

interface CliOptions {
  version: string;
  src: string;
  output: string;
  packageBaseUrl: string;
}

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = {
    version: '1.0.0',
    src: '',
    output: '',
    packageBaseUrl: 'https://app.example.com/offline/packages/'
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];
    switch (arg) {
      case '--version':
        opts.version = next;
        i++;
        break;
      case '--src':
        opts.src = next;
        i++;
        break;
      case '--output':
        opts.output = next;
        i++;
        break;
      case '--package-base':
        opts.packageBaseUrl = next;
        i++;
        break;
    }
  }
  // 默认值：src/cli.ts 向上三级 = monorepo 根（h5/ 与 packages/ 所在处）
  const root = fileURLToPath(new URL('../../../', import.meta.url));
  if (!opts.src) opts.src = resolve(root, 'h5/dist');
  if (!opts.output) opts.output = resolve(root, 'packages/offline-packager/output');
  return opts;
}

function walkDir(dir: string, base = dir): ManifestFile[] {
  const result: ManifestFile[] = [];
  if (!existsSync(dir)) return result;
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      result.push(...walkDir(fullPath, base));
    } else {
      const relPath = relative(base, fullPath).replace(/\\/g, '/');
      const content = readFileSync(fullPath);
      const hash = createHash('md5').update(content).digest('hex');
      result.push({ path: relPath, size: stat.size, hash });
    }
  }
  return result;
}

function buildManifest(opts: CliOptions, files: ManifestFile[]): Manifest {
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  return {
    version: opts.version,
    createdAt: new Date().toISOString(),
    entry: 'index.html',
    files,
    packageUrl: `${opts.packageBaseUrl}${opts.version}.zip`,
    totalSize
  };
}

function writeManifest(manifest: Manifest, outputDir: string): void {
  mkdirSync(outputDir, { recursive: true });
  const manifestPath = join(outputDir, 'manifest.json');
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  console.log(`[manifest] ${manifestPath}`);
  console.log(`  version: ${manifest.version}`);
  console.log(`  files:   ${manifest.files.length}`);
  console.log(`  size:    ${(manifest.totalSize / 1024).toFixed(2)} KB`);
}

/**
 * 打 zip：manifest.json 必须打进 zip 根目录。
 * 原生侧（Android OfflinePackage / iOS OfflinePackageHandler）解压后依赖
 * zip 内的 manifest.json 恢复版本号；若只写在 zip 外，重启后版本丢失会
 * 导致每次启动重复下载。
 */
function packZip(srcDir: string, outputPath: string, manifest: Manifest): Promise<void> {
  return new Promise((resolve, reject) => {
    const output = createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    output.on('close', () => {
      console.log(`[zip] ${outputPath}  ${(archive.pointer() / 1024).toFixed(2)} KB`);
      resolve();
    });
    archive.on('error', reject);
    archive.pipe(output);
    archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' });
    archive.directory(srcDir, false);
    archive.finalize();
  });
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));

  console.log('==== Offline Packager ====');
  console.log(`src:    ${opts.src}`);
  console.log(`output: ${opts.output}`);

  if (!existsSync(opts.src)) {
    console.error(`[error] 源目录不存在：${opts.src}`);
    console.error('请先执行 pnpm build 构建 H5 产物');
    process.exit(1);
  }

  // 1. 收集文件
  const files = walkDir(opts.src);
  if (files.length === 0) {
    console.error('[error] 源目录为空');
    process.exit(1);
  }

  // 2. 生成 manifest
  const manifest = buildManifest(opts, files);
  mkdirSync(opts.output, { recursive: true });
  writeManifest(manifest, opts.output);

  // 3. 打包 zip（manifest.json 同步打进 zip 根目录）
  const zipPath = join(opts.output, `${opts.version}.zip`);
  await packZip(opts.src, zipPath, manifest);

  console.log('\n==== 完成 ====');
  console.log(`上传 ${zipPath} 与 manifest.json 到 CDN 即可触发原生侧离线包更新。`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
