const mongoose = require('mongoose')

const schema = mongoose.Schema({
	username: {
		type: String,
		required: true,
		minLength: 3
	},
	friends: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Person'
		}
	],
})

module.exports = mongoose.model('User', schema)