DELETE FROM public.assistant_conversation_metrics old_metric
USING public.assistant_conversation_metrics new_metric
WHERE old_metric.assistant_conversation_id = new_metric.assistant_conversation_id
  AND old_metric.name = 'telephony_duration'
  AND new_metric.name = 'call.duration_ms';

DELETE FROM public.assistant_conversation_metrics old_metric
USING public.assistant_conversation_metrics new_metric
WHERE old_metric.assistant_conversation_id = new_metric.assistant_conversation_id
  AND old_metric.name = 'telephony.status'
  AND new_metric.name = 'call.status';

DELETE FROM public.assistant_conversation_metrics old_metric
USING public.assistant_conversation_metrics new_metric
WHERE old_metric.assistant_conversation_id = new_metric.assistant_conversation_id
  AND old_metric.name = 'telephony.price'
  AND new_metric.name = 'call.price';

DELETE FROM public.assistant_conversation_metrics old_metric
USING public.assistant_conversation_metrics new_metric
WHERE old_metric.assistant_conversation_id = new_metric.assistant_conversation_id
  AND old_metric.name = 'transfer.bridge_duration_ms'
  AND new_metric.name = 'call.transfer.bridge_duration_ms';

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

DELETE FROM public.assistant_conversation_message_metrics old_metric
USING public.assistant_conversation_message_metrics new_metric
WHERE old_metric.assistant_conversation_message_id = new_metric.assistant_conversation_message_id
  AND old_metric.name = 'telephony_duration'
  AND new_metric.name = 'call.duration_ms';

DELETE FROM public.assistant_conversation_message_metrics old_metric
USING public.assistant_conversation_message_metrics new_metric
WHERE old_metric.assistant_conversation_message_id = new_metric.assistant_conversation_message_id
  AND old_metric.name = 'telephony.status'
  AND new_metric.name = 'call.status';

DELETE FROM public.assistant_conversation_message_metrics old_metric
USING public.assistant_conversation_message_metrics new_metric
WHERE old_metric.assistant_conversation_message_id = new_metric.assistant_conversation_message_id
  AND old_metric.name = 'telephony.price'
  AND new_metric.name = 'call.price';

DELETE FROM public.assistant_conversation_message_metrics old_metric
USING public.assistant_conversation_message_metrics new_metric
WHERE old_metric.assistant_conversation_message_id = new_metric.assistant_conversation_message_id
  AND old_metric.name = 'transfer.bridge_duration_ms'
  AND new_metric.name = 'call.transfer.bridge_duration_ms';

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

DELETE FROM public.assistant_conversation_action_metrics old_metric
USING public.assistant_conversation_action_metrics new_metric
WHERE old_metric.assistant_conversation_action_id = new_metric.assistant_conversation_action_id
  AND old_metric.name = 'telephony_duration'
  AND new_metric.name = 'call.duration_ms';

DELETE FROM public.assistant_conversation_action_metrics old_metric
USING public.assistant_conversation_action_metrics new_metric
WHERE old_metric.assistant_conversation_action_id = new_metric.assistant_conversation_action_id
  AND old_metric.name = 'telephony.status'
  AND new_metric.name = 'call.status';

DELETE FROM public.assistant_conversation_action_metrics old_metric
USING public.assistant_conversation_action_metrics new_metric
WHERE old_metric.assistant_conversation_action_id = new_metric.assistant_conversation_action_id
  AND old_metric.name = 'telephony.price'
  AND new_metric.name = 'call.price';

DELETE FROM public.assistant_conversation_action_metrics old_metric
USING public.assistant_conversation_action_metrics new_metric
WHERE old_metric.assistant_conversation_action_id = new_metric.assistant_conversation_action_id
  AND old_metric.name = 'transfer.bridge_duration_ms'
  AND new_metric.name = 'call.transfer.bridge_duration_ms';

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

DELETE FROM public.assistant_conversation_metadata old_metadata
USING public.assistant_conversation_metadata new_metadata
WHERE old_metadata.assistant_conversation_id = new_metadata.assistant_conversation_id
  AND old_metadata.key = 'telephony.status'
  AND new_metadata.key = 'call.status';

UPDATE public.assistant_conversation_metadata
SET key = 'call.status'
WHERE key = 'telephony.status';

DELETE FROM public.assistant_conversation_message_metadata old_metadata
USING public.assistant_conversation_message_metadata new_metadata
WHERE old_metadata.assistant_conversation_message_id = new_metadata.assistant_conversation_message_id
  AND old_metadata.key = 'telephony.status'
  AND new_metadata.key = 'call.status';

UPDATE public.assistant_conversation_message_metadata
SET key = 'call.status'
WHERE key = 'telephony.status';
