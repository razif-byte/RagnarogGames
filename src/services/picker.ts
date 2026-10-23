declare global {
  interface Window {
    gapi?: {
      load: (api: string, callbackOrConfig: { callback: () => void } | (() => void)) => void;
    };
    google?: {
      picker?: {
        PickerBuilder: new () => {
          addView: (view: unknown) => unknown;
          setOAuthToken: (token: string) => unknown;
          setCallback: (callback: (data: GooglePickerResponse) => void) => unknown;
          setOrigin: (origin: string) => unknown;
          setTitle?: (title: string) => unknown;
          build: () => {
            setVisible: (visible: boolean) => void;
          };
        };
        ViewId: {
          DOCS: unknown;
          ALL: unknown;
        };
        Action: {
          PICKED: string;
          CANCEL: string;
        };
      };
    };
  }
}

export interface GooglePickerDoc {
  id: string;
  name: string;
  mimeType: string;
  url?: string;
  sizeBytes?: number;
}

export interface GooglePickerResponse {
  action: string;
  docs?: GooglePickerDoc[];
}

let isGapiLoading = false;
let isPickerLoaded = false;
const gapiCallbacks: Array<() => void> = [];

/**
 * Loads the Google API client script and initializes the Google Picker module
 */
export function loadGooglePickerApi(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (isPickerLoaded && window.google?.picker) {
      resolve();
      return;
    }

    gapiCallbacks.push(resolve);

    if (isGapiLoading) {
      return;
    }

    isGapiLoading = true;

    const onScriptLoad = () => {
      if (!window.gapi) {
        reject(new Error('Google API client script failed to initialize.'));
        return;
      }
      window.gapi.load('picker', {
        callback: () => {
          isPickerLoaded = true;
          isGapiLoading = false;
          while (gapiCallbacks.length > 0) {
            const cb = gapiCallbacks.shift();
            cb?.();
          }
        },
      });
    };

    // If script is already in document
    const existingScript = document.querySelector('script[src="https://apis.google.com/js/api.js"]');
    if (existingScript) {
      if (window.gapi) {
        onScriptLoad();
      } else {
        existingScript.addEventListener('load', onScriptLoad);
      }
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.async = true;
    script.defer = true;
    script.onload = onScriptLoad;
    script.onerror = () => {
      isGapiLoading = false;
      reject(new Error('Failed to load Google API script (https://apis.google.com/js/api.js)'));
    };
    document.body.appendChild(script);
  });
}

/**
 * Opens Google Picker widget for selecting a save file from Google Drive
 */
export async function openGooglePicker(options: {
  accessToken: string;
  onPicked: (doc: GooglePickerDoc) => void;
  onCancel?: () => void;
  onError?: (err: unknown) => void;
}): Promise<void> {
  try {
    await loadGooglePickerApi();

    if (!window.google?.picker) {
      throw new Error('Google Picker library is not available');
    }

    const pickerOrigin =
      window.location.ancestorOrigins && window.location.ancestorOrigins.length > 0
        ? window.location.ancestorOrigins[window.location.ancestorOrigins.length - 1]
        : window.location.origin;

    const builder = new window.google.picker.PickerBuilder() as any;
    builder.addView(window.google.picker.ViewId.DOCS);
    builder.setOAuthToken(options.accessToken);
    builder.setOrigin(pickerOrigin);
    if (builder.setTitle) {
      builder.setTitle('Select Ragnarok Cloud Save File');
    }

    builder.setCallback((data: GooglePickerResponse) => {
      if (data.action === window.google?.picker?.Action.PICKED) {
        if (data.docs && data.docs.length > 0) {
          options.onPicked(data.docs[0]);
        }
      } else if (data.action === window.google?.picker?.Action.CANCEL) {
        options.onCancel?.();
      }
    });

    const picker = builder.build();
    picker.setVisible(true);
  } catch (error) {
    console.error('Failed to open Google Picker:', error);
    if (options.onError) {
      options.onError(error);
    } else {
      throw error;
    }
  }
}
