import { connectMongo, attendances } from './src/mongo';

(async () => {
  await connectMongo();
  const date = '2026-08-27';
  let start: Date, end: Date;
  const targetDate = new Date(date);
  start = new Date(targetDate.setHours(0, 0, 0, 0));
  end = new Date(targetDate.setHours(23, 59, 59, 999));
  
  console.log('Start:', start, 'End:', end);
  const a = await attendances().find({ date: { $gte: start, $lte: end } }).toArray();
  console.log('Found:', a.length);
  process.exit(0);
})();
