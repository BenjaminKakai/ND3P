const bcrypt = require('bcrypt');
const password = 'co37x74bob';
bcrypt.hash(password, 10, (err, hash) => {
    console.log(hash);
});

