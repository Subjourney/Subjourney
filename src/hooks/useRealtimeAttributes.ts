/**
 * Supabase Realtime subscriptions for attributes and step attribute instances
 */
import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store';
import { attributesApi } from '../api';

export function useRealtimeAttributes() {
  useEffect(() => {
    const store = useAppStore.getState();

    // Step attribute instances
    const stepAttrChannel = supabase
      .channel('realtime:step_attributes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'step_attributes' },
        async (payload) => {
          const { eventType, new: rowNew, old: rowOld } = payload as {
            eventType: 'INSERT' | 'UPDATE' | 'DELETE';
            new?: {
              id: string;
              step_id: string;
              attribute_definition_id: string;
              sequence_order: number;
            };
            old?: {
              id: string;
              step_id: string;
              attribute_definition_id: string;
              sequence_order: number;
            };
          };

          const getState = useAppStore.getState;
          const setState = useAppStore.setState;

          if (eventType === 'INSERT' && rowNew) {
            const sid = String(rowNew.step_id);
            const attrId = String(rowNew.attribute_definition_id);
            // try local cache first
            let attr = getState().getAttributeById(attrId);
            if (!attr) {
              try {
                // Fallback: fetch single attribute
                attr = await attributesApi.getAttribute(attrId);
                // merge into list if not present
                if (!getState().getAttributeById(attr.id)) {
                  setState({ attributes: [...getState().attributes, attr] });
                }
              } catch (e) {
                console.warn('Failed to fetch attribute for realtime insert', e);
                return;
              }
            }
            const current = getState().stepAttributes[sid] || [];
            // idempotent merge
            if (!current.find((a) => a.id === attr!.id)) {
              setState({
                stepAttributes: {
                  ...getState().stepAttributes,
                  [sid]: [...current, attr!],
                },
              });
            }
          }

          if (eventType === 'DELETE' && rowOld) {
            const sid = String(rowOld.step_id);
            const attrId = String(rowOld.attribute_definition_id);
            const current = getState().stepAttributes[sid] || [];
            const next = current.filter((a) => a.id !== attrId);
            setState({
              stepAttributes: {
                ...getState().stepAttributes,
                [sid]: next,
              },
            });
          }

          if (eventType === 'UPDATE' && rowNew) {
            // Sequence order change - optionally handle by refetching order when endpoint exists
          }
        }
      )
      .subscribe();

    // Attribute definitions (INSERT)
    const attrDefsChannel = supabase
      .channel('realtime:attributes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'attributes' },
        (payload) => {
          const { new: rowNew } = payload as { new?: any };
          if (!rowNew) return;
          const exists = store.getAttributeById(rowNew.id);
          if (!exists) {
            useAppStore.setState((s) => ({ attributes: [...s.attributes, rowNew] }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(stepAttrChannel);
      supabase.removeChannel(attrDefsChannel);
    };
  }, []);
}


