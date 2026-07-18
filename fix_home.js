const fs = require('fs');
let file = fs.readFileSync('client/src/pages/Home.jsx', 'utf8');

// The current logic:
// const isProfileIncomplete = data ? (
//    (data.role === 'provider' && (!data.category || !data.experience || !data.charges || !data.sandboxBankAccount?.accountNumber)) ||
//    (data.role === 'user' && !data.cnic)
//  ) : false;

// I will make it more explicit.
