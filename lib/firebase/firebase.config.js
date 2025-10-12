const { initializeApp } = require('firebase-admin/app');
// import { initializeApp } from 'firebase-admin/app';
const app = initializeApp();
export const { getAuth } = require('firebase-admin/auth');

var admin = require('firebase-admin');

var serviceAccount = require('path/to/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
