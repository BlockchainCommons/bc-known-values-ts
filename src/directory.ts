/**
 * Loading known values from the `.json` registry files of configurable
 * directories (`~/.known-values` by default), and the process-wide
 * directory configuration the global registry reads on first access.
 *
 * The host filesystem is reached through `process.getBuiltinModule` so the
 * module has no static `node:` import; where the builtin is unavailable (a
 * browser), every directory behaves as a missing one.
 *
 * @module directory
 */
import { KnownValue } from "./known-value.js";
import { KnownValuesError } from "./error.js";
import { globalSlot } from "./global-slot.js";
import { type RegistryFile, parseRegistryFile } from "./registry-file.js";

// ---------------------------------------------------------------------------
// The host
// ---------------------------------------------------------------------------

/** The slice of the host filesystem the loader uses. */
export interface FilesystemAdapter {
  /** Whether `path` names a directory (symbolic links followed); a missing path is `false`. */
  isDirectory(path: string): boolean;
  /**
   * The entry names of a directory in the host's order (the reference's
   * `read_dir`). Throws a {@link HostError} for a directory that cannot be
   * opened or an entry that cannot be read.
   */
  entries(path: string): Iterable<string>;
  /** The bytes of a file; throws a {@link HostError} when it cannot be read. */
  readFile(path: string): Uint8Array;
  /** `process.env.HOME` as the host reports it (`undefined` when unset). */
  homeEnv(): string | undefined;
  /** The account's home directory from the user database, `undefined` when unknown. */
  userHome(): string | undefined;
  /** The `errno` value of an error code name (`EISDIR` → 21), `undefined` when unknown. */
  errno(code: string): number | undefined;
  /** The path separator the host uses. */
  readonly separator: string;
}

/** A filesystem failure with the host's error code name and message. */
export interface HostError {
  readonly code?: string;
  readonly message: string;
}

interface NodeFs {
  statSync(path: string): { isDirectory(): boolean };
  opendirSync(path: string): {
    readSync(): { name: string } | null;
    closeSync(): void;
  };
  readFileSync(path: string): Uint8Array;
}
interface NodeOs {
  userInfo(): { homedir: string };
  constants: { errno: Record<string, number> };
}
interface NodeProcess {
  getBuiltinModule?(id: string): unknown;
  env?: Record<string, string | undefined>;
  platform?: string;
}

/** The adapter over Node's `fs` and `os` builtins, or `undefined` where they are unavailable. */
function hostFilesystem(): FilesystemAdapter | undefined {
  const proc = (globalThis as { process?: NodeProcess }).process;
  if (proc === undefined || typeof proc.getBuiltinModule !== "function") return undefined;
  let fs: NodeFs | undefined;
  let os: NodeOs | undefined;
  try {
    fs = proc.getBuiltinModule("node:fs") as NodeFs | undefined;
    os = proc.getBuiltinModule("node:os") as NodeOs | undefined;
  } catch {
    return undefined;
  }
  if (fs === undefined || os === undefined) return undefined;
  const nodeFs = fs;
  const nodeOs = os;
  return {
    separator: proc?.platform === "win32" ? "\\" : "/",
    isDirectory(path) {
      try {
        return nodeFs.statSync(path).isDirectory();
      } catch {
        return false;
      }
    },
    *entries(path) {
      const dir = nodeFs.opendirSync(path);
      try {
        for (;;) {
          const entry = dir.readSync();
          if (entry === null) return;
          yield entry.name;
        }
      } finally {
        dir.closeSync();
      }
    },
    readFile(path) {
      return nodeFs.readFileSync(path);
    },
    homeEnv() {
      return proc?.env?.["HOME"];
    },
    userHome() {
      try {
        return nodeOs.userInfo().homedir;
      } catch {
        return undefined;
      }
    },
    errno(code) {
      return nodeOs.constants.errno[code];
    },
  };
}

let FILESYSTEM: FilesystemAdapter | undefined | null = null;
/** The filesystem the loader uses: the host's unless a test injected one. */
function filesystem(): FilesystemAdapter | undefined {
  if (FILESYSTEM === null) FILESYSTEM = hostFilesystem();
  return FILESYSTEM;
}
/**
 * Replaces the filesystem the loader uses (`undefined` behaves as a host
 * without one; `null` restores the host's). For tests.
 *
 * @internal
 */
export function useFilesystemAdapter(adapter: FilesystemAdapter | undefined | null): void {
  FILESYSTEM = adapter;
}

// ---------------------------------------------------------------------------
// Paths and errors, as the reference's std::path and std::io render them
// ---------------------------------------------------------------------------

/** `PathBuf::join` with a relative name: one separator unless the directory already ends in one. */
function joinPath(dir: string, name: string, separator: string): string {
  if (dir === "") return name;
  const last = dir[dir.length - 1];
  const endsWithSeparator = last === separator || (separator === "\\" && last === "/");
  return endsWithSeparator ? dir + name : dir + separator + name;
}

/**
 * `Path::extension` of an entry name: none for `..`, none when the only
 * dot leads the name, else the text after the last dot.
 */
function extensionOf(name: string): string | undefined {
  if (name === "..") return undefined;
  const dot = name.lastIndexOf(".");
  if (dot <= 0) return undefined;
  return name.slice(dot + 1);
}

/** The POSIX `strerror` texts the reference's `io::Error` prints for the codes a registry load meets. */
const STRERROR: Record<string, string> = {
  EISDIR: "Is a directory",
  EACCES: "Permission denied",
  ENOENT: "No such file or directory",
  ENOTDIR: "Not a directory",
  ELOOP: "Too many levels of symbolic links",
  ENAMETOOLONG: "File name too long",
  EMFILE: "Too many open files",
  EIO: "Input/output error",
};

/** `IO error: <strerror> (os error <errno>)`, or the host's message for a code outside the table. */
function ioError(fs: FilesystemAdapter, e: unknown): KnownValuesError {
  const host = e as HostError;
  const code = typeof host?.code === "string" ? host.code : undefined;
  const text = code === undefined ? undefined : STRERROR[code];
  const errno = code === undefined ? undefined : fs.errno(code);
  if (text !== undefined && errno !== undefined) {
    return KnownValuesError.io(`IO error: ${text} (os error ${errno})`);
  }
  return KnownValuesError.io(`IO error: ${host?.message ?? String(e)}`);
}

const UTF8 = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });

/** The reference's `fs::read_to_string`: the bytes, which must be UTF-8. */
function readToString(fs: FilesystemAdapter, path: string): string {
  let bytes: Uint8Array;
  try {
    bytes = fs.readFile(path);
  } catch (e) {
    throw ioError(fs, e);
  }
  try {
    return UTF8.decode(bytes);
  } catch {
    throw KnownValuesError.io("IO error: stream did not contain valid UTF-8");
  }
}

/** The reference's `load_single_file`: the file's entries as named values. */
function loadSingleFile(fs: FilesystemAdapter, path: string): KnownValue[] {
  const text = readToString(fs, path);
  let file: RegistryFile;
  try {
    file = parseRegistryFile(text);
  } catch (e) {
    if (KnownValuesError.isKnownValuesError(e) && e.is("Json")) {
      throw KnownValuesError.json(`JSON parse error in ${path}: ${e.message}`);
    }
    throw e;
  }
  return file.entries.map((entry) => new KnownValue(entry.codepoint, entry.name));
}

/** The `.json` entries of a directory in host order; throws the directory's own IO error. */
function jsonFiles(fs: FilesystemAdapter, path: string): string[] {
  const files: string[] = [];
  try {
    for (const name of fs.entries(path)) {
      if (extensionOf(name) === "json") files.push(joinPath(path, name, fs.separator));
    }
  } catch (e) {
    throw ioError(fs, e);
  }
  return files;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** A path list argument, checked before use. */
function checkedPaths(paths: unknown): string[] {
  if (!Array.isArray(paths)) throw KnownValuesError.invalidParameter("paths", paths);
  for (const p of paths)
    if (typeof p !== "string") throw KnownValuesError.invalidParameter("path", p);
  return [...(paths as string[])];
}

/**
 * The directories the global registry loads registry files from, in order
 * (a later directory replaces an earlier one by codepoint). The default is
 * the one directory `~/.known-values`; an empty configuration loads nothing
 * and makes the global registry equal to a reference build without the
 * `directory-loading` feature.
 */
export class DirectoryConfig {
  private readonly _paths: string[];

  /**
   * @param paths - The directories, in order (none by default)
   * @throws KnownValuesError `InvalidParameter` when `paths` is not an array of strings
   */
  constructor(paths: readonly string[] = []) {
    this._paths = checkedPaths(paths);
  }

  /** The default directory only. */
  static defaultOnly(): DirectoryConfig {
    return new DirectoryConfig([DirectoryConfig.defaultDirectory()]);
  }

  /** `paths`, then the default directory. */
  static withPathsAndDefault(paths: readonly string[]): DirectoryConfig {
    return new DirectoryConfig([...checkedPaths(paths), DirectoryConfig.defaultDirectory()]);
  }

  /**
   * `~/.known-values`: the home directory is a non-empty `HOME`, else the
   * account's home from the user database, else `.` (the reference's
   * `dirs::home_dir().unwrap_or(".")`).
   */
  static defaultDirectory(): string {
    const fs = filesystem();
    const separator = fs?.separator ?? "/";
    let home = fs?.homeEnv();
    if (home === undefined || home === "") home = fs?.userHome();
    if (home === undefined || home === "") home = ".";
    return joinPath(home, ".known-values", separator);
  }

  /** The directories, in order. */
  get paths(): readonly string[] {
    return [...this._paths];
  }

  /**
   * Appends a directory.
   *
   * @throws KnownValuesError `InvalidParameter` when `path` is not a string
   */
  addPath(path: string): void {
    if (typeof path !== "string") throw KnownValuesError.invalidParameter("path", path);
    this._paths.push(path);
  }
}

/** `config` checked as a `DirectoryConfig`. */
function checkedConfig(config: unknown): DirectoryConfig {
  if (!(config instanceof DirectoryConfig) && !isConfigLike(config)) {
    throw KnownValuesError.invalidParameter("config", config);
  }
  return config as DirectoryConfig;
}
/** A `DirectoryConfig` from another copy of this module: a `paths` array of strings. */
function isConfigLike(x: unknown): boolean {
  const paths = (x as { paths?: unknown } | null)?.paths;
  return Array.isArray(paths) && paths.every((p) => typeof p === "string");
}

/**
 * Sets the directories the global registry will load from. Must be called
 * before the first `getGlobalKnownValuesStore()`; the configuration is
 * process-wide, shared by every copy of this module.
 *
 * @throws KnownValuesError `AlreadyInitialized` once the global registry has been built
 */
export function setDirectoryConfig(config: DirectoryConfig): void {
  const checked = checkedConfig(config);
  const slot = globalSlot();
  if (slot.locked) throw KnownValuesError.alreadyInitialized();
  slot.config = checked;
}

/**
 * Appends directories to the configuration the global registry will load
 * from, starting from the default configuration when none was set.
 *
 * @throws KnownValuesError `AlreadyInitialized` once the global registry has been built
 */
export function addSearchPaths(paths: readonly string[]): void {
  const checked = checkedPaths(paths);
  const slot = globalSlot();
  if (slot.locked) throw KnownValuesError.alreadyInitialized();
  slot.config ??= DirectoryConfig.defaultOnly();
  for (const p of checked) slot.config.addPath(p);
}

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------

/** One error a tolerant load met, with the file or directory it belongs to. */
export interface LoadFailure {
  /** The file that failed to read or parse, or the directory that failed to list. */
  readonly path: string;
  /** The failure: `Io` or `Json`, with the reference's text. */
  readonly error: KnownValuesError;
}

/** What `loadFromConfig` reports: the values by codepoint, the directories processed, the errors met. */
export interface LoadResult {
  /**
   * The loaded values by codepoint, a later directory or file replacing an
   * earlier one; iteration is in first-seen codepoint order.
   */
  readonly values: ReadonlyMap<bigint, KnownValue>;
  /** The directories whose entries were read to the end (missing ones included). */
  readonly filesProcessed: readonly string[];
  /** Every error met, with the file or directory it belongs to. */
  readonly errors: readonly LoadFailure[];
}

/**
 * The values of every `.json` registry file in `path`, in the host's
 * directory order (the reference's `load_from_directory`): a missing path
 * or a non-directory yields none; the first unreadable or unparsable file
 * fails the whole load.
 *
 * @throws KnownValuesError `Io` (`IO error: …`) or `Json` (`JSON parse error in <file>: …`)
 */
export function loadFromDirectory(path: string): KnownValue[] {
  if (typeof path !== "string") throw KnownValuesError.invalidParameter("path", path);
  const fs = filesystem();
  if (fs?.isDirectory(path) !== true) return [];
  const values: KnownValue[] = [];
  for (const file of jsonFiles(fs, path)) values.push(...loadSingleFile(fs, file));
  return values;
}

/**
 * The reference's `load_from_directory_tolerant`: per-file errors are
 * collected; a directory that cannot be opened or read to the end fails as
 * a whole and its values are discarded.
 */
function loadDirectoryTolerant(
  fs: FilesystemAdapter,
  path: string,
): { values: KnownValue[]; errors: LoadFailure[] } {
  const values: KnownValue[] = [];
  const errors: LoadFailure[] = [];
  if (!fs.isDirectory(path)) return { values, errors };
  for (const file of jsonFiles(fs, path)) {
    try {
      values.push(...loadSingleFile(fs, file));
    } catch (e) {
      if (!KnownValuesError.isKnownValuesError(e)) throw e;
      errors.push({ path: file, error: e });
    }
  }
  return { values, errors };
}

/**
 * The values of every configured directory (the reference's
 * `load_from_config`): per-file errors are tolerated and reported; a
 * directory that cannot be read to the end is reported as one error, its
 * partial values discarded and its path left out of `filesProcessed`.
 */
export function loadFromConfig(config: DirectoryConfig): LoadResult {
  const checked = checkedConfig(config);
  const values = new Map<bigint, KnownValue>();
  const filesProcessed: string[] = [];
  const errors: LoadFailure[] = [];
  const fs = filesystem();
  for (const dir of checked.paths) {
    if (fs === undefined) {
      filesProcessed.push(dir);
      continue;
    }
    let loaded;
    try {
      loaded = loadDirectoryTolerant(fs, dir);
    } catch (e) {
      if (!KnownValuesError.isKnownValuesError(e)) throw e;
      errors.push({ path: dir, error: e });
      continue;
    }
    for (const kv of loaded.values) values.set(kv.valueBigInt, kv);
    errors.push(...loaded.errors);
    filesProcessed.push(dir);
  }
  return { values, filesProcessed, errors };
}
