import type { TouchEvent } from 'react';

export const runMobileTouchAction = <T extends HTMLElement>(
  event: TouchEvent<T>,
  action: () => void
) => {
  if (event.cancelable) event.preventDefault();
  event.stopPropagation();
  action();
};
