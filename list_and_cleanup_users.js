import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, deleteDoc, doc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAWwN07xYK_4IWkApwp0zhBKymBvA0zoY8",
  authDomain: "dsa-arena.firebaseapp.com",
  projectId: "dsa-arena",
  storageBucket: "dsa-arena.firebasestorage.app",
  messagingSenderId: "910535993522",
  appId: "1:910535993522:web:b25102c2ce99659a5d41ab",
  measurementId: "G-1XDTFXVQK9"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function main() {
  const args = process.argv.slice(2);
  const action = args[0];

  if (action === 'delete') {
    const targetUid = args[1];
    if (!targetUid) {
      console.log("Please specify a UID to delete: node list_and_cleanup_users.js delete <UID>");
      process.exit(1);
    }
    console.log(`Deleting user document with UID: ${targetUid}...`);
    await deleteDoc(doc(db, "users", targetUid));
    console.log("Deleted successfully.");
    process.exit(0);
  }

  console.log("Fetching users from Firestore...");
  const snapshot = await getDocs(collection(db, "users"));
  const users = [];
  snapshot.forEach((doc) => {
    users.push({ id: doc.id, ...doc.data() });
  });

  console.log("\nRegistered Users in Firestore:");
  users.forEach((u, index) => {
    console.log(`[${index}] Name: ${u.displayName}, Email: ${u.email}, Username: ${u.username}, UID: ${u.uid}`);
  });
  
  console.log("\nTo delete a user, run:");
  console.log("node list_and_cleanup_users.js delete <UID>");
  
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
