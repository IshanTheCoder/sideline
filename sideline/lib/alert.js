/**
 * Universal alert — renders the app's own themed dialog (see AlertHost /
 * components/AppAlert.jsx) instead of the native OS alert or the browser's
 * window.alert/confirm, so the popup matches the rest of the UI on every
 * platform. AlertHost is mounted once at the root and registers itself here;
 * showAlert just hands it the request.
 */
let dispatch = null;

export function _registerAlertDispatcher(fn) {
  dispatch = fn;
}

export function showAlert(title, message, buttons) {
  if (!dispatch) {
    console.warn('showAlert called before AlertHost mounted:', title, message);
    return;
  }
  dispatch({ title, message, buttons });
}
