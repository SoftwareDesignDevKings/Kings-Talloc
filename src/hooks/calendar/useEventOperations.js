import {
	updateEventInFirestore,
	createEventInFirestore,
	deleteEventFromFirestore,
	addEventException,
	setRecurringUntilDate,
	removeEventFromQueue,
} from "@/firestore/firebaseOperations";
import { updateTeamsMeeting, deleteTeamsMeeting } from "@/utils/msTeams";
import useAlert from "../useAlert";

/**
 * Hook for handling event CRUD operations and drag/drop
 * Used by: CalendarWrapper, EventForm, StudentEventForm
 */
export const useEventOperations = (eventsData, userRole, userEmail) => {
	const { setAlertMessage, setAlertType } = useAlert();

	/**
	 * Determines event type and collection name
	 */
	const getEventType = (event) => {
		const isAvailability = !!event.tutor;
		const isStudentRequest = !!event.isStudentRequest;

		let collectionName = "events";
		if (isAvailability) {
			collectionName = "tutorAvailabilities";
		} else if (isStudentRequest) {
			collectionName = "studentEventRequests";
		}

		return { isAvailability, isStudentRequest, collectionName };
	};

	/**
	 * Updates event in appropriate state collection
	 */
	const updateEventState = (eventId, updatedEvent, isAvailability, isStudentRequest) => {
		if (isAvailability) {
			const updatedAvailabilities = [];
			for (const avail of eventsData.availabilities) {
				if (avail.id === eventId) {
					updatedAvailabilities.push(updatedEvent);
				} else {
					updatedAvailabilities.push(avail);
				}
			}
			eventsData.setAvailabilities(updatedAvailabilities);
		} else if (isStudentRequest) {
			const updatedRequests = [];
			for (const req of eventsData.studentRequests) {
				if (req.id === eventId) {
					updatedRequests.push(updatedEvent);
				} else {
					updatedRequests.push(req);
				}
			}
			eventsData.setStudentRequests(updatedRequests);
		} else {
			const updatedEvents = [];
			for (const evt of eventsData.allEvents) {
				if (evt.id === eventId) {
					updatedEvents.push(updatedEvent);
				} else {
					updatedEvents.push(evt);
				}
			}
			eventsData.setAllEvents(updatedEvents);
		}
	};

	/**
	 * Reverts state changes on error
	 */
	const revertState = (previousEvents, previousAvailabilities, previousStudentRequests, isAvailability, isStudentRequest) => {
		if (isAvailability) {
			eventsData.setAvailabilities(previousAvailabilities);
		} else if (isStudentRequest) {
			eventsData.setStudentRequests(previousStudentRequests);
		} else {
			eventsData.setAllEvents(previousEvents);
		}
	};

	/**
	 * Updates Teams meeting with event details
	 */
	const updateTeamsMeetingIfExists = async (event, start, end, isAvailability, isStudentRequest) => {
		if (!event.teamsEventId || isAvailability || isStudentRequest) {
			return;
		}

		const subject = event.title;
		const description = event.description || "";
		const startTime = new Date(start).toISOString();
		const endTime = new Date(end).toISOString();

		const attendees = [];
		const students = event.students || [];
		const staff = event.staff || [];

		for (const participant of [...students, ...staff]) {
			attendees.push(participant.value || participant);
		}

		try {
			await updateTeamsMeeting(event.teamsEventId, subject, description, startTime, endTime, attendees);
			setAlertType("success");
			setAlertMessage("Teams meeting updated successfully");
		} catch (error) {
			console.error("Failed to update Teams meeting:", error);
			setAlertType("error");
			setAlertMessage(`Failed to update Teams meeting: ${error.message}`);
		}
	};

	const handleEventDrop = async ({ event, start, end }) => {
		const { isAvailability, isStudentRequest, collectionName } = getEventType(event);

		// Students can only drag their own student requests
		if (userRole === "student") {
			if (!isStudentRequest) return;

			const students = event.students || [];
			let isOwnRequest = false;

			for (const student of students) {
				const studentEmail = student.value || student;
				if (studentEmail === userEmail) {
					isOwnRequest = true;
					break;
				}
			}

			if (!isOwnRequest) return;
		}

		// Tutors can only drag their own availabilities
		if (userRole === "tutor" && !isAvailability) return;

		const duration = event.end - event.start;
		const updatedEnd = new Date(start.getTime() + duration);
		const updatedEvent = { ...event, start, end: updatedEnd };

		// Store previous state for rollback
		const previousEvents = [...eventsData.allEvents];
		const previousAvailabilities = [...eventsData.availabilities];
		const previousStudentRequests = [...eventsData.studentRequests];

		// Optimistically update UI
		updateEventState(event.id, updatedEvent, isAvailability, isStudentRequest);

		try {
			await updateEventInFirestore(
				event.id,
				{
					start: new Date(start),
					end: updatedEnd,
				},
				collectionName
			);

			await updateTeamsMeetingIfExists(event, start, updatedEnd, isAvailability, isStudentRequest);
		} catch (error) {
			console.error("Failed to update event:", error);
			revertState(previousEvents, previousAvailabilities, previousStudentRequests, isAvailability, isStudentRequest);
		}
	};

	const handleEventResize = async ({ event, start, end }) => {
		const { isAvailability, isStudentRequest, collectionName } = getEventType(event);

		// Students can only resize their own student requests
		if (userRole === "student") {
			if (!isStudentRequest) return;

			const students = event.students || [];
			let isOwnRequest = false;

			for (const student of students) {
				const studentEmail = student.value || student;
				if (studentEmail === userEmail) {
					isOwnRequest = true;
					break;
				}
			}

			if (!isOwnRequest) return;
		}

		// Tutors can only resize their own availabilities
		if (userRole === "tutor" && !isAvailability) {
			return;
		}

		const updatedEvent = { ...event, start, end };

		// Store previous state for rollback
		const previousEvents = [...eventsData.allEvents];
		const previousAvailabilities = [...eventsData.availabilities];
		const previousStudentRequests = [...eventsData.studentRequests];

		// Optimistically update UI
		updateEventState(event.id, updatedEvent, isAvailability, isStudentRequest);

		try {
			await updateEventInFirestore(
				event.id,
				{
					start: new Date(start),
					end: new Date(end),
				},
				collectionName
			);

			await updateTeamsMeetingIfExists(event, start, end, isAvailability, isStudentRequest);
		} catch (error) {
			console.error("Failed to update event:", error);
			revertState(previousEvents, previousAvailabilities, previousStudentRequests, isAvailability, isStudentRequest);
		}
	};

	const handleDeleteEvent = async (eventToEdit, modals, deleteOption = "this") => {
		if (!eventToEdit || !eventToEdit.id) {
			modals.setShowTeacherModal(false);
			modals.setShowStudentModal(false);
			modals.setShowAvailabilityModal(false);
			return;
		}

		const { isAvailability, isStudentRequest, collectionName } = getEventType(eventToEdit);
		const recurringEventId = eventToEdit.recurringEventId;
		const hasRecurring = !!eventToEdit.recurring;

		try {
			// Case 1: Deleting original recurring event - delete all instances
			if (hasRecurring && deleteOption === "all") {
				console.log("[handleDeleteEvent] Deleting recurring event:", eventToEdit.id);

				await deleteEventFromFirestore(eventToEdit.id, collectionName);
				await removeEventFromQueue(eventToEdit.id);

				// Remove original and all expanded instances
				const newEvents = [];
				for (const event of eventsData.allEvents) {
					if (event.id !== eventToEdit.id && event.recurringEventId !== eventToEdit.id) {
						newEvents.push(event);
					}
				}

				console.log("[handleDeleteEvent] Updating state, new count:", newEvents.length);
				eventsData.setAllEvents(newEvents);
			}
			// Case 2: Deleting this and all future occurrences - set until date
			else if (recurringEventId && deleteOption === "thisAndFuture") {
				const untilDate = new Date(eventToEdit.start);
				untilDate.setDate(untilDate.getDate() - 1);

				await setRecurringUntilDate(recurringEventId, untilDate, collectionName);

				// Remove future instances
				const filteredEvents = [];
				for (const event of eventsData.allEvents) {
					// Keep non-recurring events
					if (event.recurringEventId !== recurringEventId && event.id !== recurringEventId) {
						filteredEvents.push(event);
						continue;
					}

					// Keep original event (with updated until date)
					if (event.id === recurringEventId) {
						filteredEvents.push(event);
						continue;
					}

					// Remove instances from this occurrence onwards
					if (event.recurringEventId === recurringEventId && event.occurrenceIndex >= eventToEdit.occurrenceIndex) {
						continue;
					}

					filteredEvents.push(event);
				}

				eventsData.setAllEvents(filteredEvents);
			}
			// Case 3: Deleting a single recurring instance - add to exceptions
			else if (recurringEventId) {
				await addEventException(recurringEventId, eventToEdit.occurrenceIndex, collectionName);

				// Remove this instance
				const filteredEvents = [];
				for (const event of eventsData.allEvents) {
					if (event.id !== eventToEdit.id) {
						filteredEvents.push(event);
					}
				}
				eventsData.setAllEvents(filteredEvents);
			}
			// Case 4: Deleting a normal non-recurring event
			else {
				await deleteEventFromFirestore(eventToEdit.id, collectionName);

				// Delete Teams meeting if it exists
				if (eventToEdit.teamsEventId && !isAvailability && !isStudentRequest) {
					try {
						await deleteTeamsMeeting(eventToEdit.teamsEventId);
						setAlertType("success");
						setAlertMessage("Teams meeting deleted successfully");
					} catch (error) {
						console.error("Failed to delete Teams meeting:", error);
						setAlertType("error");
						setAlertMessage(`Failed to delete Teams meeting: ${error.message}`);
					}
				}

				if (isAvailability) {
					const filteredAvailabilities = [];
					for (const availability of eventsData.availabilities) {
						if (availability.id !== eventToEdit.id) {
							filteredAvailabilities.push(availability);
						}
					}
					eventsData.setAvailabilities(filteredAvailabilities);
				} else if (isStudentRequest) {
					const filteredRequests = [];
					for (const request of eventsData.studentRequests) {
						if (request.id !== eventToEdit.id) {
							filteredRequests.push(request);
						}
					}
					eventsData.setStudentRequests(filteredRequests);
				} else {
					const filteredEvents = [];
					for (const event of eventsData.allEvents) {
						if (event.id !== eventToEdit.id) {
							filteredEvents.push(event);
						}
					}
					eventsData.setAllEvents(filteredEvents);
				}
			}

			await removeEventFromQueue(eventToEdit.id);
		} catch (error) {
			console.error("Failed to delete event:", error);
		}

		modals.setShowTeacherModal(false);
		modals.setShowStudentModal(false);
		modals.setShowAvailabilityModal(false);
	};

	const handleConfirmation = async (event, confirmed) => {
		if (userRole !== "student" || event.minStudents <= 0) {
			return;
		}

		const existingResponses = event.studentResponses || [];
		const updatedStudentResponses = [];

		// Filter out existing response from this user
		for (const response of existingResponses) {
			if (response.email !== userEmail) {
				updatedStudentResponses.push(response);
			}
		}

		// Add new response
		updatedStudentResponses.push({ email: userEmail, response: confirmed });

		const updatedEvent = { ...event, studentResponses: updatedStudentResponses };

		try {
			await updateEventInFirestore(event.id, {
				studentResponses: updatedStudentResponses,
			});

			const updatedEvents = [];
			for (const evt of eventsData.allEvents) {
				if (evt.id === event.id) {
					updatedEvents.push(updatedEvent);
				} else {
					updatedEvents.push(evt);
				}
			}
			eventsData.setAllEvents(updatedEvents);
		} catch (error) {
			console.error("Failed to update student response:", error);
		}
	};

	return {
		handleEventDrop,
		handleEventResize,
		handleDeleteEvent,
		handleConfirmation,
	};
};
