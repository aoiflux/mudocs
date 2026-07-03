---
title: "Functions"
date: 2021-03-29T01:03:00+05:30
draft: false
weight: 8
---

[Mutant](https://github.com/aoiflux/mutant) supports user defined functions.
Let's see them in action in below examples:

###### Example 1

```js
let sum = fn(n1, n2) {
    return n1 + n2;
};

sum(10, 20);
```

###### Example 2

```js
let minus = fn(n1, n2) {
    putln("In minus function");
    putln(n1 - n2);
}

minus(20, 10);
```
