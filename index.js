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
const joiningCollection = db.collection("joining");
const userCollection = db.collection("user");

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

// http://localhost:8000/my-events/:userId
app.get('/my-events/:userId', async (req, res) => {
  const { userId } = req.params;

  const result = await eventCollection
    .find({ createdBy: userId })
    .sort({ eventDate: 1 })
    .toArray();

  res.send(result);
});

// http://localhost:8000/user/:userId
app.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const conditions = [
      { id: userId },
      { _id: userId }
    ];

    // Better Auth user ID যদি MongoDB ObjectId হয়
    if (ObjectId.isValid(userId)) {
      conditions.push({ _id: new ObjectId(userId) });
    }

    const user = await userCollection.findOne(
      { $or: conditions },
      {
        projection: {
          name: 1,
          email: 1,
          image: 1
        }
      }
    );

    if (!user) {
      return res.status(404).send({ message: 'Organizer not found' });
    }

    res.send(user);

  } catch (error) {
    console.error(error);
    res.status(500).send({ message: 'Server error' });
  }
});



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

//http://localhost:8000/joining
app.post('/joining', async (req, res) => {
  const data = req.body;
  const result = await joiningCollection.insertOne(data);
  res.send(result);
})

//http://localhost:8000/my-joining/:email
app.get('/my-joining/:email', async (req, res) => {
  const {email} = req.params
  const result = await joiningCollection.find({email: email}).toArray()
  res.send(result);
})

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});