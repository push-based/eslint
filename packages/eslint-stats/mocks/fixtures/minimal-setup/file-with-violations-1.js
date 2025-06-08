// This file has some lint violations
const unusedVariable = 'not used'; // 1 error: no-unused-vars

function testFunction() {
  console.log('This will trigger a warning'); // 1 warning: no-console
  return 'hello world';
}

testFunction(); // Use the function to avoid unused error 