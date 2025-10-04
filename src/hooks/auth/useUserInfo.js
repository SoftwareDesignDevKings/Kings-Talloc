import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { db } from "@/firestore/db";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

export function useUserRole() {
	const { data: session, status } = useSession();
	const [userRole, setUserRole] = useState(null);
	const [loading, setLoading] = useState(true);

	const ensureUserDoc = async (user) => {
		if (!user) return;

		const userRef = doc(db, "users", user.email);
		const userDoc = await getDoc(userRef);

		// set default role as student, on NextAuth callback. else, retrieve the store role in React state
		if (!userDoc.exists()) {
			await setDoc(userRef, {email: user.email, name: user.name, role: "student"});
			setUserRole("student");
		} else {
			const data = userDoc.data();
			setUserRole(data.role);
			if (!data.name) {
				await updateDoc(userRef, { name: user.name });
			}
		}
	};

	useEffect(() => {
		if (status === "authenticated" && session?.user) {
			ensureUserDoc(session.user).then(() => setLoading(false));
		} else if (status === "unauthenticated") {
			setLoading(false);
		}
	}, [status, session]);

	return { status, session, loading, userRole };
}
