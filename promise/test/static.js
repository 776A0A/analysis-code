function resolve(value) {
	if (value instanceof this) return value
	else return new this(resolve => resolve(value))
}
function reject(reason) {
	return new this((_, reject) => reject(reason))
}
function all(promises) {
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
function race(promises) {
	if (!Array.isArray(promises)) throw TypeError('必须传入一个数组')

	return new this((resolve, reject) => {
		let i = 0,
			promise
		for (; (promise = promises[i++]); ) {
			promise.then(resolve, reject)
		}
	})
}
function allSettled(promises) {
	if (!Array.isArray(promises)) throw TypeError('必须传入一个数组')

	return new this((resolve, reject) => {
		let i = 0,
			len = promises.length,
			promise,
			res = [],
			pusher = pusher.bind(null, resolve, res, len)

		for (; (promise = promises[i++]); ) {
			promise.then(pusher, err => pusher(err))
		}
	})

	function pusher(resolve, res, len, value) {
		res.push(value)
		if (res.length === len) return resolve(res)
		return value
	}
}

module.exports = {
	resolve,
	reject,
	all,
	race,
	allSettled
}
