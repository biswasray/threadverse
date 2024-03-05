import {
  IResponse,
  IRunnable,
  IRunnableOption,
  IUnwrappedResult,
} from "../../interfaces";

/**
 * Represents a custom event indicating the exit status of a process.
 */
export class ExitEvent extends CustomEvent<{ code: number }> {
  /**
   * Creates an instance of ExitEvent with the specified exit code.
   * @param {number} code - The exit code indicating the status of the process.
   */
  constructor(code: number) {
    super("exit", { detail: { code } });
  }
}

/**
 * Creates a Web Worker with the provided runnable function and options.
 * @template P - The type of parameters accepted by the runnable function.
 * @template R - The type of result returned by the runnable function.
 * @param {IRunnable<P, R>} runnable - The function to be executed by the Web Worker.
 * @param {IRunnableOption} [options={}] - Options for configuring the behavior of the Web Worker.
 * @param {P} params - The parameters to be passed to the runnable function.
 * @returns {Worker} The created Web Worker instance.
 */
export function createWorker<P extends Array<unknown>, R>(
  runnable: IRunnable<P, R>,
  options: IRunnableOption = {},
  params: P,
) {
  const script = `
        const parentPort=self;
		${runnable.toString()}
		parentPort.onmessage = async ({data})=>{
            try {
                const content = await ${runnable.name}.apply(null,data);
                parentPort.postMessage({type: "success",content});
            }
            catch(error) {
                parentPort.postMessage({type: "error",error});
            }
            finally {
                parentPort.close();
            }
        };
		`;
  const blob = new Blob([script], { type: "text/javascript" });
  const { signal, startTime = 0, timeout } = options;
  const worker = new Worker(window.URL.createObjectURL(blob));
  signal?.addEventListener(
    "abort",
    (_) => {
      _;
      worker.terminate();
    },
    { once: true },
  );
  let startTimer: number | undefined;
  let timeoutTimer: number | undefined;
  if (startTime) {
    startTimer = window.setTimeout(() => worker.postMessage(params), startTime);
  } else {
    worker.postMessage(params);
  }
  if (timeout) {
    timeoutTimer = window.setTimeout(() => {
      worker.terminate();
      clearTimeout(startTimer);
    }, timeout);
  }
  worker.addEventListener("message", (_) => {
    _;
    clearTimeout(timeoutTimer);
    clearTimeout(startTimer);
  });

  return worker;
}

/**
 * Creates a pool of workers to execute a given runnable function asynchronously.
 * @template P - The type of parameters accepted by the runnable function.
 * @template R - The type of result returned by the runnable function.
 * @param {IRunnable<P, R>} runnable - The function to be executed by the workers.
 * @param {IRunnableOption} [options] - Options for configuring the pool and worker behavior.
 * @returns {(...params: P) => Promise<IUnwrappedResult<R>>} A function that, when called with parameters, returns a Promise that resolves to the result of executing the runnable function.
 */
export function createPool<P extends Array<unknown>, R>(
  runnable: IRunnable<P, R>,
  options?: IRunnableOption,
) {
  return function (...params: P) {
    return new Promise<IUnwrappedResult<R>>((resolve, reject) => {
      const { log } = console;
      const retriesWithIn = options?.retriesWithIn || [];
      const logger = options?.logger || log;
      const retriesWithInLength = retriesWithIn.length;
      let retryCount = 0;
      let errorInstance: Error | undefined;
      function exitHandler(code: number) {
        if (code === 0) {
          return;
        }
        if (retryCount < retriesWithInLength) {
          const retryTimeout = retriesWithIn[retryCount++];
          logger(`Retry with in ${retryTimeout}ms`);
          setTimeout(tryExecution, retryTimeout);
        } else {
          reject(
            errorInstance instanceof Error
              ? errorInstance
              : new Error(`Worker stopped with exit code ${code}`),
          );
        }
      }
      function tryExecution() {
        const worker = createWorker(runnable, options, params);

        worker.addEventListener(
          "message",
          ({ data }: { data: IResponse<R> }) => {
            if (data.type === "success") {
              resolve(data.content as IUnwrappedResult<R>);
              worker.dispatchEvent(new ExitEvent(0));
            } else {
              errorInstance = data.error;
              worker.dispatchEvent(new ExitEvent(1));
            }
          },
          { once: true },
        );
        worker.addEventListener(
          "error",
          (errorEvent) => {
            errorInstance = errorEvent.error;
            worker.dispatchEvent(new ExitEvent(1));
          },
          { once: true },
        );

        worker.addEventListener(
          "exit",
          (event) => {
            if (event instanceof ExitEvent) {
              exitHandler(event.detail.code);
            }
          },
          { once: true },
        );
      }
      tryExecution();
    });
  };
}
