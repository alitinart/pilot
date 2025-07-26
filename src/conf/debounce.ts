export function debounce<T extends (...args: any[]) => void>(
  func: T,
  delay: number
): (...args: Parameters<T>) => any {
  let timeoutId: ReturnType<typeof setTimeout>;

  return function (this: ThisParameterType<T>, ...args: Parameters<T>): void {
    const context = this;

    clearTimeout(timeoutId);

    timeoutId = setTimeout(() => {
      func.apply(context, args);
    }, delay);
  };
}

export function debounceAsync<T extends (...args: any[]) => Promise<any>>(
  func: T,
  delay: number
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  let timeoutId: ReturnType<typeof setTimeout>;
  let pendingReject: ((reason?: any) => void) | null = null;

  return function (...args: Parameters<T>): Promise<ReturnType<T>> {
    // If there was a pending promise, reject it because it's being debounced again
    if (pendingReject) {
      pendingReject(new Error("Debounced"));
    }

    return new Promise<ReturnType<T>>((resolve, reject) => {
      pendingReject = reject;

      clearTimeout(timeoutId);

      timeoutId = setTimeout(async () => {
        try {
          const result = await func(...args);
          resolve(result);
        } catch (err) {
          reject(err);
        } finally {
          pendingReject = null;
        }
      }, delay);
    });
  };
}
