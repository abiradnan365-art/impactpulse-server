import express from 'express';
import { MongoClient, ObjectId } from 'mongodb';
import 'dotenv/config'
import cors from 'cors';
const app = express();
const PORT = 8000

app.use(cors());
app.use(express.json());


const client = new MongoClient(process.env.MONGODB_URI);

export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
  }
}

const mongoClient = await connectToMongoDB();
const db = mongoClient.db("impactpulse");
const eventCollection = db.collection("event");

//http://localhost:8000/create-event
app.post('/create-event', async (req, res) => {
  const data = req.body;

  const result =  await eventCollection.insertOne(data);
  console.log(result);

  res.send({result});
})

//http://localhost:8000/events
app.get('/events', async (req, res) => {
  const result = await eventCollection.find({}).toArray();
  res.send(result);
})

//http://localhost:8000/event/id
app.get('/event/:id', async (req, res) => {
  const {id} = req.params;
  const result = await eventCollection.findOne({_id: new ObjectId(id)});

  res.send(result);
})

//http://localhost:8000

app.get('/', (req, res) => {
    res.send({message: 'Server is running fine!'})
})

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});