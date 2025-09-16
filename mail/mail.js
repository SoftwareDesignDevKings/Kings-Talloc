/**
 * Wrapper func - creates a MS Teams meeting via MS Power Automate.
 * - Workaround from Azure App registration blocked by TKS ICT. 
 * - Workflow: App -> email -> PowerAuto Email Trigger -> Parse Email -> Create Meeting)
 * 
 */
const createTeamsMeeting = async (subject, description, startTime, endTime, attendeesEmailArr) => {
	try {
		const res = await fetch("/api/send-event", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				subject,
				description,
				start: startTime,
				end: endTime,
				attendees: attendeesEmailArr,
			}),
		});

		if (!res.ok) {
			const errText = await res.text();
			throw new Error(`Failed to create event: ${res.status} ${errText}`);
		}
	} catch (error) {
		console.error("Error creating Teams meeting:", error);
		throw error;
	}
};

const updateTeamsMeeting = () => {
	
}