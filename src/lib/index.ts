import {
  createPool as createRuntimePool,
  createWorker as createRuntimeWorker,
} from "./runtime";
import {
  createPool as createWebPool,
  createWorker as createWebWorker,
} from "./web";

const isNodeEnvironment = true;
export const createPool = isNodeEnvironment ? createRuntimePool : createWebPool;

export const createWorker = isNodeEnvironment
  ? createRuntimeWorker
  : createWebWorker;
