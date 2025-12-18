import { CalendarDataProvider } from "@/providers/CalendarDataProvider";
import CalendarContent from "./CalendarContent";

const CalendarWrapper = () => {
    return (
        <div className="h-100 w-100">
            <CalendarDataProvider>
                 {/* <div className="flex-grow-1"> */}
                    <CalendarContent />
                {/* </div> */}
            </CalendarDataProvider>
        </div>
    );
};

export default CalendarWrapper;