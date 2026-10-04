import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readArray, updateArray, writeArrayAtomic } from './json-file-store.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const ordersFile = path.join(root, 'data', 'orders.json');

export function getOrders() {
  return readArray(ordersFile);
}

export function saveOrders(orders) {
  return writeArrayAtomic(ordersFile, orders);
}

export function updateOrders(updater) {
  return updateArray(ordersFile, updater);
}

export function appendOrder(order) {
  return updateOrders((orders) => {
    orders.unshift(order);
    return orders;
  });
}
