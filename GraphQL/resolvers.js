// import { GraphQLError } from 'graphql'
const {GraphQLError} = require('graphql')

const jwt = require('jsonwebtoken')

const { PubSub } = require('graphql-subscriptions')
const pubsub = new PubSub()

const User = require('../model/user')
const Person = require('../model/person')

const resolvers = {
	Query: {

		personCount: async () => Person.collection.countDocuments(),
		
		allPersons: async(root, args) => {

			if(!args.phone) 
				return Person.find({})

			// const byPhone = (person) => args.phone == 'Yes'? person.phone : !person.phone
			return Person.find({phone: {$exists: args.phone === 'YES'}})

		},
		
		findPerson: async(root, args) => Person.findOne({name: args.name}),

		me: (root, args, context) => {
			console.log(context.currentUser)
			return context.currentUser
		}

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
		addPerson: async(root, args, context) => {
			
			const person = new Person({...	args})
			const currentUser = context.currentUser

			if (!currentUser) {
				throw new GraphQLError('Not Authenticated', {
					extensions: {
						code: 'BAD_USER_INPUT'
					}
				})
			}

			try {
				await person.save()
				currentUser.friends = currentUser.friends.concat(person)
				await currentUser.save()
			} catch (error) {
				throw new GraphQLError('Saving Person Failed', {
					extensions: {
						code: 'BAD_USER_INPUT',
						invalidArgs: args.name,
						error
					}
				})
			}

			pubsub.publish('PERSON_ADDED', {personAdded: person})

			return person

		},

		addAsFriend: async(root, args, context) => {

			const isFriend = (person) => 
				context.currentUser.friends.map(f => f._id.toString()).includes(person._id.toString())

			if (!context.currentUser) {
				throw new GraphQLError('Wrong Credentials', {
					extensions: {
						code: 'BAD_USER_INPUT'
					}
				})
			}

			const person = await Person.findOne({name: args.name})
			if (!isFriend(person))
				context.currentUser.friends = context.currentUser.friends.concat(person)

			await currentUser.save()

			return currentUser

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
			
		},

		createUser: async(root, args) => {

			const user = new User({username: args.username})

			try {
				user.save()
			} catch(error) {
				throw new GraphQLError('User Creation Failed', {
					extensions: {
						code: 'BAD_USER_INPUT',
						invalidArgs: args.username,
						error
					}
				})
			}
			
			return user

		},

		login: async (root, args) => {

			const user = await User.findOne({username: args.username})

			if (!user || args.password !== 'secret') {
				throw new GraphQLError('Invalid Credentials', {
					extensions: {
						code: 'BAD_USER_INPUT'
					}
				})
			}

			const userForToken = {
				username: user.username,
				id: user._id,
			}

			return {
				value: jwt.sign(userForToken, process.env.JWT_SECRET)
			}

		}

	},

	Subscription: {
		
		personAdded: {
			subscribe: () => pubsub.asyncIterator('PERSON_ADDED')
		}

	}

}

module.exports = resolvers