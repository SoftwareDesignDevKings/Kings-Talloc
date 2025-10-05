import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { signInWithCustomToken, signOut } from "firebase/auth";
import { auth } from "@/firestore/clientFirestore";

/**
 * Hook to get user role from NextAuth session
 * Role is set server-side in NextAuth signIn callback - no client-side DB calls needed
 */
export const useAuthSession = () => {
	const { data: session, status } = useSession();
	const [loading, setLoading] = useState(true);
	const [userRole, setUserRole] = useState("student")

	useEffect(() => {
		const syncFirebaseAuth = async () => {
			try {
				if (status === "authenticated") {
					setLoading(false);
					setUserRole(session.user.role)
					await signInWithCustomToken(auth, session.user.firebaseToken);
				} 

				if (status === "unauthenticated") {
					await signOut(auth).catch(() => {});
					setLoading(false);
				}
			} catch (err) {
				console.log("Error in syncing firebase auth: ", err)
			}
		}

		syncFirebaseAuth()
	}, [status, session]);

	return { status, session, loading, userRole };
}
