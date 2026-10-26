let paused = false;

export function setLlmPaused(value: boolean): void {
  paused = value;
}

export function llmPaused(): boolean {
  return paused;
}

export function resetPause(): void {
  paused = false;
}
