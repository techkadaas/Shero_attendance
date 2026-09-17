import http from 'http';

http.get('http://localhost:5000/api/admin/dashboard', { headers: { 'Authorization': 'Bearer (ignore)' } }, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('Dashboard:', data);
  });
}).on('error', (err) => {
  console.log('Error: ' + err.message);
});

http.get('http://localhost:5000/api/admin/attendance?date=2026-08-27', { headers: { 'Authorization': 'Bearer (ignore)' } }, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('Attendance:', data);
  });
}).on('error', (err) => {
  console.log('Error: ' + err.message);
});
