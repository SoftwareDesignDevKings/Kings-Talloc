"use client"

import Sidebar from "@/components/Sidebar";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

const AuthorisedAppLayout = ({ children }) => {
    const { session, userRole } = useAuthSession();
    const [redirectEndpoint, setRedirectEndpoint] = useState("");
    const router = useRouter();

    useEffect(() => {
        if (redirectEndpoint) {
            router.push(redirectEndpoint);
        }
    }, [redirectEndpoint, router]);

    return (
        <div className="d-flex vh-100 bg-light">
            <Sidebar
                setRedirectEndpoint={setRedirectEndpoint}
                userRole={userRole}
                user={session.user}
            />
            <div className="flex-grow-1 overflow-auto">
                {children}
            </div>
        </div>
    )
}

export default AuthorisedAppLayout