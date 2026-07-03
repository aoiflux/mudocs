---
title: "Control Flow"
date: 2021-03-29T01:02:41+05:30
draft: false
weight: 6
---

[Mutant](https://github.com/aoiflux/mutant) supports simple conditions and
branching through if/else statements. Let's see them in action in below
examples:

###### Example 1

```js
if (1 == 1) {
    putf("yes");
}
```

###### Example 2

```js
if (1 == 2) {
    putf("yes");
} else {
    putf("no");
}
```

###### Example 3

```js
if (1 == 2) {
    putf("yes");
}
if (1 == 3) {
    putf("yes 3");
} else {
    putf("no");
}
```
