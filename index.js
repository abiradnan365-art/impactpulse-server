import express from 'express';
import { MongoClient, ObjectId } from 'mongodb';
import 'dotenv/config'
import cors from 'cors';
import { createRemoteJWKSet, jwtVerify } from 'jose';
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
    console.error("MongoDB connection failed:", err);
    throw err;
  }
}

const mongoClient = await connectToMongoDB();
const db = mongoClient.db("impactpulse");
const eventCollection = db.collection("event");
const joiningCollection = db.collection("joining");
const userCollection = db.collection("user");

const verifyToken = async (req, res, next) =>{
    const authHeader = req.headers.authorization;
    if(!authHeader){
        return res.status(401).send({msg: 'Unauthorized!'})
    }
    const token = authHeader.split(" ")[1];
    if(!token){
      return res.status(401).send({msg: 'Unauthorized!'})
    }

    const JWKS = createRemoteJWKSet(new URL("http://localhost:3000/api/auth/jwks"));
   
    try {
       const {payload} = await jwtVerify(token, JWKS)
       next();
    }
    catch (error) {
      return res.status(401).send({msg: 'Server Error!'});
    }


  // console.log(token);
 

}

//http://localhost:8000/create-event
app.post('/create-event',
  verifyToken,
  async (req, res) => {
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


// Update Event
// PATCH http://localhost:8000/update-event/:id

app.patch("/update-event/:id",
  verifyToken,
  async (req, res) => {
    try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
            return res.status(400).send({
                message: "Invalid event ID",
            });
        }

        const updatedData = {
            $set: {
                title: req.body.title,
                eventType: req.body.eventType,
                eventDate: req.body.eventDate,
                location: req.body.location,
                imageUrl: req.body.imageUrl,
                description: req.body.description,
            },
        };

        const result = await eventCollection.updateOne(
            { _id: new ObjectId(id) },
            updatedData
        );

        if (result.matchedCount === 0) {
            return res.status(404).send({
                message: "Event not found",
            });
        }

        res.send({
            success: true,
            message: "Event updated successfully",
        });

    } catch (error) {
        console.error("Update event error:", error);

        res.status(500).send({
            message: "Failed to update event",
        });
    }
});

//http://localhost:8000/event/id
app.delete("/event/:id",
  verifyToken,
  async (req, res) => {
  const { id } = req.params;
  const result = await eventCollection.deleteOne({ _id: new ObjectId(id) });
  res.send(result);
})

//http://localhost:8000/event/id
app.get('/event/:id', 
  
  verifyToken,
  async (req, res) => {


  const {id} = req.params;
  const result = await eventCollection.findOne({_id: new ObjectId(id)});

  res.send(result);
})

//http://localhost:8000/recent-upcoming-events
app.get('/recent-upcoming-events', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const result = await eventCollection
      .find({
        eventDate: { $gte: today }
      })
      .sort({ eventDate: 1 })
      .limit(6)
      .toArray();

    res.send(result);
  } catch (error) {
    console.error(error);
    res.status(500).send({
      message: 'Failed to fetch upcoming events'
    });
  }
});


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