import type { PlausibleOptions } from './tracker';

/**
 * @internal
 */
type EventPayload = {
  readonly n: string;
  readonly u: Location['href'];
  readonly d: Location['hostname'];
  readonly r: Document['referrer'] | null;
  readonly w: Window['innerWidth'];
  readonly h: 1 | 0;
  readonly p?: string;
};

// eslint-disable-next-line functional/no-mixed-type
export type EventOptions = {
  /**
   * Callback called when the event is successfully sent.
   */
  readonly callback?: () => void;
  /**
   * Properties to be bound to the event.
   */
  readonly props?: { readonly [propName: string]: string };
};

export const checkLocalStorageSupport = (
  g?: Window | typeof globalThis | (Window & typeof globalThis)
): boolean => {
  try {
    if (g) {
      const supported =
        'localStorage' in g &&
        g['localStorage'] !== null &&
        g['localStorage'].setItem('plausible_test', `1`) === undefined;
      g['localStorage'].removeItem('plausible_test');
      return supported;
    } else {
      const supported =
        'localStorage' in window &&
        window['localStorage'] !== null &&
        window['localStorage'].setItem('plausible_test', `1`) === undefined;
      window['localStorage'].removeItem('plausible_test');
      return supported;
    }
  } catch (_e) {
    return false;
  }
};

/**
 * @internal
 * Sends an event to Plausible's API
 *
 * @param data - Event data to send
 * @param options - Event options
 */
export function sendEvent(
  eventName: string,
  data: Required<PlausibleOptions>,
  options?: EventOptions
): void {
  const isLocalhost =
    /^localhost$|^127(?:\.[0-9]+){0,2}\.[0-9]+$|^(?:0*:)*?:?0*1$/.test(
      location.hostname
    ) || location.protocol === 'file:';

  if (!data.trackLocalhost && isLocalhost) {
    return console.warn(
      '[Plausible] Ignoring event because website is running locally'
    );
  }

  const hasLocalStorageSupport = checkLocalStorageSupport();
  const shouldIgnoreCurrentBrowser =
    hasLocalStorageSupport &&
    localStorage.getItem('plausible_ignore') === 'true';

  if (shouldIgnoreCurrentBrowser) {
    return console.warn(
      '[Plausible] Ignoring event because "plausible_ignore" is set to "true" in localStorage'
    );
  }

  const payload: EventPayload = {
    n: eventName,
    u: data.url,
    d: data.domain,
    r: data.referrer,
    w: data.deviceWidth,
    h: data.hashMode ? 1 : 0,
    p: options && options.props ? JSON.stringify(options.props) : undefined,
  };

  const req = new XMLHttpRequest();
  req.open('POST', `${data.apiHost}/api/event`, true);
  req.setRequestHeader('Content-Type', 'text/plain');
  req.send(JSON.stringify(payload));
  // eslint-disable-next-line functional/immutable-data
  req.onreadystatechange = () => {
    if (req.readyState !== 4) return;
    if (options && options.callback) {
      options.callback();
    }
  };
}
