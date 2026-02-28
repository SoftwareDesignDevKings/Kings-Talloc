import { CalendarUIContextProvider } from "@/contexts/CalendarUIContext";
import CalendarContent from "./CalendarContent";

const CalendarWrapper = () => {
    return (
        <div className="h-100 w-100">
            <CalendarUIContextProvider>
                <CalendarContent />
            </CalendarUIContextProvider>
        </div>
    );
};

export default CalendarWrapper;