import { useEffect, useRef } from "react";

import * as DalService from "@/services/dal";
import { useSchemaStore } from "@/hooks/useSchemaStore";

const AUTO_SAVE_DELAY = 1000;

export function useAutoSave() {
  const schema = useSchemaStore((s) => s.schema);
  const schemaId = useSchemaStore((s) => s.schemaId);
  const schemaName = useSchemaStore((s) => s.schemaName);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      if (schemaId) DalService.saveSchema(schemaId, schemaName, schema);
    }, AUTO_SAVE_DELAY);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [schema, schemaId, schemaName]);
}
