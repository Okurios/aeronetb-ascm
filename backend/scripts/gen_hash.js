const bcrypt = require('bcrypt');
const password = 'Password1!';
bcrypt.hash(password, 10).then(hash => {
  console.log('Password:', password);
  console.log('Hash:', hash);
  // verify
  bcrypt.compare(password, hash).then(v => console.log('Verify:', v));
});
