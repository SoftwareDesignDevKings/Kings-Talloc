"use client"

import { useAuthSession } from '@/hooks/useAuthSession';
import Sidebar from '@/components/Sidebar.jsx';
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";

import { useState, useEffect } from 'react';

const AuthLayout = ({ children }) => {
    const { session } = useAuthSession();

    const router = useRouter();

    const pathname = usePathname();
    
    // Public routes (no sidebar, no auth)
    const publicRoutes = ["/", "/login"];

    // const[redirectEndpoint, setRedirectEndpoint] = useState("")

    // useEffect(() => {
    //     if (redirectEndpoint) {
    //         router.push(redirectEndpoint);
    //     }
    // }, [redirectEndpoint]);

    // No session OR on public routes → render page directly
    if (!session || publicRoutes.includes(pathname)) {
        return children;
    }

    

    // All authenticated pages get the sidebar layout
    return (
        <div className="d-flex vh-100">
            <Sidebar user={session.user} userRole={session.user.role} />

            <div className="flex-grow-1 overflow-auto">
                {children}
            </div>
        </div>
    );
}

export default AuthLayout