// This file has no lint violations
function greetUser(name) {
  const greeting = 'Hello, ' + name + '!';
  return greeting;
}

function calculateSum(a, b) {
  const result = a + b;
  return result;
}

// Using the functions to avoid unused variable warnings
const userName = 'World';
const userGreeting = greetUser(userName);
const sum = calculateSum(5, 10);

// Export to make variables used
export { greetUser, calculateSum, userGreeting, sum }; 