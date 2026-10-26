export function legalPageUrl(apiUrl: string, path: "/privacy" | "/terms") {
  return `${apiUrl.replace(/\/$/, "")}${path}`;
}
