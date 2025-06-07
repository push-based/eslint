// TypeScript file with lint violations
interface UnusedInterface {
  name: string;
  value: number;
}

const unusedConst: string = 'not used anywhere';
let unusedNumber: number = 123;

function violationFunction(param: string): void {
  console.log('Console usage warning');
  const localVar = 'unused local variable';

  // Wrong quotes and missing semicolon
  const wrongQuotes = 'should use single quotes';
}

// Second file with lint violations
const anotherUnused = 'unused var'; // 1 error: no-unused-vars
let missingQuotes = 'should be single'; // 1 error: quotes

function warningFunction() {
  console.log('Another console warning'); // 1 warning: no-console
  return 'done';
}

warningFunction(); // Use function to avoid unused error
