const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const Session = require('../models/Session');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  const user = await User.findOne({ username: 'admin' });
  if (!user) {
    console.log('No admin user found');
  } else {
    user.password = 'Admin@1234';        // hashed automatically on save
    user.mustChangePassword = false;
    user.twoFactorEnabled = false;      // turn off 2FA so you can log in
    user.twoFactorSecret = null;
    await user.save();
    await Session.deleteMany({ userId: user._id }); // clear old sessions
    console.log('Admin reset done. Login: admin / Admin@1234');
  }
  await mongoose.disconnect();
})();