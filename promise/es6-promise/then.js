import {
	invokeCallback,
	subscribe,
	FULFILLED,
	REJECTED,
	noop,
	makePromise,
	PROMISE_ID
} from './-internal.js'

import { asap } from './asap.js'

export default function then(onFulfillment, onRejection) {
	const parent = this

	const child = new this.constructor(noop)

	// 这里主要就是赋值了一个id，操作感觉有点多余，因为这个PROMISE_ID在实例化的时候会赋值
	if (child[PROMISE_ID] === undefined) {
		makePromise(child)
	}
  // 取出当前的状态
	const { _state } = parent

	if (_state) {
		const callback = arguments[_state - 1] // 这里_state要么是1要么是2
		asap(() => invokeCallback(_state, child, callback, parent._result))
	} else {
		subscribe(parent, child, onFulfillment, onRejection)
	}

	return child
}
