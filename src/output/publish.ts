import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

export async function publishFiles(files: ReadonlyMap<string, string>, root = process.cwd()): Promise<void> {
  const staged: Array<{ target: string; temporary: string }> = [];
  try {
    for (const [relativePath, contents] of files) {
      const target = resolve(root, relativePath);
      if (!target.startsWith(`${resolve(root)}\\`) && !target.startsWith(`${resolve(root)}/`)) throw new Error(`Output path escapes project: ${relativePath}`);
      await mkdir(dirname(target), { recursive: true });
      const temporary = `${target}.${randomUUID()}.tmp`;
      await writeFile(temporary, contents, "utf8");
      staged.push({ target, temporary });
    }
    for (const item of staged) await rename(item.temporary, item.target);
  } catch (error) {
    await Promise.all(staged.map(({ temporary }) => rm(temporary, { force: true })));
    throw error;
  }
}

export async function filesMatch(files: ReadonlyMap<string, string>, root = process.cwd()): Promise<boolean> {
  try {
    for (const [relativePath, expected] of files) {
      if (await readFile(resolve(root, relativePath), "utf8") !== expected) return false;
    }
    return true;
  } catch {
    return false;
  }
}
