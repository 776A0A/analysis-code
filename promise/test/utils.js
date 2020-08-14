function tryCatch(resolve, reject) {
	try {
		return resolve()
	} catch (err) {
		return reject(err)
	}
}

function isThenable(val) {
	if (val instanceof this) return true
	else if (val && (typeof val === 'object' || typeof val === 'function'))
		return true
	else return false
}

function resolvePromise(promise, handler, resolve, reject) {
	return tryCatch(() => {
		const value = handler()
		if (promise === value) throw new TypeError('不能返回自身')

		if (isThenable.call(promise.constructor, value)) {
			// 这个then和promise实例的then不一样，可以把这个then想象成new Promise时传入的executor
			const then = value.then
			let called // 这个called也可以理解为thenable对象的状态是否已经改变
			if (typeof then === 'function') {
				/**
				 * 根据规范，thenable对象的then接收的回到函数只能调用一次
				 * 并且，如果调用then时出错，但是回调已经执行，那么也会进行忽略
				 */
				try {
					then.call(
						value,
						_val => {
							if (called) return
							called = true
							resolvePromise(promise, () => _val, resolve, reject)
						},
						err => {
							if (called) return
							called = true
							reject(err)
						}
					)
				} catch (err) {
					// thenable的状态已经改变则直接忽略
					!called && reject(err)
				}
			} else resolve(value)
		} else resolve(value)
	}, reject)
}

module.exports = {
	tryCatch,
	isThenable,
	resolvePromise
}
