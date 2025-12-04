"use client"

import CalendarWrapper from "@/components/CalendarWrapper"
import { useAuthSession } from "@/hooks/useAuthSession"

const CalendarPage = () => {
    const { session, userRole } = useAuthSession()

    if (!session?.user?.email || !userRole) {
        return null
    }

    return (
        <div style={{ height: '100%' }}>
            <CalendarWrapper
                userRole={userRole}
                userEmail={session.user.email}
            />
        </div>
    )
}

export default CalendarPage