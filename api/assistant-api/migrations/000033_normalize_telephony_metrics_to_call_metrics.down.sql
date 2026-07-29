UPDATE public.assistant_conversation_metrics
SET name = 'telephony_duration'
WHERE name = 'call.duration_ms';

UPDATE public.assistant_conversation_metrics
SET name = 'telephony.status'
WHERE name = 'call.status';

UPDATE public.assistant_conversation_metrics
SET name = 'telephony.price'
WHERE name = 'call.price';

UPDATE public.assistant_conversation_metrics
SET name = 'transfer.bridge_duration_ms'
WHERE name = 'call.transfer.bridge_duration_ms';

UPDATE public.assistant_conversation_message_metrics
SET name = 'telephony_duration'
WHERE name = 'call.duration_ms';

UPDATE public.assistant_conversation_message_metrics
SET name = 'telephony.status'
WHERE name = 'call.status';

UPDATE public.assistant_conversation_message_metrics
SET name = 'telephony.price'
WHERE name = 'call.price';

UPDATE public.assistant_conversation_message_metrics
SET name = 'transfer.bridge_duration_ms'
WHERE name = 'call.transfer.bridge_duration_ms';

UPDATE public.assistant_conversation_action_metrics
SET name = 'telephony_duration'
WHERE name = 'call.duration_ms';

UPDATE public.assistant_conversation_action_metrics
SET name = 'telephony.status'
WHERE name = 'call.status';

UPDATE public.assistant_conversation_action_metrics
SET name = 'telephony.price'
WHERE name = 'call.price';

UPDATE public.assistant_conversation_action_metrics
SET name = 'transfer.bridge_duration_ms'
WHERE name = 'call.transfer.bridge_duration_ms';

UPDATE public.assistant_conversation_metadata
SET key = 'telephony.status'
WHERE key = 'call.status';

UPDATE public.assistant_conversation_message_metadata
SET key = 'telephony.status'
WHERE key = 'call.status';
