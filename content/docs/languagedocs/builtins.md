---
title: "Built-Ins"
date: 2021-03-29T01:03:16+05:30
draft: false
weight: 9
---

[Mutant](https://github.com/aoiflux/mutant) has some built-in functions. Let's
see them in action in below examples:

###### Example 1

```js
putf("Hi");
```

###### Example 2

```js
putln("Hi");
putln("Bye");
```

###### Example 3

```js
let name = gets();
putf(name);
```

###### Example 4

```js
let array = [1, 2, 3];
putln(array);

let array = push(array, 4);
putln(array);
```

###### Example 5

```js
let array = [1, 2, 3];
putln(len(array));
```

###### Example 6

```js
let array = [1, 2, 3];
putln(first(array));
```

###### Example 7

```js
let array = [1, 2, 3];
putln(last(array));
```

###### Example 8

```js
let array = [1, 2, 3];
putln(rest(array));
```
