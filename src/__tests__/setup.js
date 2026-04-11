import "@testing-library/jest-dom";

// Mock localStorage for tests
const localStorageMock = (() => {
  let store = {};
  return {
    getItem:   (k)    => store[k] ?? null,
    setItem:   (k, v) => { store[k] = String(v); },
    removeItem:(k)    => { delete store[k]; },
    clear:     ()     => { store = {}; },
  };
})();
Object.defineProperty(window, "localStorage", { value: localStorageMock });

// Mock fetch globally — individual tests override as needed
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
  })
);

// Suppress noisy console.error in tests
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
  localStorageMock.clear();
});
