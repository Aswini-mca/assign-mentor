import express from "express";
import { MongoClient } from "mongodb"
import cors from "cors"
import 'dotenv/config'
const app = express()
const PORT = 9000

app.use(express.json()) //Inbuilt middleware => to say data is in JSON
app.use(cors())

//mongoDB connection

const MONGO_URL = process.env.MONGO_URL
// "mongodb://127.0.0.1:27017"


async function createConnection() {
  const client = new MongoClient(MONGO_URL)
  await client.connect()
  console.log("Mongodb is connected")
  return client;
}

const client = await createConnection()

app.get('/', (req, res) => {
  res.send('Mentor and Student Assigning with Database')
});

//API to create student
app.post('/create/student', async (req, res) => {
  const student = req.body;
  console.log(student);
  const result = await client.db('FSD').collection('student').insertOne(student);
  res.send(result)

});

//API to get students
app.get('/students', async (req, res) => {
  const students = await client.db('FSD').collection('student').find().toArray();
  res.send(students)
});

//API to create mentor
app.post('/create/mentor', async (req, res) => {
  const mentor = req.body;
  console.log(mentor);
  const result = await client.db('FSD').collection('mentor').insertOne(mentor);
  res.send(result)

});

//API to get mentors
app.get('/mentors', async (req, res) => {
  const mentors = await client.db('FSD').collection('mentor').find().toArray();
  res.send(mentors)
});

// API to assign a student to a mentor
app.post('/assign/:studentId/:mentorId', async (req, res) => {
  const { studentId, mentorId } = req.params;
  const studentCollection = client.db('FSD').collection('student')
  const mentorCollection = client.db('FSD').collection('mentor')
  try {
    await studentCollection.updateOne({ studentId: studentId }, { $set: { mentorId } });
    await mentorCollection.updateOne({ mentorId: mentorId }, { $push: { students: studentId } });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//Select one mentor and Add multiple Student 
app.post('/one-mentor-add-multiple-students', async (req, res) => {
  const { mentorId, studentIds } = req.body;
  try {
    const mentor = await client.db('FSD').collection('mentor').findOne({ mentorId: mentorId });
    if (!mentor) {
      return res.status(404).json({ message: 'Mentor not found' });
    }

    const studentsToAssign = await client.db('FSD').collection('student').find({ studentId: { $in: studentIds }, mentorId: null }).toArray();

    if (studentsToAssign.length !== studentIds.length) {
      return res.status(400).json({ message: 'One or more students are already assigned to a mentor' });
    }

    await client.db('FSD').collection('student').updateMany(
      { studentId: { $in: studentIds } },
      { $set: { mentorId: mentorId } }
    );

    return res.json({ message: 'Mentor and students assigned successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Get a list of students without mentors
app.get('/students_without_mentor', async (req, res) => {
  try {
    const studentsWithoutMentor = await client.db('FSD').collection('student').find({ mentorId: null }).toArray();
    return res.json(studentsWithoutMentor);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Assign or change mentor for a particular student
app.post('/assign_mentor_to_student', async (req, res) => {
  const { studentId, mentorId } = req.body;

  try {
    const student = await client.db('FSD').collection('student').findOne({ studentId: studentId });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const mentor = await client.db('FSD').collection('mentor').findOne({ mentorId: mentorId });
    if (!mentor) {
      return res.status(404).json({ message: 'Mentor not found' });
    }

    await client.db('FSD').collection('student').updateOne({ studentId: studentId }, { $set: { mentorId: mentorId } });

    return res.json({ message: 'Mentor assigned to student successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Endpoint to get all students for a particular mentor
app.get('/students_for_mentor/:mentorId', async (req, res) => {
  const mentorId = req.params.mentorId;

  try {
    const mentor = await client.db('FSD').collection('mentor').findOne({ mentorId: mentorId });
    if (!mentor) {
      return res.status(404).json({ message: 'Mentor not found' });
    }

    const students = await client.db('FSD').collection('student').find({ mentorId: mentorId }).toArray();

    return res.json(students);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Endpoint to get the previously assigned mentor for a particular student
app.get('/previous_mentor_for_student/:studentId', async (req, res) => {
  const studentId = req.params.studentId;

  try {
    const student = await client.db('FSD').collection('student').findOne({ studentId: studentId });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    if (!student.mentorId) {
      return res.json({ message: 'Student does not have a previous mentor' });
    }

    const previousMentor = await client.db('FSD').collection('mentor').findOne({ mentorId: student.mentorId });

    return res.json(previousMentor);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});



app.listen(PORT, () => console.log("The server started on the port", PORT));