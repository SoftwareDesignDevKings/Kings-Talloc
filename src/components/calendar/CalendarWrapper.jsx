import { CalendarDataProvider } from "@/providers/CalendarDataProvider";
import { CalendarControlProvider } from "@/providers/CalendarControlProvider";
import CalendarContent from "./CalendarContent";

const CalendarWrapper = () => {
    return (
        <div className="h-100 w-100">
            <CalendarDataProvider>
                <CalendarControlProvider>
                    <CalendarContent />
                </CalendarControlProvider>
            </CalendarDataProvider>
        </div>
    );
};

export default CalendarWrapper;