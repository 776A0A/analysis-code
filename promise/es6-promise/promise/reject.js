import {
  noop,
  reject as _reject
} from '../-internal.js';

/**
  @method reject
  @static
  @param {Any} reason value that the returned promise will be rejected with.
  Useful for tooling.
  @return {Promise} a promise rejected with the given `reason`.
*/
export default function reject(reason) {
  /*jshint validthis:true */
  let Constructor = this;
  let promise = new Constructor(noop);
  _reject(promise, reason);
  return promise;
}
