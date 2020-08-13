import Promise from './promise.js'

const p = new Promise((resolve, reject) => {
	resolve(Promise.resolve())
	console.log(1)
})
p.then(val => {
	console.log(val)
	return 4
}).then(num => {
	console.log(num)
})
