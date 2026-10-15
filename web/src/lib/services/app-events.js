/** Lifecycle hooks owned by the Svelte workspace, not by feature controllers. */
let handlers = { render() {}, route() {}, login() {} };
export function registerAppEvents(next) {
  handlers = next;
  return () => {
    handlers = { render() {}, route() {}, login() {} };
  };
}
export function render() {
  handlers.render();
}
export function route() {
  handlers.route();
}
export function login() {
  handlers.login();
}
