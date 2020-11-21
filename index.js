/*
How It Works

Each box is like one database on mongodb (its really not). You can have different collections on box

GET /box/:id - Returns all the data from all the collections

GET /box/:id/:collection_name - Return data from one collection

POST /box/:id/:collection_name - Add a 'document' to a collection

DELETE /box/:id/:collection_name/:document_id - Delete a 'document' by the ID

PUT /box/:id/:collection_name/:document_id - Update a 'document' by the ID


TODO:

- Encrypt the data in the mongoDB database
- Add homepage

*/
const express = require('express')
const port = process.env.PORT || 3000
var database = require('./database')

const crypto = require('crypto')
var app = express()
var db = null

var fetch = require('node-fetch')
var chalk = require('chalk')
var logging = (process.env.NODE_ENV == 'production') == false

async function generateHash(key=new Date().getTime().toString()) {
  return crypto.createHmac('sha1', process.env.HASH_KEY)
    .update(key)
    .digest('hex')
}

async function generateID() {
  var id = Math.floor(Math.random() * 9999999999999) + 11111111

  return id
}

app.use(express.json())

var stats = {
  requestsMade: 0
}

app.use((req, res, next) => {
  if (db == null) {
    return res.status(400).send(`Easybox hasn't fully loaded yet.`)
  }

  if (logging) {
    console.log(chalk.green(`[${new Date().getTime()}] ${req.method} request to ${req.path}`))
  }

  stats.requestsMade++
  next()
})

app.get('/', (req, res) => {
  res.end('hellllllllllllo.')
})

app.get('/ping', (req, res) => {
  res.end('pong!')
})

app.get('/status', (req, res)=>{
  res.json(stats)
})

/* Generate a new box */

app.post('/new', async (req, res) => {
  var hash = await generateHash()

  var requiresAuth = false
  var auth = null

  if(req.body.requiresAuth){
    requiresAuth = true  
    auth = await generateHash(`authorization-${new Date().getTime().toString()}${process.env.HASH_KEY}`)
  }

  await db.collection('boxes').insertOne({
    boxID: hash,
    hidden: false,
    data: {},
    requiresAuth: requiresAuth,
    auth: auth
  })

  res.status(200).json({
    ok: true,
    boxID: hash,
    boxURL: `https://${req.headers['host']}/box/${hash}`,
    createdAt: new Date().getTime(),
    auth: auth
  })
})

/* Generate a new database that is copied from another one on jsonbox */

app.post('/copy/:id', async (req, res) => {
  var hash = await generateHash()

  var b = await fetch(`https://jsonbox.io/box_${req.params.id}`, {
    method: `GET`,
    headers: {
      'User-Agent': 'easybox'
    }
  }).catch((err) => {
    console.error(err)

    return res.status(500).send(`Unknown server error`)
  })

  var j = await b.json().catch((err) => {
    console.error(err)
    
    return res.status(500).send(`Unknown error when trying to parse JSON`)
  })

  var data = {}

  await Promise.all(j.map(async (a, index) => {
    if (!data[a['_collection']]) {
      data[a['_collection']] = []
    }

    var collectionName = a['_collection']

    delete a['_createdOn']
    delete a['_id']
    delete a['_updatedOn']
    delete a['_collection']

    a['_id'] = await generateID()
    data[collectionName].push(a)
  }))

  await db.collection('boxes').insertOne({
    boxID: hash,
    hidden: false,
    data: data
  })

  res.status(200).json({
    ok: true,
    boxID: hash,
    boxURL: `https://${req.headers['host']}/box/${hash}`,
    createdAt: new Date().getTime()
  })
})

app.get('/box/:id', async (req, res) => {
  var box = await db.collection('boxes').find({ boxID: req.params.id }).toArray()

  if (!box[0] || box[0].hidden) {
    return res.status(404).json({
      ok: false,
      message: `Box not found.`
    })
  }

  if(box[0].requiresAuth){
    var authorization = req.headers['authorization']

    if(authorization != box[0].auth){
      return res.status(403).json({
        ok: false,
        message: 'This box is protected. Please put your AUTH key in the Authorization header.'
      })
    }
  }

  res.json(box[0].data)
})

app.get('/box/:id/:collection_name', async (req, res) => {
  var box = await db.collection('boxes').find({ boxID: req.params.id }).toArray()

  if (!box[0] || box[0].hidden) {
    return res.status(404).json({
      ok: false,
      message: `Box not found.`
    })
  }

  if(box[0].requiresAuth){
    var authorization = req.headers['authorization']

    if(authorization != box[0].auth){
      return res.status(403).json({
        ok: false,
        message: 'This box is protected. Please put your AUTH key in the Authorization header.'
      })
    }
  }

  res.json(box[0].data[req.params['collection_name']] || [])
})

app.post('/box/:id/:collection_name', async (req, res) => {
  var box = await db.collection('boxes').find({ boxID: req.params.id }).toArray()

  if (!box[0] || box[0].hidden) {
    return res.status(404).json({
      ok: false,
      message: `Box not found.`
    })
  }

  if(box[0].requiresAuth){
    var authorization = req.headers['authorization']

    if(authorization != box[0].auth){
      return res.status(403).json({
        ok: false,
        message: 'This box is protected. Please put your AUTH key in the Authorization header.'
      })
    }
  }

  if (Object.keys(req.body).length == 0) {
    return res.status(400).json({
      ok: false,
      message: `You sent empty data.`
    })
  }

  var data = req.body

  data['_id'] = await generateID()
  box = box[0]

  if (!box.data[req.params['collection_name']]) {
    box.data[req.params['collection_name']] = []
  }

  box.data[req.params['collection_name']].push(data)

  await db.collection('boxes').updateOne({ boxID: req.params.id }, { $set: box })

  res.status(200).json(data)
})

app.delete('/box/:id/:collection_name', async (req, res) => {
  var box = await db.collection('boxes').find({ boxID: req.params.id }).toArray()

  if (!box[0] || box[0].hidden) {
    return res.status(404).json({
      ok: false,
      message: `Box not found.`
    })
  }

  if(box[0].requiresAuth){
    var authorization = req.headers['authorization']

    if(authorization != box[0].auth){
      return res.status(403).json({
        ok: false,
        message: 'This box is protected. Please put your AUTH key in the Authorization header.'
      })
    }
  }

  box[0].data[req.params['collection_name']] = []

  await db.collection('boxes').updateOne({ boxID: req.params.id }, { $set: box[0] })

  res.status(204).end('')
})

app.delete('/box/:id/:collection_name/:document_id', async (req, res) => {
  var box = await db.collection('boxes').find({ boxID: req.params.id }).toArray()

  if (!box[0] || box[0].hidden) {
    return res.status(404).json({
      ok: false,
      message: `Box not found.`
    })
  }

  if(box[0].requiresAuth){
    var authorization = req.headers['authorization']

    if(authorization != box[0].auth){
      return res.status(403).json({
        ok: false,
        message: 'This box is protected. Please put your AUTH key in the Authorization header.'
      })
    }
  }

  var c = box[0].data[req.params['collection_name']]

  if (!c) {
    return res.status(404).json({
      ok: false,
      message: 'Document not found.'
    })
  }

  await Promise.all(c.map(async (e, index) => {
    if (e['_id'].toString() == req.params['document_id'].toString()) {
      c.splice(index, 1)
    }
  }))

  box[0].data[req.params['collection_name']] = c

  await db.collection('boxes').updateOne({ boxID: req.params.id }, { $set: box[0] })

  res.status(204).end('')
})

app.put('/box/:id/:collection_name/:document_id', async (req, res) => {
  var box = await db.collection('boxes').find({ boxID: req.params.id }).toArray()

  if (!box[0] || box[0].hidden) {
    return res.status(404).json({
      ok: false,
      message: `Box not found.`
    })
  }

  if(box[0].requiresAuth){
    var authorization = req.headers['authorization']

    if(authorization != box[0].auth){
      return res.status(403).json({
        ok: false,
        message: 'This box is protected. Please put your AUTH key in the Authorization header.'
      })
    }
  }

  var c = box[0].data[req.params['collection_name']]

  if (!c) {
    return res.status(404).json({
      ok: false,
      message: 'Document not found.'
    })
  }

  if (Object.keys(req.body).length == 0) {
    return res.status(400).json({
      ok: false,
      message: `You sent empty data.`
    })
  }

  await Promise.all(c.map(async (e, index) => {
    if (e['_id'].toString() == req.params['document_id'].toString()) {
      Object.keys(req.body).forEach((x) => {
        c[index][x] = req.body[x]
      })
    }
  }))

  box[0].data[req.params['collection_name']] = c

  await db.collection('boxes').updateOne({ boxID: req.params.id }, { $set: box[0] })

  res.status(200).json(req.body)
})


app.listen(port, async () => {
  console.log(`App started on port ${port}`)

  db = await database.connectDatabase()

})