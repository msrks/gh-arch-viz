/**
 * Helper functions for detectors to search files in subdirectories
 */

type Tree = { path?: string; type?: string }[];
type ReadFn = (path: string) => Promise<string | null>;

/**
 * Find all files matching a pattern in the repository tree
 */
export function findFiles(tree: Tree, pattern: string | ((path: string) => boolean)): string[] {
  const matcher = typeof pattern === "string"
    ? (path: string) => path.endsWith(pattern)
    : pattern;

  return tree
    .filter((f) => f.path && f.type === "blob" && matcher(f.path))
    .map((f) => f.path!);
}

/**
 * Read and parse all package.json files in the repository
 */
export async function readAllPackageJson(
  tree: Tree,
  read: ReadFn
): Promise<Array<{ path: string; data: any }>> {
  const packageJsonFiles = findFiles(tree, "package.json");
  const results: Array<{ path: string; data: any }> = [];

  for (const pkgPath of packageJsonFiles) {
    const content = await read(pkgPath);
    if (content) {
      try {
        const data = JSON.parse(content);
        results.push({ path: pkgPath, data });
      } catch {
        // ignore parse errors
      }
    }
  }

  return results;
}

/**
 * Check if any package.json has a specific dependency
 */
export async function hasPackageDependency(
  tree: Tree,
  read: ReadFn,
  depName: string | string[]
): Promise<{ found: boolean; file?: string; version?: string }> {
  const packages = await readAllPackageJson(tree, read);
  const depNames = Array.isArray(depName) ? depName : [depName];

  for (const { path, data } of packages) {
    const deps = { ...data.dependencies, ...data.devDependencies };

    for (const name of depNames) {
      if (deps[name]) {
        return { found: true, file: path, version: deps[name] };
      }
    }
  }

  return { found: false };
}

/**
 * Check if any file contains a specific string
 */
export async function fileContains(
  tree: Tree,
  read: ReadFn,
  filePattern: string,
  searchString: string
): Promise<{ found: boolean; file?: string }> {
  const files = findFiles(tree, filePattern);

  for (const filePath of files) {
    const content = await read(filePath);
    if (content && content.includes(searchString)) {
      return { found: true, file: filePath };
    }
  }

  return { found: false };
}

/**
 * Read all .env files (including .env.example)
 */
export async function readAllEnvFiles(
  tree: Tree,
  read: ReadFn
): Promise<string> {
  const envFiles = findFiles(tree, (path) =>
    path.endsWith(".env") || path.endsWith(".env.example")
  );

  const contents: string[] = [];
  for (const envPath of envFiles) {
    const content = await read(envPath);
    if (content) {
      contents.push(content);
    }
  }

  return contents.join("\n");
}
