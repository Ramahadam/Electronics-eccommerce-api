const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.cert(
    require('../lib/firebase/firebase-service-account.json')
  ),
});

const auth = admin.auth();

async function deleteAllUsers(nextPageToken) {
  const listUsersResult = await auth.listUsers(1000, nextPageToken);

  const uids = listUsersResult.users.map((user) => user.uid);

  if (uids.length > 0) {
    await auth.deleteUsers(uids);
    console.log(`Deleted ${uids.length} users`);
  }

  if (listUsersResult.pageToken) {
    await deleteAllUsers(listUsersResult.pageToken);
  }
}
fafas;

deleteAllUsers()
  .then(() => console.log('✅ All users deleted'))
  .catch(console.error);

// To run : node scripts/deleteAllFirebaseUsers.js
