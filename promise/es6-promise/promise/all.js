import Enumerator from '../enumerator.js';

/**
  @method all
  @static
  @param {Array} entries array of promises
  @param {String} label optional string for labeling the promise.
  Useful for tooling.
  @return {Promise} promise that is fulfilled when all `promises` have been
  fulfilled, or rejected if any of them become rejected.
  @static
*/
export default function all(entries) {
  return new Enumerator(this, entries).promise;
}
