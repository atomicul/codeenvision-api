import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client'
import fs from 'fs';
import https from 'https';
const prisma = new PrismaClient()
const app = express();
const port = 3000;

app.use(express.json())
app.use(cors())

const key = fs.readFileSync(__dirname + '/selfsigned.key');
const cert = fs.readFileSync(__dirname + '/selfsigned.crt');

app.get('/sensors', async (req, res) => {
  try {
    const sensors = await prisma.sensor.findMany();
    res.status(200).json(sensors);
  } catch (e) {
    console.error(e);
    res.status(500).end();
  }
})

app.post('/reading', async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  try {
    await prisma.reading.create({
      data: {
        sensorId: req.body.id,
        temperature: req.body.temperature,
        humidity: req.body.humidity,
        ppm: req.body.ppm,
        day: today,
        dustConcentration: req.body.dustConcentration,
      }
    })
    res.status(200).end();
  } catch (e) {
    console.error(e)
    res.status(500).end();
  }
});

app.post('/readings', async (req, res) => {
  const id = req.body.id;
  if (typeof id !== 'string') {
    console.log(id)
    return res.status(400).json({ msg: 'bad id' });
  }
  try {
    const data = await prisma.$queryRaw`SELECT AVG(temperature) as temperature, AVG(humidity) as humidity, 
                                               AVG(ppm) as ppm,
                                               AVG(dust_concentration) as dustConcentraction,
                                               day
                                        FROM readings
                                        WHERE sensor_id = ${id}
                                        GROUP BY day`;
    res.json(data)
  } catch (e) {
    console.error(e)
    res.status(500).end();
  }

});

const server = https.createServer({ key: key, cert: cert }, app);
server.listen(port, () => {
  console.log(`⚡️[server]: Server is running at https://localhost:${port}`);
});
