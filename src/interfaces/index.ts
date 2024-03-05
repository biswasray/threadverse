/**
 * Represents a function that can be executed with parameters of type P and returns a result of type R.
 * @template P - The type of parameters accepted by the runnable function.
 * @template R - The type of result returned by the runnable function.
 */
export type IRunnable<P extends Array<unknown>, R> = (...params: P) => R;

/**
 * Represents options for configuring the behavior of a runnable function or worker pool.
 */
export type IRunnableOption = {
  /**
   * An optional AbortSignal to abort the execution of the runnable function.
   */
  signal?: AbortSignal;
  /**
   * An optional delay in milliseconds before starting the execution of the runnable function.
   */
  startTime?: number;
  /**
   * An optional timeout in milliseconds for the execution of the runnable function.
   */
  timeout?: number;
  /**
   * An optional array of intervals in milliseconds to retry execution of the runnable function.
   */
  retriesWithIn?: number[];
  /**
   * An optional logger function to log messages during the execution of the runnable function or worker pool.
   */
  logger?: (logStr: string) => void;
};

/**
 * Represents a response object returned by the execution of a runnable function.
 * @template C - The type of content in the response.
 */
export type IResponse<C = unknown> =
  | {
      /**
       * Indicates a successful execution.
       */
      type: "success";
      /**
       * The content returned by the runnable function.
       */
      content: C;
    }
  | {
      /**
       * Indicates an error occurred during execution.
       */
      type: "error";
      /**
       * The error object representing the error.
       */
      error: Error;
    };

/**
 * Represents the type of result returned by a function or a promise.
 * If the result is a promise, it unwraps the promise and resolves to its inner type.
 * Otherwise, it resolves to the original type.
 * @template R - The type of result returned by the function or promise.
 */
export type IUnwrappedResult<R> = R extends Promise<infer T> ? T : R;
