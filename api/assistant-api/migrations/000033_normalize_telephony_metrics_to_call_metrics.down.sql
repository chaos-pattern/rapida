DELETE FROM public.assistant_conversation_metrics new_metric
USING public.assistant_conversation_metrics old_metric
WHERE new_metric.assistant_conversation_id = old_metric.assistant_conversation_id
  AND new_metric.name = 'call.duration_ms'
  AND old_metric.name = 'telephony_duration';

DELETE FROM public.assistant_conversation_metrics new_metric
USING public.assistant_conversation_metrics old_metric
WHERE new_metric.assistant_conversation_id = old_metric.assistant_conversation_id
  AND new_metric.name = 'call.status'
  AND old_metric.name = 'telephony.status';

DELETE FROM public.assistant_conversation_metrics new_metric
USING public.assistant_conversation_metrics old_metric
WHERE new_metric.assistant_conversation_id = old_metric.assistant_conversation_id
  AND new_metric.name = 'call.price'
  AND old_metric.name = 'telephony.price';

DELETE FROM public.assistant_conversation_metrics new_metric
USING public.assistant_conversation_metrics old_metric
WHERE new_metric.assistant_conversation_id = old_metric.assistant_conversation_id
  AND new_metric.name = 'call.transfer.bridge_duration_ms'
  AND old_metric.name = 'transfer.bridge_duration_ms';

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

DELETE FROM public.assistant_conversation_message_metrics new_metric
USING public.assistant_conversation_message_metrics old_metric
WHERE new_metric.assistant_conversation_message_id = old_metric.assistant_conversation_message_id
  AND new_metric.name = 'call.duration_ms'
  AND old_metric.name = 'telephony_duration';

DELETE FROM public.assistant_conversation_message_metrics new_metric
USING public.assistant_conversation_message_metrics old_metric
WHERE new_metric.assistant_conversation_message_id = old_metric.assistant_conversation_message_id
  AND new_metric.name = 'call.status'
  AND old_metric.name = 'telephony.status';

DELETE FROM public.assistant_conversation_message_metrics new_metric
USING public.assistant_conversation_message_metrics old_metric
WHERE new_metric.assistant_conversation_message_id = old_metric.assistant_conversation_message_id
  AND new_metric.name = 'call.price'
  AND old_metric.name = 'telephony.price';

DELETE FROM public.assistant_conversation_message_metrics new_metric
USING public.assistant_conversation_message_metrics old_metric
WHERE new_metric.assistant_conversation_message_id = old_metric.assistant_conversation_message_id
  AND new_metric.name = 'call.transfer.bridge_duration_ms'
  AND old_metric.name = 'transfer.bridge_duration_ms';

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

DELETE FROM public.assistant_conversation_action_metrics new_metric
USING public.assistant_conversation_action_metrics old_metric
WHERE new_metric.assistant_conversation_action_id = old_metric.assistant_conversation_action_id
  AND new_metric.name = 'call.duration_ms'
  AND old_metric.name = 'telephony_duration';

DELETE FROM public.assistant_conversation_action_metrics new_metric
USING public.assistant_conversation_action_metrics old_metric
WHERE new_metric.assistant_conversation_action_id = old_metric.assistant_conversation_action_id
  AND new_metric.name = 'call.status'
  AND old_metric.name = 'telephony.status';

DELETE FROM public.assistant_conversation_action_metrics new_metric
USING public.assistant_conversation_action_metrics old_metric
WHERE new_metric.assistant_conversation_action_id = old_metric.assistant_conversation_action_id
  AND new_metric.name = 'call.price'
  AND old_metric.name = 'telephony.price';

DELETE FROM public.assistant_conversation_action_metrics new_metric
USING public.assistant_conversation_action_metrics old_metric
WHERE new_metric.assistant_conversation_action_id = old_metric.assistant_conversation_action_id
  AND new_metric.name = 'call.transfer.bridge_duration_ms'
  AND old_metric.name = 'transfer.bridge_duration_ms';

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

DELETE FROM public.assistant_conversation_metadata new_metadata
USING public.assistant_conversation_metadata old_metadata
WHERE new_metadata.assistant_conversation_id = old_metadata.assistant_conversation_id
  AND new_metadata.key = 'call.status'
  AND old_metadata.key = 'telephony.status';

UPDATE public.assistant_conversation_metadata
SET key = 'telephony.status'
WHERE key = 'call.status';

DELETE FROM public.assistant_conversation_message_metadata new_metadata
USING public.assistant_conversation_message_metadata old_metadata
WHERE new_metadata.assistant_conversation_message_id = old_metadata.assistant_conversation_message_id
  AND new_metadata.key = 'call.status'
  AND old_metadata.key = 'telephony.status';

UPDATE public.assistant_conversation_message_metadata
SET key = 'telephony.status'
WHERE key = 'call.status';
