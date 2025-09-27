import { on } from "events";
import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, getDocs, getDoc } from 'firebase/firestore';
const firebaseConfig = {
  apiKey: "AIzaSyCYWOCECo-jpjhoxatvOKs1-aTKdUQtqKk",
  authDomain: "my-project-1516289182804.firebaseapp.com",
  databaseURL: "https://my-project-1516289182804-default-rtdb.firebaseio.com",
  projectId: "my-project-1516289182804",
  storageBucket: "my-project-1516289182804.firebasestorage.app",
  messagingSenderId: "325565181502",
  appId: "1:325565181502:web:57de84000c8ebbd5276b6f",
  measurementId: "G-H0644Q6XYW"
};
const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
const posts = collection(db, "posts");
const comments = collection(db, "comments");
const users = collection(db, "users");
const snapshot = await getDocs(posts);
snapshot.forEach((doc) => {
  console.log(doc.id, "=>", doc.data());
});

auth.onAuthStateChanged(user => {
  if (user) {
    console.log('User is signed in:', user);
  } else {
    console.log('No user is signed in.');
  }
});

onAuthStateChanged(auth, (user) => {
  if (user) {
    const uid = user.uid;
    console.log("User is signed in with uid:", uid);
  } else {
    console.log("No user is signed in.");
  }
});

export default function Home() {
  return (
    <div
      className='flex min-h-screen flex-col items-center justify-center py-2'>
         Hello World``
    </div>
  );
}
