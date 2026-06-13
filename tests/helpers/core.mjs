import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const _require = createRequire(import.meta.url);
const _dir = dirname(fileURLToPath(import.meta.url));

export const {
  MAX_WORDS, WAW, FA, FREE, CONN_META,
  normalize, getConnector, connLabel, highlightOpening,
  findGroupsVariable, filterGroups,
} = _require(resolve(_dir, '../../assets/js/awail-core.js'));
