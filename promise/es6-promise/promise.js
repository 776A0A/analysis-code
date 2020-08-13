import { isFunction } from './utils.js'
import { noop, nextId, PROMISE_ID, initializePromise } from './-internal.js'
import { asap, setAsap, setScheduler } from './asap.js'

import all from './promise/all.js'
import race from './promise/race.js'
import Resolve from './promise/resolve.js'
import Reject from './promise/reject.js'
import then from './then.js'

function needsResolver() {
	throw new TypeError(
		'You must pass a resolver function as the first argument to the promise constructor'
	)
}

function needsNew() {
	throw new TypeError(
		"Failed to construct 'Promise': Please use the 'new' operator, this object constructor cannot be called as a function."
	)
}
/*
  @class Promise
  @param {Function} resolver
  Useful for tooling.
  @constructor
*/

class Promise {
	constructor(resolver) {
		this[PROMISE_ID] = nextId() // 产生一个随机的id
		this._result = this._state = undefined
		this._subscribers = []

		if (noop !== resolver) {
			typeof resolver !== 'function' && needsResolver() // 不是函数抛错
			this instanceof Promise ? initializePromise(this, resolver) : needsNew() // 没有用new也会抛错
		}
	}
	/*
  @method catch
  @param {Function} onRejection
  Useful for tooling.
  @return {Promise}
  */
	catch(onRejection) {
		return this.then(null, onRejection)
	}
	/*
  @method finally
  @param {Function} callback
  @return {Promise}
*/
	finally(callback) {
		let promise = this
		let constructor = promise.constructor

		if (isFunction(callback)) {
			return promise.then(
				value => constructor.resolve(callback()).then(() => value),
				reason =>
					constructor.resolve(callback()).then(() => {
						throw reason
					})
			)
		}

		return promise.then(callback, callback)
	}
}

Promise.prototype.then = then
export default Promise
Promise.all = all
Promise.race = race
Promise.resolve = Resolve
Promise.reject = Reject
Promise._setScheduler = setScheduler
Promise._setAsap = setAsap
Promise._asap = asap
