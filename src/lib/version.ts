import packageJson from "../../package.json";

// Versione dell'app (semver), unica fonte: "version" in package.json. Vedi CHANGELOG.md.
export const APP_VERSION = packageJson.version;
