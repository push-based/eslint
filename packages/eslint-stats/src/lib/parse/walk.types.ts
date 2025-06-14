export interface StopOnFalseWalkOptions {
  // Stop walking if visitor returns false
  // Good for:
  // - Early termination: Stop when you find what you're looking for
  // - Conditional processing: Stop on error conditions
  stopOnFalse?: boolean;
}
