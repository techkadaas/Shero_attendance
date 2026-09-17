import { connectMongo, attendances } from './src/mongo';
import { getTodayRange } from './src/utils/time';

(async () => {
  await connectMongo();
  const { start, end } = getTodayRange();
  console.log('Start:', start, 'End:', end);
  const a = await attendances().find({ date: { $gte: start, $lte: end } }).toArray();
  console.log('Found:', a.length);
  process.exit(0);
})();
