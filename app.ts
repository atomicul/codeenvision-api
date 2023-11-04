import express, { json } from 'express';
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
const app = express();
const port = 3000;

app.use(express.json())

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
    console.log(
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
    )
    res.status(200).end();
  } catch (e) {
    console.error(e)
    res.status(500).end();
  }
});

app.post('/readings', async (req, res) => {
  const { id } = req.body;
  if (typeof id !== 'string') {
    return res.status(400).end();
  }
  try {
    const data = await prisma.$queryRaw`SELECT AVG(temperature) as temperature, AVG(humidity) as humidity, 
                                               AVG(ppm) as ppm,
                                               AVG(dust_concentration) as dustConcentraction,
                                               day
                                        FROM readings
                                        WHERE sensor_id = ${id}
                                        GROUP BY day`;
    console.log(JSON.stringify(data));
    res.json(data)
  } catch (e) {
    console.error(e)
    res.status(500).end();
  }

});

app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});
