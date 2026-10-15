import { schedulingMutation } from './schedulingClient';
export const approveStudentRequest = (requestId, _firestore, changes = {}) => schedulingMutation({ action: 'approve', collectionName: 'studentEventRequests', id: requestId, data: changes });
export const resolveStudentRequest = (requestId, action) => schedulingMutation({ action: action === 'delete' ? 'delete' : 'deny', collectionName: 'studentEventRequests', id: requestId });
