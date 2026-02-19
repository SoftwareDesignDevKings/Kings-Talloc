import { CalendarUIProvider } from "@/providers/CalendarUIProvider";
import CalendarContent from "./CalendarContent";

const CalendarWrapper = () => {
    return (
        <div className="h-100 w-100">
            <CalendarUIProvider>
                <CalendarContent />
            </CalendarUIProvider>
        </div>
    );
};

export default CalendarWrapper;