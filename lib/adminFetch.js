export function adminFetch(input, init = {}) {
  return fetch(input, {
    credentials: 'same-origin',
    cache: 'no-store',
    ...init,
  });
}
