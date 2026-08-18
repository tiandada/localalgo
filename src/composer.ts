export interface LineState {
  value: string;
  cursor: number;
}

export function deleteBackward(value: string, cursor: number): LineState {
  const characters = Array.from(value);
  if (cursor <= 0) return { value, cursor: 0 };
  characters.splice(cursor - 1, 1);
  return { value: characters.join(''), cursor: cursor - 1 };
}

export function deleteForward(value: string, cursor: number): LineState {
  const characters = Array.from(value);
  if (cursor >= characters.length) return { value, cursor: characters.length };
  characters.splice(cursor, 1);
  return { value: characters.join(''), cursor };
}
