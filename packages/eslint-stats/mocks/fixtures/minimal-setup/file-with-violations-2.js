// Second file with lint violations
const anotherUnused = 'unused var'; // 1 error: no-unused-vars
let missingQuotes = "should be single"; // 1 error: quotes (but used, so no unused error)

function warningFunction() {
  console.log('Another console warning'); // 1 warning: no-console  
  return missingQuotes; // Use the variable
}

warningFunction(); // Use function to avoid unused error 