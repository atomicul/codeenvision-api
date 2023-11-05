import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client'
import fs from 'fs';
import https from 'https';
import crypto from 'crypto';
const prisma = new PrismaClient()
const app = express();
const port = 3000;

app.use(express.json())
app.use(cors())

const key = fs.readFileSync(__dirname + '/selfsigned.key');
const cert = fs.readFileSync(__dirname + '/selfsigned.crt');

app.use(async (req, res, next) => {
  if (req.path === '/auth' || req.path === '/reading')
    return next();
  try {
    let token = req.headers["authorization"]
    if (!token)
      return res.status(401).json({ msg: 'no token' });
    token = token.split(" ")[1];

    const dbToken = await prisma.token.findUnique({
      where: {
        id: token
      }
    })
    if (!dbToken)
      return res.status(401).json({ msg: 'invalid token' });
    if (dbToken.expire.getTime() < Date.now())
      return res.status(401).json({ msg: 'token expired' });

    await prisma.token.update({
      where: {
        id: token
      },
      data: {
        expire: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7)
      }
    })
    next()
  } catch (e) {
    console.error(e)
    return res.status(500).end();
  }
})

app.post('/auth', async (req, res) => {
  const { user, pass } = req.body;
  if (user !== process.env.USER || pass !== process.env.PASS) {
    return res.status(401).json({ msg: 'bad credentials' });
  }
  require('crypto').randomBytes(128, async function(_: any, buf: any) {
    const token: string = buf.toString('base64');
    try {
      await prisma.token.create({
        data: {
          id: token,
          expire: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7)
        }
      })
      return res.status(200).json({ token });
    } catch (e) {
      console.error(e);
      return res.status(500).end();
    }
  });

});

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
