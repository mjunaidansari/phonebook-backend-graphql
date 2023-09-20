const { ApolloServer } = require('@apollo/server')
const { startStandaloneServer } = require('@apollo/server/standalone')
const { GraphQLError } = require('graphql')

// for creating id
const {v1: uuid} = require('uuid')

const mongoose = require('mongoose')
mongoose.set('strictQuery', false)
const Person = require('./model/person')

require('dotenv').config()

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

const typeDefs = `

  	type Address {
		street: String!
		city: String!
	}

  	type Person {
		name: String!
		phone: String
		address: Address!
		id: ID!
	}

	enum YesNo {
		Yes
		No
	}

	type Query {
		personCount: Int!
		allPersons(phone: YesNo): [Person!]!
		findPerson(name: String!): Person
	}

	type Mutation {
		addPerson(
			name: String!
			phone: String
			street: String!
			city: String!
		): Person
		editNumber(
			name: String!
			phone: String!
		): Person
	}

`

const resolvers = {
	Query: {
		personCount: async () => Person.collection.countDocuments(),
		
		allPersons: async(root, args) => {

			if(!args.phone) 
				return Person.find({})

			// const byPhone = (person) => args.phone == 'Yes'? person.phone : !person.phone
			return Person.find({phone: {$exists: args.phone === 'YES'}})

		},
		
		findPerson: async(root, args) => Person.findOne({name: args.name}) 

	},

    Person: {
		address: (root) => {
			return {
				street: root.street,
				city: root.city
			}
		}
	},

	Mutation: {
		addPerson: async(root, args) => {
			
			const person = new Person({args})
			
			try {
				await person.save()
			} catch (error) {
				throw new GraphQLError('Saving Person Failed', {
					extensions: {
						code: 'BAD_USER_INPUT',
						invalidArgs: args.name,
						error
					}
				})
			}

			return person

		},

		editNumber: async(root, args) => {

			const person = await Person.findOne({name: args.name})
			person.phone = args.phone

			try {
				await person.save()
			} catch (error) {
				throw new GraphQLError('Saving Number Failed', {
					extensions: {
						code: 'BAD_USER_INPUT',
						invalidArgs: args.name,
						error
					}
				})
			}

			return person
			
		}
	} 

}

const server = new ApolloServer({
	typeDefs, // Contains the GraphQL Schema
	resolvers, // describes how GraphQL queries are responded to
})

startStandaloneServer(server, {
	listen: {port: 4000},
}).then(({url}) => {
	console.log(`Server ready at ${url}`)
})