"use client";

import { useState, useEffect } from "react";
import { UploadCloud, Plus } from "lucide-react";
import { db, storage } from "@/lib/firebase";
import {
  collection,
  addDoc,
  Timestamp,
  getDocs,
  query,
  orderBy,
  where,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Button } from "@/components/ui/button";
import { getAuth, onAuthStateChanged } from "firebase/auth";

export default function BillsPage() {
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [newBill, setNewBill] = useState({
    title: "",
    hospital: "",
    amount: "",
    date: "",
    file: null as File | null,
  });
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
        const billsRef = collection(db, "bills");
        const q = query(
          billsRef,
          where("uid", "==", user.uid),
          orderBy("timestamp", "desc")
        );
        const querySnapshot = await getDocs(q);
        const billList = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setBills(billList);
      } else {
        setUserId(null);
        setBills([]);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewBill((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setNewBill((prev) => ({ ...prev, file }));
  };

  const handleAddBill = async () => {
    if (!userId) return;

    const { title, hospital, amount, date, file } = newBill;
    if (!title || !amount || !file) return;
    setLoading(true);

    try {
      const fileRef = ref(storage, `bills/${Date.now()}-${file.name}`);
      await uploadBytes(fileRef, file);
      const fileURL = await getDownloadURL(fileRef);

      const billData = {
        title,
        hospital,
        amount,
        date,
        fileURL,
        timestamp: Timestamp.now(),
        uid: userId,
      };

      const docRef = await addDoc(collection(db, "bills"), billData);
      setBills((prev) => [{ id: docRef.id, ...billData }, ...prev]);
      setNewBill({
        title: "",
        hospital: "",
        amount: "",
        date: "",
        file: null,
      });
    } catch (err) {
      console.error("Error adding bill:", err);
    }

    setLoading(false);
  };

  return (
    <main className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Medical Bills</h1>

      <div className="grid grid-cols-1 gap-4 mb-6">
        <input
          name="title"
          value={newBill.title}
          onChange={handleInputChange}
          placeholder="Bill Title"
          className="p-3 border rounded-md"
        />
        <input
          name="hospital"
          value={newBill.hospital}
          onChange={handleInputChange}
          placeholder="Hospital / Clinic"
          className="p-3 border rounded-md"
        />
        <input
          name="amount"
          value={newBill.amount}
          onChange={handleInputChange}
          placeholder="Amount"
          type="number"
          className="p-3 border rounded-md"
        />
        <input
          name="date"
          value={newBill.date}
          onChange={handleInputChange}
          type="date"
          className="p-3 border rounded-md"
        />

        <label className="flex items-center gap-3 cursor-pointer text-blue-600">
          <UploadCloud /> Upload File
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={handleFileChange}
            className="hidden"
          />
          {newBill.file && <span className="text-sm">{newBill.file.name}</span>}
        </label>

        <Button onClick={handleAddBill} disabled={loading || !userId} className="w-full">
          {loading ? "Uploading..." : <><Plus className="mr-2" /> Add Bill</>}
        </Button>
      </div>

      <div className="space-y-4">
        {bills.map((bill) => (
          <div key={bill.id} className="border rounded-md p-4 shadow-sm">
            <div className="flex justify-between">
              <h2 className="font-semibold text-lg">{bill.title}</h2>
              <p className="text-green-600 font-semibold">₹{bill.amount}</p>
            </div>
            <p className="text-sm text-gray-600">
              {bill.hospital} • {bill.date}
            </p>
            <a
              href={bill.fileURL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 text-sm underline mt-2 inline-block"
            >
              View Bill
            </a>
          </div>
        ))}
      </div>
    </main>
  );
}
