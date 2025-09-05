import { trimMessageHistoryEstimated } from '@repo/ai/models';
import { createTask } from '@repo/orchestrator';
import { ChatMode } from '@repo/shared/config';
import { WorkflowContextSchema, WorkflowEventSchema } from '../flow';
import { handleError, sendEvents } from '../utils';
export const modeRoutingTask = createTask<WorkflowEventSchema, WorkflowContextSchema>({
    name: 'router',
    execute: async ({ events, context, redirectTo }) => {
        const mode = context?.get('mode') || ChatMode.GPT_4o;
        const { updateStatus } = sendEvents(events);

        const messageHistory = context?.get('messages') || [];
        const trimmedMessageHistory = trimMessageHistoryEstimated(messageHistory, mode);
        context?.set('messages', trimmedMessageHistory.trimmedMessages ?? []);

        if (!trimmedMessageHistory?.trimmedMessages) {
            throw new Error('Maximum message history reached');
        }

        updateStatus('PENDING');

        if (mode === ChatMode.GPT_4o) {
            redirectTo('refine-query');
        } else if (mode === ChatMode.GPT_4o_Mini) {
            redirectTo('pro-search');
        } else {
            redirectTo('completion');
        }
    },
    onError: handleError,
});
