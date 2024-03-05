export {
  IResponse,
  IRunnable,
  IRunnableOption,
  IUnwrappedResult,
} from "./interfaces";

import { createPool, createWorker } from "./lib";
export { createWorker };
export default createPool;
