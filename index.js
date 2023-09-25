const { ApolloServer } = require('@apollo/server')
const { startStandaloneServer } = require('@apollo/server/standalone')
const { expressMiddleware } = require('@apollo/server/express4')
const { ApolloServerPluginDrainHttpServer } = require('@apollo/server/plugin/drainHttpServer')
const { makeExecutableSchema } = require('@graphql-tools/schema')
const express = require('express')
const cors = require('cors')
const http = require('http')

const { WebSocketServer } = require('ws')
const { useServer } = require('graphql-ws/lib/use/ws')

const typeDefs = require('./GraphQL/schema')
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

const start = async () => {

	const app = express()
	const httpServer = http.createServer(app)

	// registers a WebSocketServer object to listen the WebSocket connections
	const wsServer = new WebSocketServer({
		server: httpServer,
		path: '/',
	})

	const schema = makeExecutableSchema({typeDefs, resolvers})
	const serverCleanup = useServer({schema}, wsServer)

	const server = new ApolloServer({
		schema,
		plugins: [
			// proper shutdown for http server
			ApolloServerPluginDrainHttpServer({httpServer}),
			// proper shutdown for WebSocket server
			{
				async serversWillStart() {
					return {
						async drainServer() {
							await serverCleanup.dispose()
						},
					}
				},
			},
		],
	})

	await server.start()

	app.use(
		'/',
		cors(),
		express.json(),
		expressMiddleware(server, {
			context: async ({req}) => {
				const auth = req ? req.headers.authorization : null
				if (auth && auth.startsWith('Bearer ')) {
					const decodedToken = jwt.verify(auth.substring(7), process.env.JWT_SECRET)
					const currentUser = await User.findById(decodedToken.id).populate('friends')
					return { currentuser }
				}
			},
		}),
	)

	const PORT = 4000

	httpServer.listen(PORT, () => {
		console.log(`Server is now running on http://localhost:${PORT}`)
	})

}

start()


// const server = new ApolloServer({
// 	typeDefs, // Contains the GraphQL Schema
// 	resolvers, // describes how GraphQL queries are responded to
// })

// startStandaloneServer(server, {
// 	listen: {port: 4000},
// 	context: async ({req, res}) => {
// 		const auth = req ? req.headers.authorization : null
// 		if (auth && auth.startsWith('Bearer ')) {
// 			const decodedToken = jwt.verify(
// 				auth.substring(7), process.env.JWT_SECRET
// 			)
// 			const currentUser = await User.findById(decodedToken.id).populate('friends')
// 			return {currentUser} // the object returned is given as third parameter to all resolvers
// 		}
// 	}
// }).then(({url}) => {
// 	console.log(`Server ready at ${url}`)
// })