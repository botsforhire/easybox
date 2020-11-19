const MongoClient = require('mongodb').MongoClient

if(!process.env.MONGODB){
  throw new Error(`Please create a new enviroment variable called MONGODB and set it to your connection string.`)
}

var db = null
const dbClient = new MongoClient(process.env.MONGODB, { useUnifiedTopology: true })



async function connectDatabase(collection="easybox"){
  var client = await dbClient.connect()
  db = client.db(collection)

  module.exports.db = db
  console.log(`Connected to database`)

  return db
}

// connectDatabase()


module.exports = {
  connectDatabase: connectDatabase,
  db: db
}
