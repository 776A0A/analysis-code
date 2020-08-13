import {
  isArray
} from "../utils.js";

/**
  @method race
  @static
  @param {Array} promises array of promises to observe
  Useful for tooling.
  @return {Promise} a promise which settles in the same way as the first passed
  promise to settle.
*/
export default function race(entries) {
  /*jshint validthis:true */
  let Constructor = this;

  if (!isArray(entries)) {
    return new Constructor((_, reject) => reject(new TypeError('You must pass an array to race.')));
  } else {
    return new Constructor((resolve, reject) => {
      let length = entries.length;
      for (let i = 0; i < length; i++) {
        Constructor.resolve(entries[i]).then(resolve, reject);
      }
    });
  }
}
