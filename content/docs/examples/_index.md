---
title: "Examples"
date: 2021-03-28T11:06:57+05:30
draft: false
weight: 3
summary: "Runnable Mutant examples for getting started quickly."
---

1. Add two numbers:

```js
let sum = fn(n1, n2) {
    return n1 + n2;
};

putln("Lets add two numbers: ");

putf("Enter first number: ");
let num1 = gets();

putf("Enter second number: ");
let num2 = gets();

sum(num1, num2);
```

2. Print Fibonacci Series

```js
let fibonacci = fn(x) {
    if (x == 0) {
        return 0;
    } else {
        if (x == 1) {
            return 1;
        } else {
            fibonacci(x - 1) + fibonacci(x - 2);
        }
    }
};

fibonacci(10);
```
