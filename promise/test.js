const PENDING = 0,
	FULFILLED = 1,
	REJECTED = 2

let id = -1
const PROMISE_ID = Math.random().toString(36).slice(2)

class Promise {
	constructor(executor) {
		if (typeof executor !== 'function')
			throw new Error('executor必须是一个函数')
		this.state = PENDING
		this.value = this.reason = undefined
		this.fulfilledQueue = []
		this.rejectedQueue = []
		this[PROMISE_ID] = ++id

		const resolve = value => {
			if (this.state) return
			this.state = FULFILLED
			this.value = value
			this.fulfilledQueue.forEach(fn => fn(value))
		}
		const reject = reason => {
			if (this.state) return
			this.state = REJECTED
			this.reason = reason
			this.rejectedQueue.forEach(fn => fn(reason))
		}

		try {
			executor(resolve, reject)
		} catch (err) {
			reject(err)
		}
	}
	then(onFulfilled, onRejected) {
		typeof onFulfilled !== 'function' && (onFulfilled = value => value)
		typeof onRejected !== 'function' &&
			(onRejected = reason => {
				throw reason
			})

		const promise = new Promise((resolve, reject) => {
			switch (this.state) {
				case PENDING:
					this.fulfilledQueue.push(value => {
						if (onFulfilled.called) return
						onFulfilled.called = true
						setTimeout(() => {
							resolveThenable(
								promise,
								() => onFulfilled(value), // 在调用 onFulfilled时可能会出错，所以将它包装一下传进去，在try-catch下进行调用
								resolve,
								reject
							)
						})
					})
					this.rejectedQueue.push(reason => {
						if (onRejected.called) return
						onRejected.called = true
						setTimeout(() => {
							resolveThenable(
								promise,
								() => onRejected(reason),
								resolve,
								reject
							)
						})
					})
					break
				case FULFILLED:
					setTimeout(() => {
						resolveThenable(
							promise,
							() => onFulfilled(this.value),
							resolve,
							reject
						)
					})
					break
				case REJECTED:
					setTimeout(() => {
						resolveThenable(
							promise,
							() => onRejected(this.reason),
							resolve,
							reject
						)
					})
					break
			}
		})

		return promise
	}
	catch(onRejected) {
		return this.then(null, onRejected)
	}
	finally(callback) {
		if (typeof callback !== 'function') return this

		return this.then(
			value => {
				callback()
				return value
			},
			err => {
				callback()
				throw err
			}
		)
	}
	static resolve(value) {
		if (value instanceof Promise) return value
		else return new this(resolve => resolve(value))
	}
	static reject(reason) {
		return new this((_, reject) => reject(reason))
	}
	static all(promises) {
		if (!Array.isArray(promises)) throw TypeError('必须传入一个数组')

		return new this((resolve, reject) => {
			let i = 0,
				len = promises.length,
				promise,
				res = []
			for (; (promise = promises[i++]); ) {
				promise.then(
					val => {
						res.push(val)
						if (res.length === len) resolve(res)
					},
					err => {
						reject(err)
					}
				)
			}
		})
	}
	static race(promises) {
		if (!Array.isArray(promises)) throw TypeError('必须传入一个数组')
		return new this((resolve, reject) => {
			let i = 0,
				promise
			for (; (promise = promises[i++]); ) {
				promise.then(resolve, reject)
			}
		})
	}
}

function tryCatch(resolve, reject) {
	try {
		resolve()
	} catch (err) {
		reject(err)
	}
}

function isThenable(val) {
	if (val instanceof Promise) return true
	else if (val && (typeof val === 'object' || typeof val === 'function'))
		return true
	else return false
}

function resolveThenable(promise, handler, resolve, reject) {
	tryCatch(() => {
		const value = handler()
		if (promise === value) throw new TypeError('不能返回自身')

		if (isThenable(value)) {
			const then = value.then
			if (typeof then === 'function') {
				value.then.call(
					value,
					_val => {
						resolveThenable(promise, () => _val, resolve, reject)
					},
					reject
				)
			} else resolve(value)
		} else resolve(value)
	}, reject)
}

const p = new Promise((resolve, reject) => {
	setTimeout(() => {
		reject(1)
	}, 1000)
})
p.finally(() => {
	console.log('finally')
}).catch(err => {
	console.log(err)
})

module.exports = {
	deferred() {
		const p = {}
		p.promise = new Promise((resolve, reject) => {
			p.resolve = resolve
			p.reject = reject
		})
		return p
	}
}
