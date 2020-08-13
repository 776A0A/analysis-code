import { objectOrFunction, isFunction } from './utils.js'

import { asap } from './asap.js'

import originalThen from './then.js'
import originalResolve from './promise/resolve.js'

export const PROMISE_ID = Math.random().toString(36).substring(2) // 产生一个随机字符串

function noop() {}

const PENDING = void 0 // 这个pending。。。
const FULFILLED = 1
const REJECTED = 2

function selfFulfillment() {
	return new TypeError('You cannot resolve a promise with itself')
}

function cannotReturnOwn() {
	return new TypeError('A promises callback cannot return that same promise.')
}

/**
 * 如果传给resolve的是thenable对象并且不是promise实例，则会调用此函数
 * then是函数，value包含该then函数的对象
 */
function tryThen(then, value, fulfillmentHandler, rejectionHandler) {
	try {
		then.call(value, fulfillmentHandler, rejectionHandler)
	} catch (e) {
		return e
	}
}

function handleForeignThenable(promise, thenable, then) {
	asap(promise => {
		let sealed = false
		let error = tryThen(
			then,
			thenable,
			value => {
				if (sealed) {
					return
				}
				sealed = true
				if (thenable !== value) {
					resolve(promise, value)
				} else {
					fulfill(promise, value)
				}
			},
			reason => {
				if (sealed) {
					return
				}
				sealed = true

				reject(promise, reason)
			},
			'Settle: ' + (promise._label || ' unknown promise')
		)

		if (!sealed && error) {
			sealed = true
			reject(promise, error)
		}
	}, promise)
}

function handleOwnThenable(promise, thenable) {
	if (thenable._state === FULFILLED) {
		fulfill(promise, thenable._result)
	} else if (thenable._state === REJECTED) {
		reject(promise, thenable._result)
	} else {
		subscribe(
			thenable,
			undefined,
			value => resolve(promise, value),
			reason => reject(promise, reason)
		)
	}
}

function handleMaybeThenable(promise, maybeThenable, then) {
	if (
		maybeThenable.constructor === promise.constructor &&
		then === originalThen &&
		maybeThenable.constructor.resolve === originalResolve
	) {
		handleOwnThenable(promise, maybeThenable)
	} else {
		if (then === undefined) {
			fulfill(promise, maybeThenable)
		} else if (isFunction(then)) {
			handleForeignThenable(promise, maybeThenable, then)
		} else {
			fulfill(promise, maybeThenable)
		}
	}
}

function resolve(promise, value) {
	if (promise === value) {
		reject(promise, selfFulfillment())
	}
	// 可能是thenable对象
	else if (objectOrFunction(value)) {
		let then
		try {
			then = value.then
		} catch (error) {
			reject(promise, error)
			return
		}
		handleMaybeThenable(promise, value, then)
	} else {
		fulfill(promise, value)
	}
}

function publishRejection(promise) {
	if (promise._onerror) {
		promise._onerror(promise._result)
	}

	publish(promise)
}

// 在resolve的时候会执行队列
function fulfill(promise, value) {
	if (promise._state !== PENDING) {
		return
	}

	promise._result = value
	promise._state = FULFILLED

	if (promise._subscribers.length !== 0) {
		asap(publish, promise)
	}
}

function reject(promise, reason) {
	if (promise._state !== PENDING) {
		return
	}
	promise._state = REJECTED
	promise._result = reason

	asap(publishRejection, promise)
}

// onFulfillment, onRejection 就是传给then的回调
function subscribe(parent, child, onFulfillment, onRejection) {
	let { _subscribers } = parent
	let { length } = _subscribers

	parent._onerror = null

	// 为什么要这么推？
	_subscribers[length] = child
	_subscribers[length + FULFILLED] = onFulfillment
	_subscribers[length + REJECTED] = onRejection

	// 这个检查是否多余？
	if (length === 0 && parent._state) {
		// 这个parent-promise会传给这个publish
		asap(publish, parent)
	}
}

// 执行回调队列
function publish(promise) {
	let subscribers = promise._subscribers
	let settled = promise._state

	if (subscribers.length === 0) {
		return
	}

	let child,
		callback,
		detail = promise._result // resolve的时候的值

	for (let i = 0; i < subscribers.length; i += 3) {
		child = subscribers[i] // then中产生的promise
		callback = subscribers[i + settled] // 要么是fulfilled的回调，要么是rejected的回调

		if (child) {
			invokeCallback(settled, child, callback, detail)
		} else {
			callback(detail)
		}
	}

	promise._subscribers.length = 0
}

/**
 * settled 就是state
 * promise，then中需要返回的promise
 * callback，根据settled选择出的应该调用的回调
 * detail，该promise的值
 */
function invokeCallback(settled, promise, callback, detail) {
	let hasCallback = isFunction(callback),
		value,
		error,
		succeeded = true

	if (hasCallback) {
		try {
			value = callback(detail)
		} catch (e) {
			succeeded = false
			error = e
		}

		if (promise === value) {
			reject(promise, cannotReturnOwn())
			return
		}
	} else {
		value = detail // 传递值
	}

	// 通过这种方式避免重复执行
	if (promise._state !== PENDING) {
		// noop
	} else if (hasCallback && succeeded) {
		resolve(promise, value)
	} else if (succeeded === false) {
		reject(promise, error)
	}
	// 根据上一个promise的state设置then中要返回的promise的状态
	// 这两个函数主要就是设置状态和值，并且将回调推入异步队列
	else if (settled === FULFILLED) {
		fulfill(promise, value)
	} else if (settled === REJECTED) {
		reject(promise, value)
	}
}

// try-catch并且传入包装后的resolve和reject
function initializePromise(promise, resolver) {
	try {
		resolver(
			function resolvePromise(value) {
				resolve(promise, value)
			},
			function rejectPromise(reason) {
				reject(promise, reason)
			}
		)
	} catch (e) {
		reject(promise, e)
	}
}

// 生成promise实例id
let id = 0
function nextId() {
	return id++
}

function makePromise(promise) {
	promise[PROMISE_ID] = id++
	promise._state = undefined
	promise._result = undefined
	promise._subscribers = []
}

export {
	nextId,
	makePromise,
	noop,
	resolve,
	reject,
	fulfill,
	subscribe,
	publish,
	publishRejection,
	initializePromise,
	invokeCallback,
	FULFILLED,
	REJECTED,
	PENDING,
	handleMaybeThenable
}
