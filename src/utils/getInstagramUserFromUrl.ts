export function getInstagramUserFromUrl(url) {
  if (!url) return null;

  if (url.endsWith('/')) {
    url = url.slice(0, -1);
  }

  const lastSlashIndex = url.lastIndexOf('/');
  if (lastSlashIndex === -1) return null;

  return url.slice(lastSlashIndex + 1);
}
