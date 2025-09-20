const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const { Queue } = require('bullmq');
const { createClient } = require('redis');
const { PORT, MONGODB_URI, REDIS_URL } = require('./config');

const generateRouter = require('./routes/generate');
const whatsappRouter = require('./routes/whatsappWebhook');
const linkedinRouter = require('./routes/linkedinAuth');
const adminRouter = require('./routes/admin');
const { startApprovalWorker } = require('./workers/approvalWorker');
const { scheduleDailyJob } = require('./scheduler/dailyScheduler');

async function start() {
  if (!MONGODB_URI) throw new Error('MONGODB_URI missing');
  await mongoose.connect(MONGODB_URI);
  console.log('MongoDB connected');

  const redis = createClient({ url: REDIS_URL });
  await redis.connect();
  new Queue('approvalQueue', { connection: redis });
  console.log('QueueScheduler ready');

  await startApprovalWorker();
  scheduleDailyJob();

  const app = express();
  app.use(bodyParser.json());
  app.use(express.static('public'));

  app.use('/generate', generateRouter);
  app.use('/whatsapp', whatsappRouter);
  app.use('/linkedin', linkedinRouter);
  app.use('/admin', adminRouter);

  app.get('/', (req, res) => res.sendFile(require('path').join(__dirname, '..', 'public', 'index.html')));
  app.use('/healthcheck', require('express-healthcheck')({
    healthy: function () {
        return { everything: 'is ok' };
    }
}))

  app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
}

start().catch(err => { console.error(err); process.exit(1); });