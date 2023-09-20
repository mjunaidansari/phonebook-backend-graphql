const { ApolloServer } = require('@apollo/server')
const { startStandaloneServer } = require('@apollo/server/standalone')
const { GraphQLError } = require('graphql')

const typeDefs = require('./GraphQL/typeDefs')
const resolvers = require('./GraphQL/resolvers')

// for creating id
const {v1: uuid} = require('uuid')

const mongoose = require('mongoose')
mongoose.set('strictQuery', false)
const Person = require('./model/person')
const User = require('./model/user')

require('dotenv').config()

const jwt = require('jsonwebtoken')

const MONGODB_URI = process.env.MONGODB_URI

console.log('Connecting to ', MONGODB_URI)

mongoose.connect(MONGODB_URI)
	.then(()=> {
		console.log('Connected to MongoDB')
	})
	.catch((error) => {
		console.log('Error connection to MongoDB: ', error.message)
	})

// let persons = [
// 	{
// 		name: "Arto Hellas",
// 		phone: "040-123543",
// 		street: "Tapiolankatu 5 A",
// 		city: "Espoo",
// 		id: "3d594650-3436-11e9-bc57-8b80ba54c431"
// 	},
// 	{
// 		name: "Matti Luukkainen",
// 		phone: "040-432342",
// 		street: "Malminkaari 10 A",
// 		city: "Helsinki",
// 		id: '3d599470-3436-11e9-bc57-8b80ba54c431'
// 	},
// 	{
// 		name: "Venla Ruuska",
// 		street: "Nallemäentie 22 C",
// 		city: "Helsinki",
// 		id: '3d599471-3436-11e9-bc57-8b80ba54c431'
// 	},
//   ]


const server = new ApolloServer({
	typeDefs, // Contains the GraphQL Schema
	resolvers, // describes how GraphQL queries are responded to
})

startStandaloneServer(server, {
	listen: {port: 4000},
	context: async ({req, res}) => {
		const auth = req ? req.headers.authorization : null
		if (auth && auth.startsWith('Bearer ')) {
			const decodedToken = jwt.verify(
				auth.substring(7), process.env.JWT_SECRET
			)
			const currentUser = await User.findById(decodedToken.id).populate('friends')
			return {currentUser} // the object returned is given as third parameter to all resolvers
		}
	}
}).then(({url}) => {
	console.log(`Server ready at ${url}`)
})