function* foo() {
  yield 1;
}

const generator = foo();
console.log(generator.next()); // { value: 1, done: false }
console.log(generator.next()); // { value: undefined, done: true }

for (const value of foo()) {
  console.log(value);
}
