import { noop, resolve as _resolve } from '../-internal.js'

/**
  @method resolve
  @static
  @param {Any} value value that the returned promise will be resolved with
  Useful for tooling.
  @return {Promise} a promise that will become fulfilled with the given
  `value`
*/
export default function resolve(object) {
	/*jshint validthis:true */
	let Constructor = this

	// 如果是promise实例，直接返回该实例
	if (
		object &&
		typeof object === 'object' &&
		object.constructor === Constructor
	) {
		return object
	}

	let promise = new Constructor(noop)
	_resolve(promise, object)
	return promise
}
