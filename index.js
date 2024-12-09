const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const bodyParser = require('body-parser')
const { MongoClient, ObjectId } = require('mongodb')
const { parse } = require('dotenv')

const client = new MongoClient(process.env.MONGO_URI)
const db = client.db('ExerciseTracker')
const users = db.collection('users')
const exercise = db.collection('exercise')

app.use(cors())
app.use(express.json())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post('/api/users', async (req, res) => {
  const userName = req.body.username

  if (userName) {
    await users.insertOne({ username: userName })
    users.findOne({ username: userName }).then(result => {
      res.json({
        _id: result._id,
        username: result.username
      })
    }).catch(error => {
      res.json({
        error
      })
    })
  } else {
    res.json({
      error: 'Invalid Username'
    })
  }
})

app.get('/api/users', async (req, res) => {
  try {
    const result = await users.find({}).toArray() // 使用 toArray() 將游標轉為陣列
    res.json(result)
  } catch (error) {
    res.json({ error })
  }
})

app.post('/api/users/:_id/exercises', async (req, res) => {
  const id = req.params._id
  const { description, duration, date } = req.body

  try {
    const user = await users.findOne({ _id: new ObjectId(id) })

    if (!user) return res.json({ error: 'User not found' })
      
    const body = {
      description: description,
      duration: parseInt(duration, 10),
      date: date ? new Date(date) : new Date()
    }
    await exercise.insertOne({
      user_id: id,
      ...body
    });

    res.json({
      _id: id,
      username: user.username,
      ...body,
      date: new Date(date).toDateString()
    })
  } catch (err) {
    res.json({
      error: err
    })
  }
})

app.get('/api/users/:_id/logs', async (req, res) => {
  const id = req.params._id
  const { from, to, limit } = req.query

  try {
    const user = await users.findOne({ _id: new ObjectId(id) })

    if (!user) {
      return res.json({ error: 'Could not find user' })
    }

    let dateFilter = {}
    if (from) dateFilter['$gte'] = new Date(from)
    if (to) dateFilter['$lte'] = new Date(to)

    let filter = { user_id: id }
    if(from || to) filter.date = dateFilter

    const exercises = await exercise.find(filter).limit(Number(limit) || 0).toArray()
    const log = exercises.map(e => ({
      description: e.description,
      duration: e.duration,
      date: new Date(e.date).toDateString()
    }))

    res.json({
      username: user.username,
      count: exercises.length,
      _id: user._id,
      log
    })
  } catch (err) {
    res.json({
      error: err
    })
  }
})


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
