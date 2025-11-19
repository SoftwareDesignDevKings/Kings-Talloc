"use client";

import React, { useState, useEffect } from "react";
import BaseModal from "./BaseModal";

/**
 * RecurringUpdateModal - Confirms updates to recurring events (drag/drop, resize)
 */
const RecurringUpdateModal = ({ show, onHide, onConfirm }) => {
	const [updateOption, setUpdateOption] = useState("this"); // 'this' | 'thisAndFuture'

	// Reset updateOption when modal opens
	useEffect(() => {
		if (show) {
			setUpdateOption("this");
		}
	}, [show]);

	const handleConfirm = () => {
		onConfirm(updateOption);
	};

	return (
		<BaseModal
			show={show}
			onHide={onHide}
			title="Update Recurring Event"
			size="md"
			customFooter={
				<>
					<button type="button" className="btn btn-secondary" onClick={onHide}>
						Cancel
					</button>
					<button type="button" className="btn btn-primary" onClick={handleConfirm}>
						Update
					</button>
				</>
			}
		>
			<p className="mb-3">This is a recurring event. What would you like to update?</p>
			<div className="form-check mb-2">
				<input
					className="form-check-input"
					type="radio"
					name="updateOption"
					id="updateThis"
					value="this"
					checked={updateOption === "this"}
					onChange={(e) => setUpdateOption(e.target.value)}
				/>
				<label className="form-check-label" htmlFor="updateThis">
					Only this occurrence
				</label>
			</div>
			<div className="form-check">
				<input
					className="form-check-input"
					type="radio"
					name="updateOption"
					id="updateThisAndFuture"
					value="thisAndFuture"
					checked={updateOption === "thisAndFuture"}
					onChange={(e) => setUpdateOption(e.target.value)}
				/>
				<label className="form-check-label" htmlFor="updateThisAndFuture">
					This and all future occurrences
				</label>
			</div>
		</BaseModal>
	);
};

export default RecurringUpdateModal;
