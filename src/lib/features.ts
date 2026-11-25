// Feature di un documento per-feature, dal percorso (asdp/delivery/F02/T4.3-F02-US01.md → F02).
export const featureOf = (path: string) => /(?:^|[/-])(F\d+)(?=[/.-]|$)/.exec(path)?.[1] ?? null;
