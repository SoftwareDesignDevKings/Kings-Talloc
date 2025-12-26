import { CalendarDataProvider } from "@/providers/CalendarDataProvider";
import { CalendarUIProvider } from "@/providers/CalendarUIProvider";
import CalendarContent from "./CalendarContent";

const CalendarWrapper = () => {
    return (
        <div className="h-100 w-100">
            <CalendarDataProvider>
                <CalendarUIProvider>
                    <CalendarContent />
                </CalendarUIProvider>
            </CalendarDataProvider>
        </div>
    );
};

export default CalendarWrapper;