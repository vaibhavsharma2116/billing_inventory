
const test1 = "106.06299.09";
const test2 = "45.9216.53";
const test3 = "45.9255.1";

let fixed1 = test1.replace(/(\d+\.\d{2})(\d+\.\d{1,2})/g, '$1 $2');
let fixed2 = test2.replace(/(\d+\.\d{2})(\d+\.\d{1,2})/g, '$1 $2');
let fixed3 = test3.replace(/(\d+\.\d{2})(\d+\.\d{1,2})/g, '$1 $2');

console.log('Original:', test1);
console.log('Fixed:', fixed1);
console.log('Original:', test2);
console.log('Fixed:', fixed2);
console.log('Original:', test3);
console.log('Fixed:', fixed3);
