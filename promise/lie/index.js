'use strict'
var immediate = require('./node_modules/_immediate@3.3.0@immediate/lib/index')

/* istanbul ignore next */
function INTERNAL() {}

var handlers = {}

var REJECTED = ['REJECTED']
var FULFILLED = ['FULFILLED']
var PENDING = ['PENDING']
/* istanbul ignore else */
if (!process.browser) {
	// in which we actually take advantage of JS scoping
	var UNHANDLED = ['UNHANDLED']
}

module.exports = Promise

function Promise(resolver) {
	if (typeof resolver !== 'function') {
		throw new TypeError('resolver must be a function')
	}
	this.state = PENDING
	this.queue = []
	this.outcome = void 0
	/* istanbul ignore else */
	if (!process.browser) {
		this.handled = UNHANDLED
	}
	if (resolver !== INTERNAL) {
		safelyResolveThenable(this, resolver)
	}
}

Promise.prototype.finally = function (callback) {
	if (typeof callback !== 'function') {
		return this
	}
	var p = this.constructor
	return this.then(resolve, reject)

	function resolve(value) {
		function yes() {
			return value
		}
		// finally调用完之后接着把前面传过来的值往后传
		return p.resolve(callback()).then(yes)
	}
	function reject(reason) {
		function no() {
			throw reason
		}
		return p.resolve(callback()).then(no)
	}
}
Promise.prototype.catch = function (onRejected) {
	return this.then(null, onRejected)
}
Promise.prototype.then = function (onFulfilled, onRejected) {
	if (
		(typeof onFulfilled !== 'function' && this.state === FULFILLED) ||
		(typeof onRejected !== 'function' && this.state === REJECTED)
	) {
		return this
	}
	var promise = new this.constructor(INTERNAL)
	/* istanbul ignore else */
	if (!process.browser) {
		if (this.handled === UNHANDLED) {
			this.handled = null
		}
	}
	if (this.state !== PENDING) {
		// 传入then的回调
		var resolver = this.state === FULFILLED ? onFulfilled : onRejected
		// 将回调放入异步队列
		unwrap(promise, resolver, this.outcome)
	} else {
		// 如果还在pending状态，则推入queue中
		this.queue.push(new QueueItem(promise, onFulfilled, onRejected))
	}

	return promise
}
function QueueItem(promise, onFulfilled, onRejected) {
	this.promise = promise
	if (typeof onFulfilled === 'function') {
		this.onFulfilled = onFulfilled
		// 如果onFulfilled是函数，则覆盖原有的callFulfilled
		this.callFulfilled = this.otherCallFulfilled
	}
	if (typeof onRejected === 'function') {
		this.onRejected = onRejected
		this.callRejected = this.otherCallRejected
	}
}
QueueItem.prototype.callFulfilled = function (value) {
	// 相当于同步返回 promise 实例
	handlers.resolve(this.promise, value)
}
QueueItem.prototype.otherCallFulfilled = function (value) {
	// 包装到异步队列
	unwrap(this.promise, this.onFulfilled, value)
}
QueueItem.prototype.callRejected = function (value) {
	handlers.reject(this.promise, value)
}
QueueItem.prototype.otherCallRejected = function (value) {
	unwrap(this.promise, this.onRejected, value)
}

// 这个promise是将要返回的promise实例，
// func是传入then的回调，放入异步队列
function unwrap(promise, func, value) {
	immediate(function () {
		var returnValue
		try {
			returnValue = func(value)
		} catch (e) {
			return handlers.reject(promise, e)
		}
		if (returnValue === promise) {
			handlers.reject(
				promise,
				new TypeError('Cannot resolve promise with itself')
			)
		} else {
			handlers.resolve(promise, returnValue)
		}
	})
}

// 只要resolve了就要到这里，self是promise实例
// value是resolve时传入的参数
// 在这里实例的state会转换为fulfilled
handlers.resolve = function (self, value) {
	// result含有status和value两个属性
	var result = tryCatch(getThen, value)
	if (result.status === 'error') {
		return handlers.reject(self, result.value)
	}
	var thenable = result.value

	// 返回值是否是thenable的
	if (thenable) {
		safelyResolveThenable(self, thenable)
	} else {
		self.state = FULFILLED
		self.outcome = value
		var i = -1
		var len = self.queue.length
		while (++i < len) {
			self.queue[i].callFulfilled(value)
		}
	}
	return self
}
handlers.reject = function (self, error) {
	self.state = REJECTED
	self.outcome = error
	/* istanbul ignore else */
	if (!process.browser) {
		if (self.handled === UNHANDLED) {
			immediate(function () {
				if (self.handled === UNHANDLED) {
					process.emit('unhandledRejection', error, self)
				}
			})
		}
	}
	var i = -1
	var len = self.queue.length
	while (++i < len) {
		self.queue[i].callRejected(error)
	}
	return self
}

// 这里的参数是resolve时传入的参数
function getThen(obj) {
	// Make sure we only access the accessor once as required by the spec
	var then = obj && obj.then
	// 判断传入的是否是thenable对象
	if (
		obj &&
		(typeof obj === 'object' || typeof obj === 'function') &&
		typeof then === 'function'
	) {
		return function appyThen() {
			then.apply(obj, arguments)
		}
	}
}

// 这个thenable就是最开始new的时候传入的函数
// self是promise实例
function safelyResolveThenable(self, thenable) {
	// Either fulfill, reject or reject with error
	var called = false
	function onError(value) {
		if (called) {
			return
		}
		called = true
		handlers.reject(self, value)
	}

	// 就是resolve
	function onSuccess(value) {
		if (called) {
			return
		}
		called = true
		handlers.resolve(self, value)
	}

	function tryToUnwrap() {
		thenable(onSuccess, onError)
	}

	var result = tryCatch(tryToUnwrap)
	if (result.status === 'error') {
		onError(result.value)
	}
}
// func包装过后的resolver，接收resolve和reject回调
// func也可能是getThen函数
// value为可选参数
function tryCatch(func, value) {
	var out = {}
	try {
		out.value = func(value)
		out.status = 'success'
	} catch (e) {
		out.status = 'error'
		out.value = e
	}
	return out
}

Promise.resolve = resolve
function resolve(value) {
	if (value instanceof this) {
		return value
	}
	// 这个this是Promise构造器
	return handlers.resolve(new this(INTERNAL), value)
}

Promise.reject = reject
function reject(reason) {
	var promise = new this(INTERNAL)
	return handlers.reject(promise, reason)
}

Promise.all = all
function all(iterable) {
	var self = this
	if (Object.prototype.toString.call(iterable) !== '[object Array]') {
		return this.reject(new TypeError('must be an array'))
	}

	var len = iterable.length
	var called = false
	if (!len) {
		return this.resolve([])
	}

	var values = new Array(len)
	var resolved = 0
	var i = -1
	var promise = new this(INTERNAL)

	while (++i < len) {
		allResolver(iterable[i], i)
	}
	return promise
	function allResolver(value, i) {
		self.resolve(value).then(resolveFromAll, function (error) {
			if (!called) {
				called = true
				handlers.reject(promise, error)
			}
		})
		function resolveFromAll(outValue) {
			values[i] = outValue
			if (++resolved === len && !called) {
				called = true
				handlers.resolve(promise, values)
			}
		}
	}
}

Promise.race = race
function race(iterable) {
	var self = this
	if (Object.prototype.toString.call(iterable) !== '[object Array]') {
		return this.reject(new TypeError('must be an array'))
	}

	var len = iterable.length
	var called = false
	if (!len) {
		return this.resolve([])
	}

	var i = -1
	var promise = new this(INTERNAL)

	while (++i < len) {
		resolver(iterable[i])
	}
	return promise
	function resolver(value) {
		self.resolve(value).then(
			function (response) {
				if (!called) {
					called = true
					handlers.resolve(promise, response)
				}
			},
			function (error) {
				if (!called) {
					called = true
					handlers.reject(promise, error)
				}
			}
		)
	}
}

Promise.resolve(1)
	.then(val => {
		console.log(val)
		return {
			then() {
				console.log('then')
				return 2
			}
		}
	})
	.then(val => {
		console.log(val)
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
