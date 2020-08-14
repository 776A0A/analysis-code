// Promises/A+规范
// https://promisesaplus.com/

const { tryCatch, isThenable, resolvePromise } = require('./utils')
const { resolve, reject, all, race, allSettled } = require('./static')

const PENDING = 0,
	FULFILLED = 1,
	REJECTED = 2

let id = -1

class Promise {
	constructor(executor) {
		if (typeof executor !== 'function')
			throw new Error('executor必须是一个函数')

		this.state = PENDING
		this.value = this.reason = undefined
		this.fulfilledQueue = []
		this.rejectedQueue = []
		this._promise_id_ = ++id

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
							resolvePromise(
								promise,
								() => onFulfilled(value), // 在调用onFulfilled时可能会出错，所以将它包装一下传进去，在try-catch下进行调用
								resolve,
								reject
							)
						})
					})
					this.rejectedQueue.push(reason => {
						if (onRejected.called) return
						onRejected.called = true
						setTimeout(() => {
							resolvePromise(promise, () => onRejected(reason), resolve, reject)
						})
					})
					break
				case FULFILLED:
					setTimeout(() => {
						resolvePromise(
							promise,
							() => onFulfilled(this.value),
							resolve,
							reject
						)
					})
					break
				case REJECTED:
					setTimeout(() => {
						resolvePromise(
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
			value => this.constructor.resolve(callback()).then(() => value),
			err =>
				this.constructor.resolve(callback()).then(() => {
					throw err
				})
		)
	}
}

Promise.resolve = resolve
Promise.reject = reject
Promise.all = all
Promise.race = race
Promise.allSettled = allSettled

module.exports = Promise
