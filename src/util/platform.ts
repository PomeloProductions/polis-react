export const isIOS = /iPad|iPhone|iPod/.test(navigator.platform);
export const isAndroid = /(android)/i.test(navigator.userAgent);
export const isChrome = /(Chrome)/i.test(navigator.userAgent);
export const isSafari = /(AppleWebKit)/i.test(navigator.userAgent) && !isChrome;
export const isFirefox = /(Firefox)/i.test(navigator.userAgent);
export const isEdge = /(Edg)/i.test(navigator.userAgent) && !isSafari;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) ||  ((navigator as any).msMaxTouchPoints > 0);
export const hasMouse = matchMedia('(pointer:fine)').matches;
export const isBot = /bot|googlebot|crawler|spider|robot|crawling/i.test(navigator.userAgent);
