/**
 * Logger genérico de erros (substitui o handler antigo do Firestore).
 */
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleDatabaseError(error: unknown, op: OperationType, path: string | null) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[db] ${op} failed at ${path}:`, message);
  throw error;
}

// Aliases legados para compatibilidade
export const handleFirestoreError = handleDatabaseError;
