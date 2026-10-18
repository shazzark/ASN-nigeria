import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

export async function publishFiles(files: ReadonlyMap<string, string>, root = process.cwd(), renameFile: typeof rename = rename): Promise<void> {
  const staged: Array<{ target: string; temporary: string }> = [];
  const previous = new Map<string, string | null>();
  const replaced: string[] = [];
  try {
    for (const [relativePath, contents] of files) {
      const target = resolve(root, relativePath);
      if (!target.startsWith(`${resolve(root)}\\`) && !target.startsWith(`${resolve(root)}/`)) throw new Error(`Output path escapes project: ${relativePath}`);
      await mkdir(dirname(target), { recursive: true });
      try {
        if ((await stat(target)).isFile()) previous.set(target, await readFile(target, "utf8"));
        else throw new Error(`Output target is not a file: ${relativePath}`);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") previous.set(target, null);
        else throw error;
      }
      const temporary = `${target}.${randomUUID()}.tmp`;
      await writeFile(temporary, contents, "utf8");
      staged.push({ target, temporary });
    }
    for (const item of staged) {
      await renameFile(item.temporary, item.target);
      replaced.push(item.target);
    }
  } catch (error) {
    const rollbackErrors: unknown[] = [];
    for (const target of replaced.reverse()) {
      try {
        const contents = previous.get(target);
        if (contents === null) await rm(target, { force: true });
        else if (contents !== undefined) await writeFile(target, contents, "utf8");
      } catch (rollbackError) {
        rollbackErrors.push(rollbackError);
      }
    }
    await Promise.all(staged.map(({ temporary }) => rm(temporary, { force: true })));
    if (rollbackErrors.length) throw new AggregateError([error, ...rollbackErrors], "Output replacement failed and rollback was incomplete");
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
