/**
 * Pins the global registry to the reference's seed for every test file: an
 * empty directory configuration, set before any test touches the global
 * store, so a `~/.known-values` on the machine running the suite cannot
 * change an outcome. Tests of the directory loader use stores of their own
 * or child processes.
 */
import { DirectoryConfig, setDirectoryConfig } from "../../src/directory.js";

setDirectoryConfig(new DirectoryConfig());
