UPDATE public.assistant_conversation_metrics
SET name = 'call.duration_ms'
WHERE name = 'telephony_duration';

UPDATE public.assistant_conversation_metrics
SET name = 'call.status'
WHERE name = 'telephony.status';

UPDATE public.assistant_conversation_metrics
SET name = 'call.price'
WHERE name = 'telephony.price';

UPDATE public.assistant_conversation_metrics
SET name = 'call.transfer.bridge_duration_ms'
WHERE name = 'transfer.bridge_duration_ms';

UPDATE public.assistant_conversation_message_metrics
SET name = 'call.duration_ms'
WHERE name = 'telephony_duration';

UPDATE public.assistant_conversation_message_metrics
SET name = 'call.status'
WHERE name = 'telephony.status';

UPDATE public.assistant_conversation_message_metrics
SET name = 'call.price'
WHERE name = 'telephony.price';

UPDATE public.assistant_conversation_message_metrics
SET name = 'call.transfer.bridge_duration_ms'
WHERE name = 'transfer.bridge_duration_ms';

UPDATE public.assistant_conversation_action_metrics
SET name = 'call.duration_ms'
WHERE name = 'telephony_duration';

UPDATE public.assistant_conversation_action_metrics
SET name = 'call.status'
WHERE name = 'telephony.status';

UPDATE public.assistant_conversation_action_metrics
SET name = 'call.price'
WHERE name = 'telephony.price';

UPDATE public.assistant_conversation_action_metrics
SET name = 'call.transfer.bridge_duration_ms'
WHERE name = 'transfer.bridge_duration_ms';

UPDATE public.assistant_conversation_metadata
SET key = 'call.status'
WHERE key = 'telephony.status';

UPDATE public.assistant_conversation_message_metadata
SET key = 'call.status'
WHERE key = 'telephony.status';
