const io = require('socket.io')()
const mongo = require('mongodb').MongoClient
const MONGODB_URI = process.env.MONGODB_URI

let chatName = ''


io.on('connection', socket => {

  console.log('a user connected')

  socket.on('create', (user, currentUser) => {
    if(user === null || currentUser === null){
      console.log('user = ', user, 'currentUser = ', currentUser)
      console.log('skipping...')
    } else {
      chatName = user.toString() + '_' + currentUser.toString()
      mongo.connect(MONGODB_URI, (err, db) => {
        let collection = db.collection(chatName)
        db.listCollections({name: chatName}).next((err, collInfo) => {
          if(collInfo){
            console.log('chatroom ' + chatName + ' already exists, not creating...')
          } else {
            db.createCollection(chatName)
            console.log('chatroom ' + chatName + ' created')
          }
        })
      })
    }
  })

  socket.on('room', room => {
    console.log('joining room', room)
    chatName = room
    if(room === null || room === ''){
      console.log('room is ' + room + ', skipping...')
    } else {
      socket.join(room)
      socket.emit('clear chat', [], room)
      mongo.connect(MONGODB_URI, (err, db) => {
        let collection = db.collection(room)
        let stream = collection.aggregate([
          {'$sort': {date: -1}},
          {'$limit': 10},
          {'$sort': {date: 1}}
        ]).stream()
        stream.on('data', chat => {
          socket.emit('load chat', chat, room)
        })
      })
    }
  })

socket.on('chat', (usr, msg, date, chatRoom) => {
    mongo.connect(MONGODB_URI, (err, db) => {
      let collection = db.collection(chatRoom)
      collection.insert({user: usr, content: msg, date: date}, (err, o) => {
        if(err){
          console.warn(err.message)
        } else {
          console.log(usr + " chat message " + msg + " inserted into db: " + chatRoom + " with timestamp " + date)
        }
      })
    })
    console.log(chatRoom)
    console.log('emitting message', msg, 'from user', usr, 'in room', chatRoom)
    io.to(chatRoom).emit('chat', {room: chatRoom, user: usr, content: msg})
    })



})

const port = process.env.PORT || 3002
io.listen(port)
console.log('listening on port', port)
