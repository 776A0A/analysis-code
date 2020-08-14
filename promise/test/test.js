const Promise = require('./index')

const p = new Promise((resolve, reject) => {
	setTimeout(() => {
		resolve(1)
	}, 500)
})
p.then(val => {
	console.log(val)
	return Promise.resolve({
		then(resolve, reject) {
			console.log(2)
			setTimeout(() => {
				resolve({
					then(_resolve, _reject) {
						_resolve(9)
					}
				})
			}, 1000)
			return 4
		}
	})
})
	.then(val => {
		console.log(val)
	})
	.catch(err => {
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
